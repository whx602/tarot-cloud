/**
 * 抽牌提交接口 POST /api/draw
 * 职责：保存一次抽牌记录；「每日指引」牌阵做每日限抽校验；可选调用 AI 解读。
 * 说明：本接口只做「记录与限抽」，抽牌随机逻辑在前端完成（前端把抽到的牌传上来）。
 */
import { requireAuth } from '../../_shared/auth.js';
import { utc8Date } from '../../_shared/time.js';
import { generateReading } from '../../_shared/ai.js';
import { ok, fail, handleOptions } from '../../_shared/response.js';

export function onRequestOptions() { return handleOptions(); }

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  let body;
  try { body = await request.json(); } catch { return fail('请求格式错误', 400); }

  const spreadId = String(body.spreadId || '');
  const spreadName = String(body.spreadName || '');
  const skinId = String(body.skinId || 'classic');
  const question = String(body.question || '');
  const cards = Array.isArray(body.cards) ? body.cards : [];

  if (!spreadId || !cards.length) return fail('缺少牌阵或抽牌数据', 400);

  // 东八区自然日（后端计算，绝不信任前端传来的时间）
  const today = utc8Date();

  // 每日限抽：仅「每日指引」牌阵每天一次（应用层先查，下方唯一索引兜底）
  if (spreadId === 'daily') {
    const exist = await env.DB.prepare(
      'SELECT id FROM draws WHERE user_id = ? AND draw_date = ? AND spread_id = ?'
    ).bind(auth.userId, today, 'daily').first();
    if (exist) return fail('今日已抽取过「每日指引」，请明天再来', 429);
  }

  // 卡片列表落库为 JSON（只存必要字段，避免存满牌义数据）
  const cardsJSON = JSON.stringify(
    cards.map((c) => ({ id: c.id, nameZh: c.nameZh, reversed: !!c.reversed }))
  );

  try {
    const info = await env.DB.prepare(
      `INSERT INTO draws (user_id, draw_date, spread_id, spread_name, skin_id, question, cards, ai_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(auth.userId, today, spreadId, spreadName, skinId, question, cardsJSON, null).run();

    const drawId = info.meta.last_row_id;

    // AI 解读（可选）：仅当用户开启 AI 时调用；失败返回 null，由前端兜底，不阻塞抽牌
    let aiText = null;
    const user = await env.DB.prepare('SELECT ai_enabled FROM users WHERE id = ?').bind(auth.userId).first();
    if (user && user.ai_enabled) {
      aiText = await generateReading(env, { cards: body.cards, question, spreadName });
      if (aiText) {
        await env.DB.prepare('UPDATE draws SET ai_text = ? WHERE id = ?').bind(aiText, drawId).run();
      }
    }

    return ok({ drawId, aiText, dailyLimit: false });
  } catch (e) {
    // 并发兜底：部分唯一索引冲突 = 同一天重复抽「每日指引」
    if (spreadId === 'daily' && /UNIQUE/i.test(String(e && e.message))) {
      return fail('今日已抽取过「每日指引」，请明天再来', 429);
    }
    throw e;
  }
}
