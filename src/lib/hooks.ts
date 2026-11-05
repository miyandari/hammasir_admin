import { useQuery } from '@tanstack/react-query';
import { get } from './api';
import { useAuth } from './auth';
import type { Company, Driver, University } from './types';

export function useUniversities() {
  const { me } = useAuth();
  return useQuery({ queryKey: ['universities'], queryFn: () => get<University[]>('/universities/'), enabled: me?.role === 'super_admin' });
}
export function useCompanies() {
  return useQuery({ queryKey: ['/transport-companies/'], queryFn: () => get<Company[]>('/transport-companies/') });
}
export function useDrivers() {
  return useQuery({ queryKey: ['/drivers/'], queryFn: () => get<Driver[]>('/drivers/') });
}
/** مدیر ارشد باید دانشگاه را انتخاب کند؛ بقیه دانشگاه خودشان را دارند */
export function useUniField() {
  const { me } = useAuth();
  const unis = useUniversities();
  const isSuper = me?.role === 'super_admin';
  return {
    isSuper, myUni: me?.university_id ?? null,
    options: (unis.data ?? []).map((u) => ({ value: u.id, label: u.name })),
  };
}
