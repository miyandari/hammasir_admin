export type Role = 'super_admin' | 'university_admin' | 'transport_manager' | 'company_admin' | 'driver' | 'student';
export interface Me { id: number; username: string; role: Role; university_id: number | null; transport_company_id: number | null; first_name: string | null; last_name: string | null; phone?: string | null; }
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
export interface Rate { id: number; contract_id: number; vehicle_type: string; price_per_trip: number; }
export interface CostLine { vehicle_type: string | null; trips: number; price_per_trip: number | null; amount: number | null; }
export interface CostItem { contract_id: number; contract_number: string; university_id: number; transport_company_id: number; trips: number; priced_trips: number; unpriced_trips: number; total_cost: number; lines: CostLine[]; }
export interface CostReport { summary: { trips: number; priced_trips: number; unpriced_trips: number; total_cost: number }; items: CostItem[]; }
export const VTYPE_FA: Record<string, string> = { bus: 'اتوبوس', minibus: 'مینی‌بوس', van: 'ون', sedan: 'سواری' };
export interface Assignment { id: number; contract_id: number; vehicle_id?: number; driver_id?: number; start_date: string | null; end_date: string | null; is_active: boolean; }
export interface Station { id: number; university_id: number; name: string; address: string | null; latitude: number | null; longitude: number | null; is_active: boolean; }
export interface RouteT { id: number; university_id: number; name: string; code: string; direction: string; description: string | null; is_active: boolean; }
export interface RouteStation { id: number; route_id: number; station_id: number; stop_order: number; estimated_minutes_from_start: number | null; stop_duration_seconds: number | null; }
export interface ServiceT { id: number; university_id: number; route_id: number; contract_id: number | null; name: string; code: string; service_type: string; gender_restriction: string; is_active: boolean; }
export interface Schedule { id: number; university_id: number; service_id: number; day_of_week: number; departure_time: string; arrival_time: string | null; schedule_type: string; is_active: boolean; }
// ۰ = شنبه … ۶ = جمعه (مطابق بک‌اند)
export const DAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export const DIR_FA: Record<string, string> = { outbound: 'رفت (به دانشگاه)', inbound: 'برگشت (از دانشگاه)' };
export const GENDER_FA: Record<string, string> = { mixed: 'مختلط', male: 'آقایان', female: 'بانوان' };
export const STYPE_FA: Record<string, string> = { regular: 'عادی', extra: 'فوق‌العاده' };
export interface Loc { id: number; trip_id: number; vehicle_id: number; latitude: number; longitude: number; speed: number | null; heading: number | null; recorded_at: string; }
export interface Incident { id: number; trip_id: number; reported_by_driver_id: number | null; incident_type: string; description: string | null; occurred_at: string; resolved_at: string | null; is_resolved: boolean; }
export const BREAKDOWN_FA: Record<string, string> = { engine: 'موتور', tire: 'لاستیک', electrical: 'برقی', fuel: 'سوخت', accident: 'تصادف', other: 'سایر' };
/** incident_type مثل vehicle_breakdown:engine را به متن فارسی تبدیل می‌کند */
export function incidentLabel(t: string): string {
  if (t.startsWith('vehicle_breakdown')) { const k = t.split(':')[1]; return `خرابی خودرو${k ? ` — ${BREAKDOWN_FA[k] ?? k}` : ''}`; }
  return t;
}
export interface TripSummary { total_trips: number; completed_trips: number; cancelled_trips: number; scheduled_trips: number; total_reservations: number; active_reservations: number; cancelled_reservations: number; total_boarded_passengers: number; no_show_students: number; boarding_without_reservation: number; }
export interface RouteUsage { route_id: number; route_name: string; service_name: string; completed_trip_count: number; total_capacity: number; reservation_count: number; usage_percent: number; }
export interface AnalyticsReport { summary: { trip_count: number; completed_trip_count: number; overall_usage_percent: number }; route_usage: RouteUsage[]; }
