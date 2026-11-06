import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ROLE_FA } from '../lib/types';
import Icon from './Icon';

const ITEMS = [
  { tab: 'profile', label: 'پروفایل من', icon: 'user', admin: false },
  { tab: 'backup', label: 'پشتیبان‌گیری و بازگردانی', icon: 'shield', admin: true },
  { tab: 'about', label: 'درباره ما', icon: 'info', admin: false },
  { tab: 'contact', label: 'ارتباط با ما', icon: 'phone', admin: false },
] as const;

/** نام و نقش، منوی همبرگری تنظیمات و دکمه‌ی خروج (آیکون) */
export default function UserBar({ className = '' }: { className?: string }) {
  const { me, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', click); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open]);

  if (!me) return null;
  const name = [me.first_name, me.last_name].filter(Boolean).join(' ') || me.username;
  const canBackup = me.role === 'super_admin' || me.role === 'university_admin';
  return (
    <div className={`userbar ${className}`}>
      <span className="avatar" aria-hidden="true">{name.trim().charAt(0)}</span>
      <span className="uinfo"><b>{name}</b><small>{ROLE_FA[me.role]}</small></span>
      <div className="setmenu" ref={box}>
        <button className="iconbtn plain" onClick={() => setOpen(!open)} title="تنظیمات" aria-label="تنظیمات" aria-haspopup="menu" aria-expanded={open}><Icon name={className.includes('compact') ? 'dots' : 'menu'} /></button>
        {open && (
          <div className="dropdown" role="menu">
            <div className="dhead">تنظیمات</div>
            {ITEMS.filter((i) => !i.admin || canBackup).map((i) => (
              <button key={i.tab} role="menuitem" className="ditem" onClick={() => { setOpen(false); nav(`/settings/${i.tab}`); }}>
                <Icon name={i.icon} size={18} /><span>{i.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="iconbtn" onClick={logout} title="خروج" aria-label="خروج"><Icon name="logout" /></button>
    </div>
  );
}
