import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// در توسعه، درخواست‌های API به بک‌اند محلی پراکسی می‌شوند (بدون مشکل CORS).
const API = process.env.VITE_PROXY_TARGET || 'http://localhost:8000';
const paths = ['auth','users','universities','students','student-import','drivers','vehicles','contracts','contract-vehicles','contract-drivers',
  'transport-companies','trips','vehicle-locations','schedules','route-stations','services','schedules','routes','stations','finance-reports',
  'analytics-reports','reports','contract-rates','trip-incidents','vehicle-locations','notifications','backup','feedbacks','reservations','boarding-requests','audit-logs'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(paths.map((p) => [`/api/${p}`, {
      target: API, changeOrigin: true, rewrite: (s: string) => s.replace(/^\/api/, ''),
    }])),
  },
});
