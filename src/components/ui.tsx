import { useEffect, useState, type ReactNode } from 'react';

const PAGE = 100;

export const Err = ({ e }: { e: unknown }) => (e ? <div className="err">{e instanceof Error ? e.message : String(e)}</div> : null);
export const Tag = ({ on, yes = 'فعال', no = 'غیرفعال' }: { on: boolean; yes?: string; no?: string }) => <span className={`tag ${on ? 'ok' : 'bad'}`}>{on ? yes : no}</span>;

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`card mcard${wide ? ' wide' : ''}`} role="dialog" aria-label={title}>
        <div className="top mhead"><b>{title}</b><button className="btn ghost" onClick={onClose}>بستن</button></div>
        <div className="mbody">{children}</div>
      </div>
    </div>
  );
}

export interface Col<T> { head: string; cell: (r: T) => ReactNode; }
export function Table<T>({ rows, cols, empty = 'موردی یافت نشد' }: { rows: T[]; cols: Col<T>[]; empty?: string }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [page, pages]);
  if (!rows.length) return <div className="card mute">{empty}</div>;
  const cur = Math.min(page, pages - 1);
  const from = cur * PAGE;
  const shown = rows.slice(from, from + PAGE);
  return (
    <>
      <div className="card tw" style={{ padding: 0 }}>
        <table><thead><tr>{cols.map((c) => <th key={c.head}>{c.head}</th>)}</tr></thead>
          <tbody>{shown.map((r, i) => <tr key={from + i}>{cols.map((c) => <td key={c.head}>{c.cell(r)}</td>)}</tr>)}</tbody></table>
      </div>
      {pages > 1 && (
        <div className="row pager">
          <button className="btn ghost" disabled={cur === 0} onClick={() => setPage(cur - 1)}>قبلی</button>
          <span className="mute">صفحه {cur + 1} از {pages} · ردیف {from + 1} تا {from + shown.length} از {rows.length}</span>
          <button className="btn ghost" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>بعدی</button>
        </div>
      )}
    </>
  );
}
