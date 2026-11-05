export type Role = 'super_admin' | 'university_admin' | 'transport_manager' | 'company_admin' | 'driver' | 'student';
export interface Me { id: number; username: string; role: Role; university_id: number | null; transport_company_id: number | null; first_name: string | null; last_name: string | null; }
export interface University { id: number; name: string; code: string; is_active: boolean; }
export interface Student { id: number; university_id: number; student_number: string; first_name: string; last_name: string; gender: string; national_id: string | null; phone: string | null; is_active: boolean; }
export interface Company { id: number; name: string; registration_number: string | null; phone: string | null; address: string | null; is_active: boolean; }
export interface Contract { id: number; university_id: number; transport_company_id: number; contract_number: string; start_date: string; end_date: string; contract_amount: number | null; description: string | null; is_active: boolean; }
export interface Vehicle { id: number; university_id: number; driver_id: number | null; plate_number: string; vehicle_type: string; capacity: number; is_active: boolean; }
export interface Driver { id: number; university_id: number; transport_company_id: number | null; first_name: string; last_name: string; national_id: string | null; phone: string; license_number: string | null; is_active: boolean; }
export interface Trip { id: number; university_id: number; service_id: number; driver_id: number | null; vehicle_id: number | null; trip_date: string; planned_departure_time: string; actual_departure_time: string | null; actual_arrival_time: string | null; status: string; is_active: boolean; }
export const ROLE_FA: Record<Role, string> = {
  super_admin: 'مدیر ارشد سامانه', university_admin: 'مدیر دانشگاه', transport_manager: 'مسئول حمل‌ونقل',
  company_admin: 'کاربر شرکت حمل‌ونقل', driver: 'راننده', student: 'دانشجو',
};
export const TRIP_STATUS_FA: Record<string, string> = {
  scheduled: 'برنامه‌ریزی‌شده', boarding: 'در حال سوار شدن', in_progress: 'در حال انجام', completed: 'انجام‌شده', cancelled: 'لغوشده',
};
