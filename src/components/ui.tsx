import type { ReactNode } from 'react';

export const Err = ({ e }: { e: unknown }) => (e ? <div className="err">{e instanceof Error ? e.message : String(e)}</div> : null);
export const Tag = ({ on, yes = 'فعال', no = 'غیرفعال' }: { on: boolean; yes?: string; no?: string }) => <span className={`tag ${on ? 'ok' : 'bad'}`}>{on ? yes : no}</span>;

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" role="dialog" aria-label={title}>
        <div className="top" style={{ marginBottom: 12 }}><b>{title}</b><button className="btn ghost" onClick={onClose}>بستن</button></div>
        {children}
      </div>
    </div>
  );
}

export interface Col<T> { head: string; cell: (r: T) => ReactNode; }
export function Table<T>({ rows, cols, empty = 'موردی یافت نشد' }: { rows: T[]; cols: Col<T>[]; empty?: string }) {
  if (!rows.length) return <div className="card mute">{empty}</div>;
  return (
    <div className="card tw" style={{ padding: 0 }}>
      <table><thead><tr>{cols.map((c) => <th key={c.head}>{c.head}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c.head}>{c.cell(r)}</td>)}</tr>)}</tbody></table>
    </div>
  );
}
