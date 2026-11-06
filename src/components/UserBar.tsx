import { useAuth } from '../lib/auth';
import { ROLE_FA } from '../lib/types';
import Icon from './Icon';

/** نام، نقش و دکمه‌ی خروج (آیکون) */
export default function UserBar({ className = '' }: { className?: string }) {
  const { me, logout } = useAuth();
  if (!me) return null;
  const name = [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username;
  return (
    <div className={`userbar ${className}`}>
      <span className="avatar" aria-hidden="true">{name.trim().charAt(0)}</span>
      <span className="uinfo"><b>{name}</b><small>{ROLE_FA[me.role]}</small></span>
      <button className="iconbtn" onClick={logout} title="خروج" aria-label="خروج"><Icon name="logout" /></button>
    </div>
  );
}
