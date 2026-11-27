/**
 * 历史记录接口 GET /api/history
 * 返回当前用户的全部抽牌记录（时间倒序，最多 100 条）。
 */
import { requireAuth } from '../_shared/auth.js';
import { ok, handleOptions } from '../_shared/response.js';

export function onRequestOptions() { return handleOptions(); }

export async function onRequestGet(context) {
  const auth = await requireAuth(context.request, context.env);
  if (auth.error) return auth.error;

  const { results } = await context.env.DB.prepare(
    `SELECT id, draw_date, spread_id, spread_name, skin_id, question, cards, ai_text, created_at
     FROM draws
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 100`
  ).bind(auth.userId).all();

  const history = (results || []).map((r) => {
    let cards = [];
    try { cards = JSON.parse(r.cards || '[]'); } catch { cards = []; }
    return {
      id: r.id,
      drawDate: r.draw_date,
      spreadId: r.spread_id,
      spreadName: r.spread_name,
      skinId: r.skin_id,
      question: r.question,
      cards,
      aiText: r.ai_text,
      createdAt: r.created_at,
    };
  });

  return ok({ history });
}
