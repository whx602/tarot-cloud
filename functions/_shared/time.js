/**
 * 东八区（UTC+8）时间工具。
 * 每日限抽必须按「东八区自然日」判断，且只能在后端计算——
 * 绝不能信任前端传来的日期/时间，否则用户改设备时间即可绕过限制。
 */

/**
 * 返回某时间戳对应的东八区自然日字符串（YYYY-MM-DD）。
 * 实现：UTC 时间 +8 小时后取 ISO 日期部分。
 * @param {number} ts 毫秒时间戳，默认当前时间
 */
export function utc8Date(ts = Date.now()) {
  return new Date(ts + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
