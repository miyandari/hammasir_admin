import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, get, tokenStore } from './api';
import type { Me, Role } from './types';

const STAFF: Role[] = ['super_admin', 'university_admin', 'transport_manager', 'company_admin'];

interface AuthState { me: Me | null; loading: boolean; login: (u: string, p: string) => Promise<void>; logout: () => void; reload: () => Promise<void>; }
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => { tokenStore.clear(); setMe(null); }, []);

  useEffect(() => {
    const h = () => setMe(null);
    window.addEventListener('hm-unauthorized', h);
    return () => window.removeEventListener('hm-unauthorized', h);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    get<Me>('/users/me').then(setMe).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api<{ access_token: string }>('POST', '/auth/login', { form: { username, password } });
    tokenStore.set(r.access_token);
    try {
      const m = await get<Me>('/users/me');
      if (!STAFF.includes(m.role)) { tokenStore.clear(); throw new Error('این پنل مخصوص مدیران است؛ دانشجو و راننده از اپ موبایل استفاده کنند'); }
      setMe(m);
    } catch (e) { tokenStore.clear(); throw e; }
  }, []);

  /** بازخوانی اطلاعات کاربر (مثلاً پس از ویرایش پروفایل) */
  const reload = useCallback(async () => { setMe(await get<Me>('/users/me')); }, []);

  return <Ctx.Provider value={{ me, loading, login, logout, reload }}>{children}</Ctx.Provider>;
}

export function useAuth() { const c = useContext(Ctx); if (!c) throw new Error('AuthProvider missing'); return c; }
