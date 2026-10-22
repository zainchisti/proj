import React, {useEffect, useState} from 'react';
import {PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend} from 'recharts';
import {CheckCircle2, AlertTriangle, Phone, Plus, Download, KeyRound} from 'lucide-react';
import {api, useData, useDebounced, usePalette, currency, fmtDate, DEMO} from './lib.js';
import {resetDemo} from './mock.js';
import {Loading, Panel, Modal, Tag, Field, Table, confirmAction} from './components.jsx';

function usePost(path, body) {
  const [state, setState] = useState({data: null, error: ''});
  const key = useDebounced(JSON.stringify(body), 250);
  useEffect(() => {
    let active = true;
    api(path, {method: 'POST', body: key})
      .then(data => { if (active) setState({data, error: ''}); })
      .catch(e => { if (active) setState({data: null, error: e.message}); });
    return () => { active = false; };
  }, [path, key]);
  return state;
}

function NumberInput({label, value, onChange, ...rest}) {
  return <label>{label}<input type="number" value={value} onChange={e => onChange(e.target.value)} {...rest}/></label>;
}

function Slider({label, value, onChange, min, max, step = 1, format = v => v}) {
  return (
    <label className="slider">
      <span className="slider-head">{label}<b>{format(value)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/>
    </label>
  );
}

function EMITool() {
  const [p, setP] = useState(500000);
  const [rate, setRate] = useState(10.5);
  const [months, setMonths] = useState(60);
  const {data, error} = usePost('/emi', {principal: Number(p), annualRate: Number(rate), months: Number(months)});
  const palette = usePalette();
  function exportSchedule() {
    const rows = [['installment', 'dueDate', 'emi', 'principal', 'interest', 'balance'], ...data.schedule.map(i => [i.installment, fmtDate(i.dueDate), i.amount, i.principal, i.interest, i.balance])];
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(c => /[",]/.test(c) ? `"${c}"` : c).join(',')).join('\n')], {type: 'text/csv'}));
    Object.assign(document.createElement('a'), {href: url, download: 'emi-schedule.csv'}).click();
    URL.revokeObjectURL(url);
  }
  return <>
    <div className="grid-2">
      <Panel title="Loan terms" sub="Drag the sliders or type exact values">
        <div className="stack">
          <Slider label="Principal" value={p} onChange={setP} min={10000} max={10000000} step={10000} format={currency}/>
          <Slider label="Interest rate" value={rate} onChange={setRate} min={0} max={30} step={0.1} format={v => v + '%'}/>
          <Slider label="Tenure" value={months} onChange={setMonths} min={1} max={360} format={v => `${v} months (${(v / 12).toFixed(1)} yrs)`}/>
          <div className="form-grid three">
            <NumberInput label="Principal (₹)" value={p} onChange={setP} min={1}/>
            <NumberInput label="Rate (%)" value={rate} onChange={setRate} min={0} max={100} step={0.1}/>
            <NumberInput label="Months" value={months} onChange={setMonths} min={1} max={360}/>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </Panel>
      <Panel title="Payment breakdown" sub="Reducing-balance interest">
        {data && <>
          <div className="big-number accent">{currency(data.emi)}<small>per month</small></div>
          <div className="kv">
            <p>Principal <b>{currency(p)}</b></p>
            <p>Total interest <b>{currency(data.interest)}</b></p>
            <p>Total payable <b>{currency(data.total)}</b></p>
          </div>
          <div className="chart short">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name: 'Principal', value: Number(p)}, {name: 'Interest', value: data.interest}]} nameKey="name" dataKey="value" innerRadius={48} outerRadius={72} stroke="none">
                  {[0, 1].map(i => <Cell key={i} fill={palette.series[i]}/>)}
                </Pie>
                <Legend iconType="circle"/>
                <Tooltip contentStyle={palette.tooltip} formatter={v => currency(v)}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>}
      </Panel>
    </div>
    {data && (
      <Panel title="Amortization schedule" action={!DEMO && <button className="secondary" onClick={exportSchedule}><Download size={16}/> Download CSV</button>}>
        <div className="scroll-box">
          <Table rows={data.schedule} rowKey={i => i.installment} columns={[
            {label: '#', render: i => i.installment},
            {label: 'Due', render: i => fmtDate(i.dueDate)},
            {label: 'EMI', render: i => currency(i.amount)},
            {label: 'Principal', render: i => currency(i.principal)},
            {label: 'Interest', render: i => currency(i.interest)},
            {label: 'Balance', render: i => currency(i.balance)}
          ]}/>
        </div>
      </Panel>
    )}
  </>;
}

function EligibilityTool() {
  const [income, setIncome] = useState(80000);
  const [existing, setExisting] = useState(5000);
  const [score, setScore] = useState(740);
  const [rate, setRate] = useState(10.5);
  const [months, setMonths] = useState(60);
  const {data, error} = usePost('/eligibility', {monthlyIncome: Number(income), existingEMI: Number(existing), creditScore: Number(score), annualRate: Number(rate), months: Number(months)});
  return (
    <div className="grid-2">
      <Panel title="Applicant profile" sub="Estimate how much a borrower can safely take on">
        <div className="form-grid">
          <NumberInput label="Monthly income (₹)" value={income} onChange={setIncome} min={0}/>
          <NumberInput label="Existing EMIs (₹)" value={existing} onChange={setExisting} min={0}/>
          <NumberInput label="Credit score" value={score} onChange={setScore} min={300} max={900}/>
          <NumberInput label="Interest rate (%)" value={rate} onChange={setRate} min={0} max={100} step={0.1}/>
          <NumberInput label="Tenure (months)" value={months} onChange={setMonths} min={1} max={360}/>
        </div>
        {error && <p className="error">{error}</p>}
      </Panel>
      <Panel title="Eligibility result" sub="Rule-based FOIR estimate, not a credit decision">
        {data && <>
          <div className={'verdict ' + (data.eligible ? 'good' : 'bad')}>
            {data.eligible ? <CheckCircle2 size={22}/> : <AlertTriangle size={22}/>}
            <div><b>{data.eligible ? 'Likely eligible' : 'Not eligible'}</b><small>{data.grade} credit · up to {data.foir}% of income towards EMIs</small></div>
          </div>
          <div className="big-number accent">{currency(data.maxPrincipal)}<small>maximum loan amount</small></div>
          <div className="kv">
            <p>Maximum new EMI <b>{currency(data.maxEMI)}</b></p>
            <p>Income allowance ({data.foir}%) <b>{currency(Number(income) * data.foir / 100)}</b></p>
            <p>Less existing EMIs <b>−{currency(existing)}</b></p>
          </div>
        </>}
      </Panel>
    </div>
  );
}

function PrepaymentTool() {
  const [balance, setBalance] = useState(800000);
  const [rate, setRate] = useState(9.5);
  const [months, setMonths] = useState(120);
  const [extra, setExtra] = useState(100000);
  const {data, error} = usePost('/prepayment', {balance: Number(balance), annualRate: Number(rate), months: Number(months), extra: Number(extra)});
  return (
    <div className="grid-2">
      <Panel title="Outstanding loan" sub="See what a lump-sum part-payment saves">
        <div className="form-grid">
          <NumberInput label="Outstanding balance (₹)" value={balance} onChange={setBalance} min={1}/>
          <NumberInput label="Interest rate (%)" value={rate} onChange={setRate} min={0} max={100} step={0.1}/>
          <NumberInput label="Remaining months" value={months} onChange={setMonths} min={1} max={360}/>
          <NumberInput label="Prepayment (₹)" value={extra} onChange={setExtra} min={1}/>
        </div>
        {error && <p className="error">{error}</p>}
      </Panel>
      <Panel title="Your two options" sub="Keep the EMI and finish early, or keep the tenure and pay less each month">
        {data && <>
          <div className="big-number good">{currency(data.interestSaved)}<small>interest saved by finishing early</small></div>
          <div className="option-cards">
            <div><small>Reduce tenure</small><b>{data.newMonths} months</b><span>{data.monthsSaved} months sooner at {currency(data.before)}/mo</span></div>
            <div><small>Reduce EMI</small><b>{currency(data.reducedEMI)}/mo</b><span>was {currency(data.before)}, same {months} months</span></div>
          </div>
        </>}
      </Panel>
    </div>
  );
}

export function LoanTools() {
  const tabs = {'EMI calculator': EMITool, 'Eligibility': EligibilityTool, 'Prepayment planner': PrepaymentTool};
  const [tab, setTab] = useState('EMI calculator');
  const Tool = tabs[tab];
  return <>
    <div className="tabs">{Object.keys(tabs).map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    <Tool/>
  </>;
}

export function Collections({refresh}) {
  const [days, setDays] = useState(30);
  const [view, setView] = useState('all');
  const {data, error, loading} = useData('/installments/due?days=' + days, [refresh]);
  const rows = (data || []).filter(r => view === 'all' || (view === 'overdue' ? r.overdue : !r.overdue));
  const overdue = (data || []).filter(r => r.overdue);
  return <>
    <div className="stats three">
      <div className="stat tone-pink"><div><span className="stat-title">Overdue installments</span><strong>{overdue.length}</strong><small>{currency(overdue.reduce((s, r) => s + r.amount, 0))} past due</small></div></div>
      <div className="stat tone-amber"><div><span className="stat-title">Due in {days} days</span><strong>{(data?.length || 0) - overdue.length}</strong><small>{currency((data || []).filter(r => !r.overdue).reduce((s, r) => s + r.amount, 0))} expected</small></div></div>
      <div className="stat tone-brand"><div><span className="stat-title">Total to collect</span><strong>{currency((data || []).reduce((s, r) => s + r.amount, 0))}</strong><small>Showing up to 200 installments</small></div></div>
    </div>
    <div className="toolbar">
      <div className="chips">{[['all', 'All'], ['overdue', 'Overdue'], ['upcoming', 'Upcoming']].map(([k, l]) => <button key={k} className={'chip' + (view === k ? ' on' : '')} onClick={() => setView(k)}>{l}</button>)}</div>
      <select value={days} onChange={e => setDays(Number(e.target.value))}>{[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Next {d} days</option>)}</select>
    </div>
    <Panel title="Collections queue" sub="Pending installments on approved loans, oldest first">
      <Loading {...{error, loading}}>
        <Table rows={rows} rowKey={r => r.loan + r.installment} empty="Nothing to collect in this window." columns={[
          {label: 'Customer', render: r => <><b>{r.customer}</b>{r.phone && <small><Phone size={11}/> {r.phone}</small>}</>},
          {label: 'Loan', render: r => `${r.type} · #${r.installment}`},
          {label: 'Due date', render: r => fmtDate(r.dueDate)},
          {label: 'Amount', render: r => currency(r.amount)},
          {label: 'Status', render: r => r.overdue ? <Tag tone="bad">{r.daysLate} days late</Tag> : <Tag tone="info">Upcoming</Tag>}
        ]}/>
      </Loading>
    </Panel>
  </>;
}

export function Team({run, refresh, busy, notify}) {
  const {data, error, loading} = useData('/users', [refresh]);
  const [open, setOpen] = useState(false);
  function submit(e) {
    e.preventDefault();
    const body = JSON.stringify(Object.fromEntries(new FormData(e.target)));
    run(async () => { await api('/users', {method: 'POST', body}); setOpen(false); notify('Team member added', 'success'); });
  }
  return <>
    <div className="toolbar"><span className="muted">Admins can approve loans, import data and manage the team. Officers handle customers, applications and repayments.</span><button className="primary" onClick={() => setOpen(true)}><Plus size={16}/> Add member</button></div>
    <Panel title="Team members">
      <Loading {...{error, loading}}>
        {data && <Table rows={data} rowKey={u => u._id} columns={[
          {label: 'Name', render: u => <div className="cell-user"><div className="avatar sm">{u.name[0]}</div><div><b>{u.name}</b><small>{u.email}</small></div></div>},
          {label: 'Role', render: u => <Tag tone={u.role === 'admin' ? 'info' : 'good'}>{u.role}</Tag>},
          {label: 'Added', render: u => fmtDate(u.createdAt)}
        ]}/>}
      </Loading>
    </Panel>
    {open && (
      <Modal title="Add team member" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Full name" name="name"/>
          <Field label="Email" name="email" type="email"/>
          <Field label="Temporary password" name="password" type="password" minLength={10} autoComplete="new-password"/>
          <label>Role<select name="role" defaultValue="officer"><option value="officer">Officer</option><option value="admin">Admin</option></select></label>
          <button className="primary full span2" disabled={busy}>Create account</button>
        </form>
      </Modal>
    )}
  </>;
}

export function Settings({user, theme, toggleTheme, run, busy, notify}) {
  function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (f.next !== f.confirm) return notify('New passwords do not match');
    run(async () => {
      await api('/auth/password', {method: 'PATCH', body: JSON.stringify({current: f.current, next: f.next})});
      e.target.reset();
      notify('Password updated', 'success');
    });
  }
  return (
    <div className="grid-2">
      <Panel title="Profile">
        <div className="profile-head">
          <div className="avatar lg">{user.name[0]}</div>
          <div><h2>{user.name}</h2><p className="muted">{user.email}</p></div>
          <Tag tone="info">{user.role}</Tag>
        </div>
        <div className="kv">
          <p>Appearance <button className="secondary" onClick={toggleTheme}>{theme === 'dark' ? 'Switch to light' : 'Switch to dark'}</button></p>
          {DEMO && <p>Demo data <button className="secondary" onClick={async () => { if (await confirmAction('Reset all demo data to the original sample? Your changes will be lost.', 'Reset data', true)) run(async () => { resetDemo(); notify('Demo data reset', 'success'); }); }}>Reset sample data</button></p>}
        </div>
      </Panel>
      <Panel title="Change password" sub="At least 10 characters">
        <form className="stack" onSubmit={submit}>
          <Field label="Current password" name="current" type="password" autoComplete="current-password"/>
          <Field label="New password" name="next" type="password" minLength={10} autoComplete="new-password"/>
          <Field label="Confirm new password" name="confirm" type="password" minLength={10} autoComplete="new-password"/>
          <button className="primary" disabled={busy}><KeyRound size={16}/> Update password</button>
        </form>
      </Panel>
    </div>
  );
}

