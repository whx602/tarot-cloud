/**
 * 鉴权助手：从请求头解析并校验 JWT。
 */
import { verify } from './jwt.js';
import { fail } from './response.js';

/**
 * 校验请求是否已登录。
 * 成功返回 { userId, username }；失败返回 { error: Response }，handler 可直接 return auth.error。
 * @param {Request} request
 * @param {object} env  运行时环境（含 JWT_SECRET）
 */
export async function requireAuth(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return { error: fail('未登录', 401) };

  const payload = await verify(token, env.JWT_SECRET);
  if (!payload) return { error: fail('登录已过期，请重新登录', 401) };

  return { userId: payload.sub, username: payload.username };
}
