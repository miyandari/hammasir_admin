import type { BaseMode } from '../lib/basemap';

/** کلید تعویض نقشه‌ی آفلاین/آنلاین */
export default function BaseSwitch({ mode, offlineOk, onChange }: { mode: BaseMode | null; offlineOk: boolean; onChange: (m: BaseMode) => void }) {
  if (!mode) return null;
  return (
    <div className="seg" role="group" aria-label="نوع نقشه">
      <button type="button" className={mode === 'offline' ? 'on' : ''} disabled={!offlineOk}
        title={offlineOk ? 'استفاده از فایل نقشه‌ی ذخیره‌شده' : 'فایل نقشه‌ی آفلاین روی سرور پیدا نشد'} onClick={() => onChange('offline')}>آفلاین</button>
      <button type="button" className={mode === 'online' ? 'on' : ''} onClick={() => onChange('online')}>آنلاین</button>
    </div>
  );
}
