/** API زمان‌ها را UTC و گاهی بدون «Z» برمی‌گرداند؛ همیشه UTC فرض و با ساعت تهران نمایش می‌دهیم */
export const parseUtc = (s: string) => new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z');
export const hmTehran = (s: string | null | undefined) =>
  (s ? parseUtc(s).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' }) : '—');
