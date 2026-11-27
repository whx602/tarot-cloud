/**
 * 零依赖 JWT（HS256）实现 —— 基于 Web Crypto API，无需任何第三方包。
 * 仅支持 HS256（对称签名），足够本项目的账号鉴权使用。
 * 密钥从环境变量 JWT_SECRET 读取，绝不写死在代码里。
 */

const encoder = new TextEncoder();

/** Uint8Array → base64url（去掉 = 填充，+→- /→_） */
function b64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url → 字符串（还原填充后 atob 解码） */
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

/** 导入 HMAC-SHA256 密钥 */
async function importKey(secret, usage) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

/**
 * 签发 JWT。payload 内自动注入 iat（签发时间）与 exp（过期时间）。
 * @param {object} payload 业务载荷，如 { sub: userId, username }
 * @param {string} secret  签名密钥
 * @param {number} expiresInSeconds 有效期（秒），默认 7 天
 */
export async function sign(payload, secret, expiresInSeconds = 7 * 24 * 3600) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const h = b64url(encoder.encode(JSON.stringify(header)));
  const p = b64url(encoder.encode(JSON.stringify(body)));
  const key = await importKey(secret, 'sign');
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
}

/**
 * 校验 JWT。成功返回 payload，失败/过期/篡改返回 null。
 */
export async function verify(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;

    const key = await importKey(secret, 'verify');
    const sigBytes = new Uint8Array(
      b64urlDecode(s).split('').map((c) => c.charCodeAt(0))
    );
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(`${h}.${p}`));
    if (!valid) return null;

    const payload = JSON.parse(b64urlDecode(p));
    // 过期校验
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
