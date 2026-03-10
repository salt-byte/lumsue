import { SkinReport } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// 提前唤醒 Render 服务器（避免冷启动导致分析超时）
export async function warmUpServer(): Promise<void> {
  try {
    await fetch(`${API_BASE}/health`, { method: 'GET' });
  } catch {
    // 静默失败，唤醒失败不影响后续流程
  }
}

// fetch 带超时的封装
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') throw new Error('请求超时，请稍后重试');
    throw err;
  }
}

/**
 * 压缩图片到最大 1280px 宽，减少传输体积（快约 2-3 倍）
 */
async function compressImage(base64: string, maxWidth = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => resolve(base64); // 失败时用原图
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * 发送面部图片到后端进行肤质分析
 * 自动重试一次（应对 Render 冷启动 / Gemini 偶发失败）
 */
export async function analyzeSkin(imageBase64: string): Promise<SkinReport> {
  // 压缩后再发送，减少传输和 Gemini 处理时间
  const compressed = await compressImage(imageBase64);

  const request = async () => {
    const response = await fetchWithTimeout(
      `${API_BASE}/analyze`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed }),
      },
      60_000 // Flash 模型 + 压缩图片，60s 足够
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `分析请求失败（HTTP ${response.status}）`);
    }
    return response.json() as Promise<SkinReport>;
  };

  try {
    return await request();
  } catch (firstErr: any) {
    // 第一次失败后等 3s 自动重试一次
    await new Promise(r => setTimeout(r, 3000));
    try {
      return await request();
    } catch (secondErr: any) {
      throw new Error(secondErr.message || '肤质分析失败，请确保光线充足并重试');
    }
  }
}

/**
 * 与护肤导师进行多轮对话
 */
export async function mentorChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  lastReport?: SkinReport | null
): Promise<string> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/mentor/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, lastReport: lastReport ?? null }),
      },
      40_000
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `导师对话请求失败（HTTP ${response.status}）`);
    }
    const data = await response.json();
    return data.reply || '抱歉，我现在无法回应，请稍后再试。';
  } catch (error: any) {
    if (error.message?.includes('超时')) throw new Error('网络响应较慢，请稍后重试。');
    throw error;
  }
}
