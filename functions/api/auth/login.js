/**
 * 登录接口 POST /api/auth/login
 * 校验用户名密码，成功下发 JWT。
 */
import bcrypt from 'bcryptjs';
import { sign } from '../../_shared/jwt.js';
import { ok, fail, handleOptions } from '../../_shared/response.js';

export function onRequestOptions() { return handleOptions(); }

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return fail('请求格式错误', 400); }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  const row = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  // 统一返回「用户名或密码错误」，避免暴露用户是否存在
  if (!row) return fail('用户名或密码错误', 401);

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return fail('用户名或密码错误', 401);

  const user = {
    id: row.id,
    username: row.username,
    currentSkin: row.current_skin,
    aiEnabled: !!row.ai_enabled,
  };
  const token = await sign({ sub: row.id, username: row.username }, env.JWT_SECRET);

  return ok({ token, user });
}
