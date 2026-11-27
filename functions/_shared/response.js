/**
 * 统一响应助手：CORS 头 + JSON 返回 + OPTIONS 预检。
 * CORS 使用 Access-Control-Allow-Origin: *，兼容所有 *.pages.dev 及自定义域名；
 * 因为鉴权走 Authorization 头（非 Cookie），用 * 即可，无需复杂白名单。
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/** 返回任意 JSON，带 CORS 头 */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

/** 成功响应：{ ok: true, ...payload } */
export function ok(payload = {}) {
  return json({ ok: true, ...payload });
}

/** 失败响应：{ ok: false, error } */
export function fail(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

/** OPTIONS 预检响应（浏览器跨域请求会先发一次 OPTIONS） */
export function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
