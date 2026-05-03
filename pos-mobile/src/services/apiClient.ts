/**
 * Authenticated API client for React Native
 * Attaches Supabase JWT to all requests and targets the API Gateway
 */
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config/api';

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };

  if (data?.session?.access_token) {
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
  }

  const url = `${API_BASE_URL}${path}`;
  return fetch(url, { ...options, headers });
}

/**
 * Convenience wrapper that fetches and parses JSON
 */
export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(path, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `API Error ${response.status}`);
  }
  return response.json();
}
