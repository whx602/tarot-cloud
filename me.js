/**
 * 当前用户接口 /api/me
 * GET  —— 校验 token 并返回当前用户信息（前端启动时刷新用）
 * POST —— 更新用户设置：currentSkin（当前皮肤）/ aiEnabled（AI 开关）
 */
import { requireAuth } from '../_shared/auth.js';
import { ok, fail, handleOptions } from '../_shared/response.js';

export function onRequestOptions() { return handleOptions(); }

/** 查用户并转成前端需要的结构 */
async function fetchUser(db, userId) {
  const row = await db.prepare(
    'SELECT id, username, current_skin, ai_enabled FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    currentSkin: row.current_skin,
    aiEnabled: !!row.ai_enabled,
  };
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context.request, context.env);
  if (auth.error) return auth.error;

  const user = await fetchUser(context.env.DB, auth.userId);
  if (!user) return fail('用户不存在', 401);
  return ok({ user });
}

export async function onRequestPost(context) {
  const auth = await requireAuth(context.request, context.env);
  if (auth.error) return auth.error;

  let body;
  try { body = await context.request.json(); } catch { return fail('请求格式错误', 400); }

  const sets = [];
  const params = [];

  // 允许部分更新：只更新传入的字段
  if (body.currentSkin !== undefined) {
    sets.push('current_skin = ?');
    params.push(String(body.currentSkin));
  }
  if (body.aiEnabled !== undefined) {
    sets.push('ai_enabled = ?');
    params.push(body.aiEnabled ? 1 : 0);
  }

  if (sets.length) {
    params.push(auth.userId);
    await context.env.DB.prepare(
      `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...params).run();
  }

  const user = await fetchUser(context.env.DB, auth.userId);
  return ok({ user });
}
