/**
 * 皮肤列表接口 GET /api/skins
 * 只返回皮肤元数据（id/名称/预览图地址），图片本体在静态目录 /skins/<id>/。
 * 预设皮肤无需登录即可查看（不含敏感信息）。
 */
import { ok, handleOptions } from '../../_shared/response.js';

export function onRequestOptions() { return handleOptions(); }

export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    'SELECT id, name, preview_url, sort_order FROM skins ORDER BY sort_order ASC, id ASC'
  ).all();

  const skins = (results || []).map((r) => ({
    id: r.id,
    name: r.name,
    previewUrl: r.preview_url,
  }));

  return ok({ skins });
}
