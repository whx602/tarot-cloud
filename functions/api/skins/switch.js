/**
 * 切换皮肤接口 POST /api/skins/switch
 * 把用户表的 current_skin 更新为指定皮肤 id（需登录）。
 */
import { requireAuth } from '../../_shared/auth.js';
import { ok, fail, handleOptions } from '../../_shared/response.js';

export function onRequestOptions() { return handleOptions(); }

export async function onRequestPost(context) {
  const auth = await requireAuth(context.request, context.env);
  if (auth.error) return auth.error;

  let body;
  try { body = await context.request.json(); } catch { return fail('请求格式错误', 400); }

  const skinId = String(body.skinId || '');
  if (!skinId) return fail('缺少皮肤 id', 400);

  // 校验皮肤确实存在，避免写入脏数据
  const skin = await context.env.DB.prepare('SELECT id FROM skins WHERE id = ?').bind(skinId).first();
  if (!skin) return fail('皮肤不存在', 404);

  await context.env.DB.prepare(
    'UPDATE users SET current_skin = ? WHERE id = ?'
  ).bind(skinId, auth.userId).run();

  return ok({ skinId });
}
