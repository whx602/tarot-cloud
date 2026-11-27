/**
 * 注册接口 POST /api/auth/register
 * 校验用户名唯一 + bcrypt 哈希入库，成功后直接下发 JWT（注册即登录）。
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

  // 基本校验：用户名 2~20 位（字母/数字/中文），密码 6~64 位
  if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{2,20}$/.test(username)) {
    return fail('用户名需 2~20 位（字母/数字/中文）', 400);
  }
  if (password.length < 6 || password.length > 64) {
    return fail('密码需 6~64 位', 400);
  }

  // 用户名唯一校验（应用层先查，数据库 UNIQUE 约束兜底）
  const exist = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (exist) return fail('该用户名已被注册', 409);

  // bcrypt 哈希（成本因子 10）
  const hash = await bcrypt.hash(password, 10);
  const info = await env.DB.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).bind(username, hash).run();

  const userId = info.meta.last_row_id;
  const user = { id: userId, username, currentSkin: 'classic', aiEnabled: false };
  const token = await sign({ sub: userId, username }, env.JWT_SECRET);

  return ok({ token, user });
}
