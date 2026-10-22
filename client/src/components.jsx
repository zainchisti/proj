import React from 'react';
import {BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts';
import {X, Inbox} from 'lucide-react';
import {usePalette} from './lib.js';

export function Loading({error, loading, children}) {
  if (error) return <div className="empty error">{error}</div>;
  if (loading) return <div className="empty"><span className="spinner"/>Loading…</div>;
  return children;
}

export function Empty({children = 'Nothing here yet.'}) {
  return <div className="empty"><Inbox size={28}/><p>{children}</p></div>;
}

export function Stat({title, value, icon: Icon, sub, tone = 'brand'}) {
  return (
    <div className={'stat tone-' + tone}>
      <div className="stat-icon"><Icon size={20}/></div>
      <div>
        <span className="stat-title">{title}</span>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

export function Panel({title, sub, children, action, className = ''}) {
  return (
    <section className={'panel ' + className}>
      {(title || action) && (
        <div className="panel-head">
          <div>{title && <h3>{title}</h3>}{sub && <p>{sub}</p>}</div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({title, onClose, children, wide}) {
  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-label={title}>
        <div className="panel-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tag({tone, children}) {
  return <span className={'tag ' + tone}>{children}</span>;
}

export const riskTone = r => (r === 'Low' ? 'good' : r === 'High' ? 'bad' : 'warn');
export const statusTone = s => (s === 'approved' || s === 'closed' ? 'good' : s === 'rejected' ? 'bad' : 'warn');
export const scoreTone = s => (s >= 700 ? 'good' : s < 580 ? 'bad' : 'warn');

export function Field({label, name, type = 'text', span, ...rest}) {
  return (
    <label className={span ? 'span2' : undefined}>
      {label}
      <input name={name} type={type} required {...rest}/>
    </label>
  );
}

export function Pagination({page, total, setPage, size = 20}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span>{total.toLocaleString('en-IN')} records</span>
      <div>
        <button className="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function ChartBar({data, x = 'name', y = 'value', color = 0, height}) {
  const p = usePalette();
  return (
    <div className="chart" style={height ? {height} : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={p.grid} vertical={false}/>
          <XAxis dataKey={x} stroke={p.axis} tick={{fontSize: 11}} tickLine={false} axisLine={false}/>
          <YAxis stroke={p.axis} tick={{fontSize: 11}} tickLine={false} axisLine={false}/>
          <Tooltip contentStyle={p.tooltip} cursor={{fill: p.grid, opacity: 0.5}}/>
          <Bar dataKey={y} fill={p.series[color % p.series.length]} radius={[6, 6, 0, 0]} maxBarSize={44}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Table({columns, rows, rowKey, onRowClick, empty}) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map(c => <th key={c.label}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r) : i} className={onRowClick ? 'clickable' : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map(c => <td key={c.label}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
