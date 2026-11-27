/**
 * AI 解读模块 —— 调用 OpenAI 兼容接口（DeepSeek / OpenAI / Moonshot 等均可）。
 * 接口地址、模型名、API Key 全部从环境变量读取，前端绝不出现密钥。
 * 调用失败或超时返回 null（由调用方降级为兜底文案），绝不抛错导致页面卡死。
 */

const TIMEOUT_MS = 30000; // 30 秒超时

/**
 * 生成塔罗解读文本。
 * @param {object} env 运行时环境（含 AI_API_URL / AI_MODEL / AI_API_KEY）
 * @param {object} opts { cards: [{id,nameZh,reversed}], question, spreadName }
 * @returns {Promise<string|null>} 解读文本；失败/未配置返回 null
 */
export async function generateReading(env, { cards, question, spreadName }) {
  // 未配置 AI 环境变量 → 直接返回 null
  if (!env.AI_API_URL || !env.AI_API_KEY) return null;

  const cardDesc = cards
    .map((c, i) => `${i + 1}. ${c.nameZh}（${c.reversed ? '逆位' : '正位'}）`)
    .join('\n');

  const prompt = [
    '你是一位经验丰富的塔罗占卜师。请根据下面的牌阵，为求问者做一次温暖、具体、务实的中文解读。',
    `牌阵：${spreadName}`,
    `求问者的问题：${question || '未提供'}`,
    '抽到的牌（按位置顺序）：',
    cardDesc,
    '',
    '请分三部分输出：1) 整体主题  2) 各牌位含义  3) 行动建议。控制在 300 字以内，语气自然。',
  ].join('\n');

  // 超时控制：超过 30 秒自动中断
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(env.AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}
