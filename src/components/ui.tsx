import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const PAGE = 100;
const n = (x: number) => x.toLocaleString('fa-IR');

/** شماره‌ی صفحه‌ها (۰-پایه)؛ null = «…». همیشه اول، آخر و همسایه‌های صفحه‌ی فعلی */
function pageList(cur: number, total: number): (number | null)[] {
  const keep = new Set([0, total - 1, cur - 1, cur, cur + 1]);
  if (total <= 9) return Array.from({ length: total }, (_, i) => i);
  const out: (number | null)[] = []; let last = -1;
  for (const i of [...keep].filter((x) => x >= 0 && x < total).sort((a, b) => a - b)) { if (i - last > 1) out.push(null); out.push(i); last = i; }
  return out;
}

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
          <span className="info">ردیف {n(from + 1)} تا {n(from + shown.length)} از {n(rows.length)}</span>
          <nav className="pn" aria-label="صفحه‌بندی">
            <button disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="صفحه‌ی قبل">‹</button>
            {pageList(cur, pages).map((x, i) => x === null
              ? <span key={`g${i}`} className="gap">…</span>
              : <button key={x} className={x === cur ? 'cur' : ''} aria-current={x === cur ? 'page' : undefined} onClick={() => setPage(x)}>{n(x + 1)}</button>)}
            <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="صفحه‌ی بعد">›</button>
          </nav>
        </div>
      )}
    </>
  );
}

/** منوی عملیات ردیف (⋯): دکمه‌ها داخل یک منوی کوچک جمع می‌شوند تا ردیف‌ها کوتاه و جدول جمع‌وجور بماند */
export function Acts({ children }: { children: ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [pos]);
  function toggle() {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const w = 190;
    setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 200), left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) });
  }
  return (<>
    <button ref={btn} className="btn ghost kebab" aria-label="عملیات" title="عملیات" onClick={toggle}><Icon name="dots" /></button>
    {pos && createPortal(<>
      <div className="menu-back" onClick={() => setPos(null)} />
      <div className="menu" style={{ top: pos.top, left: pos.left }} onClick={() => setPos(null)}>{children}</div>
    </>, document.body)}
  </>);
}
