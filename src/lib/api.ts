const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';
const TOKEN_KEY = 'hm_admin_token';

export const tokenStore = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message); this.status = status; this.body = body;
  }
}

function messageOf(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map((x) => (x && typeof x === 'object' && 'msg' in x ? String((x as { msg: unknown }).msg) : '')).filter(Boolean).join('، ') || fallback;
    if (d && typeof d === 'object' && 'message' in d) return String((d as { message: unknown }).message);
  }
  return fallback;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export async function api<T>(method: string, path: string, opts: { query?: Query; json?: unknown; form?: Record<string, string> } = {}): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const headers: Record<string, string> = {};
  const t = tokenStore.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  let body: BodyInit | undefined;
  if (opts.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.json); }
  if (opts.form) { body = new URLSearchParams(opts.form); }
  let res: Response;
  try { res = await fetch(url, { method, headers, body }); }
  catch { throw new ApiError(0, 'ارتباط با سرور برقرار نشد'); }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (res.status === 401 && tokenStore.get()) { tokenStore.clear(); window.dispatchEvent(new Event('hm-unauthorized')); }
  if (!res.ok) throw new ApiError(res.status, messageOf(data, `خطا (${res.status})`), data);
  return data as T;
}

export const get = <T,>(p: string, query?: Query) => api<T>('GET', p, { query });
export const post = <T,>(p: string, json?: unknown, query?: Query) => api<T>('POST', p, { json, query });
export const patch = <T,>(p: string, json?: unknown) => api<T>('PATCH', p, { json });
