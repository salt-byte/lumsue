import { SkinReport } from "../types";

// 开发环境：使用 Vite proxy（/api → localhost:3001）
// 生产环境：VITE_API_BASE_URL 指向 Render 后端，如 https://lumsue.onrender.com/api
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 发送面部图片到后端进行肤质分析
 * @param imageBase64 - base64 编码的 JPEG 图片（不含 data URL 前缀）
 */
export async function analyzeSkin(imageBase64: string): Promise<SkinReport> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `肤质分析请求失败（HTTP ${response.status}）`);
  }

  return response.json() as Promise<SkinReport>;
}

/**
 * 与护肤导师进行多轮对话
 * @param messages   - 对话历史
 * @param lastReport - 可选，上次肤质检测报告（用于个性化上下文）
 */
export async function mentorChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  lastReport?: SkinReport | null
): Promise<string> {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(`${API_BASE}/mentor/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages, lastReport: lastReport ?? null }),
      signal:  controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `导师对话请求失败（HTTP ${response.status}）`);
    }

    const data = await response.json();
    return data.reply || '抱歉，我现在无法回应，请稍后再试。';
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接后重试。');
    }
    throw error;
  }
}
