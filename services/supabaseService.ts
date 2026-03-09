import { createClient } from '@supabase/supabase-js';
import { SkinReport } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// 环境变量缺失时创建一个占位客户端，避免白屏崩溃
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key'
);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function getSession() {
  return supabase.auth.getSession();
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function fetchReports(userId: string): Promise<SkinReport[]> {
  const { data, error } = await supabase
    .from('skin_reports')
    .select('data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(row => row.data as SkinReport);
}

export async function saveReport(userId: string, report: SkinReport): Promise<void> {
  // imageUrl 可能很大，存 DB 前移除 base64，只保留 metadata
  const { imageUrl, ...rest } = report;
  const { error } = await supabase
    .from('skin_reports')
    .insert({ id: report.id, user_id: userId, data: rest });

  if (error) throw error;
}
