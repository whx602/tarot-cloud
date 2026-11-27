/**
 * 每日指引查询接口 GET /api/draw/today
 * 查询「今天是否已抽每日指引」，供前端在抽牌前提前提示（不产生记录）。
 */
import { requireAuth } from '../../_shared/auth.js';
import { utc8Date } from '../../_shared/time.js';
import { ok, handleOptions } from '../../_shared/response.js';

export function onRequestOptions() { return handleOptions(); }

export async function onRequestGet(context) {
  const auth = await requireAuth(context.request, context.env);
  if (auth.error) return auth.error;

  const today = utc8Date();
  const row = await context.env.DB.prepare(
    'SELECT id FROM draws WHERE user_id = ? AND draw_date = ? AND spread_id = ?'
  ).bind(auth.userId, today, 'daily').first();

  return ok({ alreadyDrawn: !!row, date: today });
}
