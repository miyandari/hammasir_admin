import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import type { University } from '../lib/types';
import { Err, Modal, Table, Tag } from '../components/ui';

export default function Universities() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['universities'], queryFn: () => get<University[]>('/universities/') });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  const m = useMutation({
    mutationFn: () => post<University>('/universities/', { name: name.trim(), code: code.trim(), is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['universities'] }); setOpen(false); setName(''); setCode(''); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate(); };
  return (<>
    <div className="top"><h1>دانشگاه‌ها</h1><button className="btn" onClick={() => setOpen(true)}>دانشگاه جدید</button></div>
    <Err e={q.error} />
    <Table rows={q.data ?? []} cols={[
      { head: 'شناسه', cell: (r) => r.id }, { head: 'نام', cell: (r) => r.name },
      { head: 'کد', cell: (r) => <span dir="ltr">{r.code}</span> }, { head: 'وضعیت', cell: (r) => <Tag on={r.is_active} /> },
    ]} />
    {open && <Modal title="دانشگاه جدید" onClose={() => setOpen(false)}>
      <form onSubmit={submit}><Err e={m.error} />
        <label>نام دانشگاه<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>کد یکتا (انگلیسی)<input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" required /></label>
        <button className="btn" disabled={m.isPending}>{m.isPending ? 'در حال ثبت…' : 'ثبت'}</button>
      </form>
    </Modal>}
    <p className="mute" style={{ marginTop: 16 }}>بعد از ساخت دانشگاه، مدیر آن را از بخش کاربران تعریف کنید (به‌زودی در همین پنل).</p>
  </>);
}
