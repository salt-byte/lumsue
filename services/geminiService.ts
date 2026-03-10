import { SkinReport } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function warmUpServer(): Promise<void> {
  try {
    await fetch(`${API_BASE}/health`, { method: 'GET' });
  } catch {}
}

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
    img.onerror = () => resolve(base64);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

export async function analyzeSkin(
  imageBase64: string,
  onPhase?: (phase: string) => void
): Promise<SkinReport> {
  const compressed = await compressImage(imageBase64);

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: compressed }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `分析请求失败（HTTP ${response.status}）`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const line = part.trim();
      if (!line || line.startsWith(':')) continue; // heartbeat
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'progress' && onPhase) onPhase(data.phase);
        if (data.type === 'done') return data.report as SkinReport;
        if (data.type === 'error') throw new Error(data.message || '分析失败');
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  throw new Error('连接意外中断，请重试');
}

export async function mentorChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  lastReport?: SkinReport | null
): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 40_000);
  try {
    const response = await fetch(`${API_BASE}/mentor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, lastReport: lastReport ?? null }),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `导师对话请求失败（HTTP ${response.status}）`);
    }
    const data = await response.json();
    return data.reply || '抱歉，我现在无法回应，请稍后再试。';
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') throw new Error('网络响应较慢，请稍后重试。');
    throw error;
  }
}
