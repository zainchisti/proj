import React, {useEffect, useState} from 'react';
import {AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend} from 'recharts';
import {Landmark, Wallet, CheckCircle2, Coins, Clock, Plus, Search, Download, Upload, Activity, Trash2, Pencil, Eye, AlertTriangle} from 'lucide-react';
import {api, download, useData, useDebounced, usePalette, currency, compact, fmtDate, LOAN_TYPES, LOAN_STATUSES, APP_NAME, DEMO} from './lib.js';
import {Loading, Stat, Panel, Modal, Tag, Field, Pagination, ChartBar, Table, Empty, riskTone, statusTone, scoreTone, confirmAction} from './components.jsx';

export function Overview({go}) {
  const {data, error, loading} = useData('/analytics/overview');
  const due = useData('/installments/due?days=14');
  const p = usePalette();
  const pending = data?.byStatus.find(s => s._id === 'pending')?.count || 0;
  const overdue = due.data?.filter(d => d.overdue) || [];
  return (
    <Loading {...{error, loading}}>
      {data && <>
        <div className="hero">
          <div>
            <span className="eyebrow">Portfolio overview</span>
            <h2>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋</h2>
            <p>{pending ? `${pending.toLocaleString('en-IN')} applications are waiting for a decision` : 'No applications are waiting for a decision'}{overdue.length ? ` and ${overdue.length} installments are overdue.` : '.'}</p>
          </div>
          <div className="hero-actions">
            <button className="secondary" onClick={() => go('Collections')}><Clock size={16}/> Collections</button>
            <button className="primary" onClick={() => go('Loans')}><Plus size={16}/> New application</button>
          </div>
        </div>
        <div className="stats">
          <Stat title="Applications" value={data.stats.total.toLocaleString('en-IN')} icon={Landmark} sub={`${pending.toLocaleString('en-IN')} pending review`}/>
          <Stat title="Portfolio value" value={compact(data.stats.principal)} icon={Wallet} sub="Across all applications" tone="amber"/>
          <Stat title="Approved value" value={compact(data.stats.approvedValue)} icon={CheckCircle2} sub="Approved and closed" tone="green"/>
          <Stat title="Collected" value={compact(data.stats.collected)} icon={Coins} sub={`Avg EMI ${currency(data.stats.avgEMI)}`} tone="pink"/>
        </div>
        <div className="grid-3">
          <Panel title="Application trend" sub="Monthly loan origination volume" className="span-2">
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthly}>
                  <defs>
                    <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.series[0]} stopOpacity={0.35}/>
                      <stop offset="100%" stopColor={p.series[0]} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={p.grid} vertical={false}/>
                  <XAxis dataKey="_id" stroke={p.axis} tick={{fontSize: 11}} tickLine={false} axisLine={false}/>
                  <YAxis stroke={p.axis} tick={{fontSize: 11}} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={p.tooltip}/>
                  <Area type="monotone" dataKey="count" name="Applications" stroke={p.series[0]} strokeWidth={2.5} fill="url(#trend)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Status mix" sub="Approval pipeline">
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.byStatus} nameKey="_id" dataKey="count" innerRadius={60} outerRadius={90} paddingAngle={3} stroke="none">
                    {data.byStatus.map((d, i) => <Cell key={d._id} fill={p.series[i % p.series.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={p.tooltip}/>
                  <Legend iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <div className="grid-2">
          <Panel title="Loans by product" sub="Applications per loan product"><ChartBar data={data.byType} x="_id" y="count"/></Panel>
          <Panel title="Due in the next 14 days" sub="Pending installments on active loans" action={<button className="link" onClick={() => go('Collections')}>View all</button>}>
            <Loading {...due}>
              {due.data && (due.data.length ? (
                <ul className="due-list">
                  {due.data.slice(0, 6).map(d => (
                    <li key={d.loan + d.installment}>
                      <div><b>{d.customer}</b><small>{d.type} · #{d.installment} · {fmtDate(d.dueDate)}</small></div>
                      <div className="due-right"><b>{currency(d.amount)}</b>{d.overdue ? <Tag tone="bad">{d.daysLate}d late</Tag> : <Tag tone="info">Upcoming</Tag>}</div>
                    </li>
                  ))}
                </ul>
              ) : <Empty>No installments due soon.</Empty>)}
            </Loading>
          </Panel>
        </div>
      </>}
    </Loading>
  );
}

export function CustomerProfile({id, onClose}) {
  const {data, error, loading} = useData('/customers/' + id + '/profile');
  return (
    <Modal title="Customer profile" onClose={onClose} wide>
      <Loading {...{error, loading}}>
        {data && <>
          <div className="profile-head">
            <div className="avatar lg">{data.customer.name[0]}</div>
            <div>
              <h2>{data.customer.name}</h2>
              <p className="muted">{data.customer.email}{data.customer.phone && ' · ' + data.customer.phone}{data.customer.city && ' · ' + data.customer.city}</p>
            </div>
            <Tag tone={scoreTone(data.customer.creditScore)}>Score {data.customer.creditScore}</Tag>
          </div>
          <div className="mini-stats">
            <div><small>Monthly income</small><b>{currency(data.customer.monthlyIncome)}</b></div>
            <div><small>Active loans</small><b>{data.summary.active} / {data.summary.loans}</b></div>
            <div><small>Active borrowing</small><b>{currency(data.summary.borrowed)}</b></div>
            <div><small>Monthly EMIs</small><b>{currency(data.summary.monthlyEMI + (data.customer.existingEMI || 0))}</b></div>
            <div><small>Total repaid</small><b>{currency(data.summary.paid)}</b></div>
          </div>
          <h3>Loan history</h3>
          <Table rows={data.loans} rowKey={l => l._id} empty="This customer has no loans yet." columns={[
            {label: 'Product', render: l => l.type},
            {label: 'Principal', render: l => currency(l.principal)},
            {label: 'EMI', render: l => currency(l.emi)},
            {label: 'Risk', render: l => <Tag tone={riskTone(l.risk)}>{l.risk}</Tag>},
            {label: 'Status', render: l => <Tag tone={statusTone(l.status)}>{l.status}</Tag>},
            {label: 'Applied', render: l => fmtDate(l.createdAt)}
          ]}/>
        </>}
      </Loading>
    </Modal>
  );
}

export function Customers({run, busy, refresh, admin, notify}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [profile, setProfile] = useState(null);
  const query = useDebounced(search);
  const {data, error, loading} = useData('/customers?search=' + encodeURIComponent(query) + '&page=' + page, [refresh]);
  function submit(e) {
    e.preventDefault();
    const obj = Object.fromEntries(new FormData(e.target));
    for (const k of ['monthlyIncome', 'existingEMI', 'creditScore']) obj[k] = Number(obj[k]);
    const editing = form._id;
    run(async () => {
      await api(editing ? '/customers/' + editing : '/customers', {method: editing ? 'PUT' : 'POST', body: JSON.stringify(obj)});
      setForm(null);
      notify(editing ? 'Customer updated' : 'Customer added', 'success');
    });
  }
  async function remove(c) {
    if (!await confirmAction(`Delete ${c.name}? This cannot be undone.`, 'Delete customer', true)) return;
    run(async () => { await api('/customers/' + c._id, {method: 'DELETE'}); notify('Customer deleted', 'success'); });
  }
  return <>
    <div className="toolbar">
      <div className="searchbox"><Search size={16}/><input placeholder="Search by name or email" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></div>
      <div className="toolbar-actions">
        {!DEMO && <button className="secondary" onClick={() => run(() => download('/export/customers', 'lendflow-customers.csv'))}><Download size={16}/> Export CSV</button>}
        <button className="primary" onClick={() => setForm({})}><Plus size={16}/> Add customer</button>
      </div>
    </div>
    <Panel title="Customer directory" sub="Click a row to open the customer profile">
      <Loading {...{error, loading}}>
        {data && <>
          <Table rows={data.items} rowKey={c => c._id} onRowClick={c => setProfile(c._id)} empty="No customers match your search." columns={[
            {label: 'Customer', render: c => <div className="cell-user"><div className="avatar sm">{c.name[0]}</div><div><b>{c.name}</b><small>{c.email}</small></div></div>},
            {label: 'City', render: c => c.city || '—'},
            {label: 'Monthly income', render: c => currency(c.monthlyIncome)},
            {label: 'Credit score', render: c => <Tag tone={scoreTone(c.creditScore)}>{c.creditScore}</Tag>},
            {label: 'Employment', render: c => c.employment},
            {label: '', render: c => (
              <div className="row-actions" onClick={e => e.stopPropagation()}>
                <button className="icon-btn" title="View" onClick={() => setProfile(c._id)}><Eye size={16}/></button>
                <button className="icon-btn" title="Edit" onClick={() => setForm(c)}><Pencil size={16}/></button>
                {admin && <button className="icon-btn danger" title="Delete" onClick={() => remove(c)}><Trash2 size={16}/></button>}
              </div>
            )}
          ]}/>
          <Pagination page={page} total={data.total} setPage={setPage}/>
        </>}
      </Loading>
    </Panel>
    {form && (
      <Modal title={form._id ? 'Edit customer' : 'Add customer'} onClose={() => setForm(null)}>
        <form onSubmit={submit} className="form-grid">
          <Field label="Full name" name="name" defaultValue={form.name || ''}/>
          <Field label="Email" name="email" type="email" defaultValue={form.email || ''}/>
          <Field label="Phone" name="phone" defaultValue={form.phone || ''} required={false}/>
          <Field label="City" name="city" defaultValue={form.city || ''} required={false}/>
          <Field label="Monthly income (₹)" name="monthlyIncome" type="number" min={0} defaultValue={form.monthlyIncome ?? 40000}/>
          <Field label="Existing EMI (₹)" name="existingEMI" type="number" min={0} defaultValue={form.existingEMI ?? 0}/>
          <Field label="Credit score (300–900)" name="creditScore" type="number" min={300} max={900} defaultValue={form.creditScore ?? 700}/>
          <label>Employment
            <select name="employment" defaultValue={form.employment || 'Salaried'}>
              {['Salaried', 'Self-employed', 'Business', 'Other'].map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <button className="primary full span2" disabled={busy}>Save customer</button>
        </form>
      </Modal>
    )}
    {profile && <CustomerProfile id={profile} onClose={() => setProfile(null)}/>}
  </>;
}

export function LoanDetails({loan, onClose}) {
  const paid = loan.installments.filter(i => i.status === 'paid').length;
  const progress = loan.installments.length ? Math.round((paid / loan.installments.length) * 100) : 0;
  return (
    <Modal title={`${loan.type} loan`} onClose={onClose} wide>
      <div className="mini-stats">
        <div><small>Customer</small><b>{loan.customer?.name}</b></div>
        <div><small>Principal</small><b>{currency(loan.principal)}</b></div>
        <div><small>Monthly EMI</small><b>{currency(loan.emi)}</b></div>
        <div><small>Risk</small><b><Tag tone={riskTone(loan.risk)}>{loan.risk}</Tag> {loan.dti}% DTI</b></div>
        <div><small>Status</small><b><Tag tone={statusTone(loan.status)}>{loan.status}</Tag></b></div>
      </div>
      {loan.notes && <p className="note">{loan.notes}</p>}
      {loan.installments.length > 0 && <>
        <div className="progress-label"><span>Repayment progress</span><b>{paid} of {loan.installments.length} paid · {currency(loan.totalPaid)}</b></div>
        <div className="progress"><span style={{width: progress + '%'}}/></div>
        <h3>Repayment schedule</h3>
        <div className="scroll-box">
          <Table rows={loan.installments} rowKey={i => i.installment} columns={[
            {label: '#', render: i => i.installment},
            {label: 'Due', render: i => fmtDate(i.dueDate)},
            {label: 'Amount', render: i => currency(i.amount)},
            {label: 'Balance', render: i => currency(i.balance)},
            {label: 'Status', render: i => <Tag tone={i.status === 'paid' ? 'good' : new Date(i.dueDate) < new Date() ? 'bad' : 'warn'}>{i.status === 'pending' && new Date(i.dueDate) < new Date() ? 'overdue' : i.status}</Tag>}
          ]}/>
        </div>
      </>}
      {!loan.installments.length && <Empty>A repayment schedule is created when the loan is approved.</Empty>}
    </Modal>
  );
}

export function Loans({run, busy, refresh, admin, notify}) {
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [preview, setPreview] = useState({customer: '', principal: 250000, annualRate: 10.5, months: 36});
  const {data, error, loading} = useData(`/loans?status=${status}&type=${type}&page=${page}`, [refresh]);
  const customerQuery = useDebounced(customerSearch);
  const customers = useData(open ? '/customers?search=' + encodeURIComponent(customerQuery) : null);
  function submit(e) {
    e.preventDefault();
    const obj = Object.fromEntries(new FormData(e.target));
    obj.principal = Number(obj.principal);
    obj.annualRate = Number(obj.annualRate);
    obj.months = Number(obj.months);
    run(async () => { await api('/loans', {method: 'POST', body: JSON.stringify(obj)}); setOpen(false); notify('Application submitted', 'success'); });
  }
  async function decide(id, s) {
    if (!await confirmAction(`Mark this application as ${s}?`, s === 'approved' ? 'Approve' : 'Reject', s === 'rejected')) return;
    run(async () => { await api('/loans/' + id + '/status', {method: 'PATCH', body: JSON.stringify({status: s})}); notify('Application ' + s, 'success'); });
  }
  return <>
    <div className="toolbar">
      <div className="chips">
        {['', ...LOAN_STATUSES].map(s => <button key={s} className={'chip' + (status === s ? ' on' : '')} onClick={() => { setStatus(s); setPage(1); }}>{s || 'All'}</button>)}
        <select value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
          <option value="">All products</option>
          {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="toolbar-actions">
        {!DEMO && <button className="secondary" onClick={() => run(() => download('/export/loans', 'lendflow-loans.csv'))}><Download size={16}/> Export CSV</button>}
        <button className="primary" onClick={() => setOpen(true)}><Plus size={16}/> New application</button>
      </div>
    </div>
    <Panel title="Loan applications" sub="Lifecycle, approvals and repayment plans">
      <Loading {...{error, loading}}>
        {data && <>
          <Table rows={data.items} rowKey={l => l._id} onRowClick={l => run(async () => setSelected(await api('/loans/' + l._id)))} empty="No loans match these filters." columns={[
            {label: 'Customer', render: l => <><b>{l.customer?.name || 'Unknown'}</b><small>{fmtDate(l.createdAt)}</small></>},
            {label: 'Product', render: l => l.type},
            {label: 'Principal', render: l => currency(l.principal)},
            {label: 'Rate', render: l => l.annualRate + '%'},
            {label: 'EMI', render: l => currency(l.emi)},
            {label: 'Risk', render: l => <Tag tone={riskTone(l.risk)}>{l.risk}</Tag>},
            {label: 'Status', render: l => <Tag tone={statusTone(l.status)}>{l.status}</Tag>},
            {label: '', render: l => admin && l.status === 'pending' && (
              <div className="row-actions" onClick={e => e.stopPropagation()}>
                <button className="link good" onClick={() => decide(l._id, 'approved')}>Approve</button>
                <button className="link bad" onClick={() => decide(l._id, 'rejected')}>Reject</button>
              </div>
            )}
          ]}/>
          <Pagination page={page} total={data.total} setPage={setPage}/>
        </>}
      </Loading>
    </Panel>
    {open && (
      <Modal title="New loan application" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={submit} onChange={e => { if (e.target.name in preview) setPreview(p => ({...p, [e.target.name]: e.target.value})); }}>
          <label className="span2">Find customer<input placeholder="Type a name or email" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}/></label>
          <label className="span2">Customer
            <select name="customer" required defaultValue="">
              <option value="" disabled>Select a customer</option>
              {(customers.data?.items || []).map(c => <option key={c._id} value={c._id}>{c.name} — {c.email}</option>)}
            </select>
          </label>
          <label>Loan type<select name="type">{LOAN_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
          <Field label="Loan amount (₹)" name="principal" type="number" min={1} defaultValue={250000}/>
          <Field label="Annual interest (%)" name="annualRate" type="number" min={0} max={100} step={0.1} defaultValue={10.5}/>
          <Field label="Duration (months)" name="months" type="number" min={1} max={360} defaultValue={36}/>
          <EligibilityHint {...preview}/>
          <label className="span2">Notes<textarea name="notes" rows="2" placeholder="Optional application notes"/></label>
          <button className="primary full span2" disabled={busy}>Submit application</button>
        </form>
      </Modal>
    )}
    {selected && <LoanDetails loan={selected} onClose={() => setSelected(null)}/>}
  </>;
}

function EligibilityHint({customer, principal, annualRate, months}) {
  const [state, setState] = useState(null);
  const key = [customer, principal, annualRate, months].join('|');
  const debounced = useDebounced(key, 400);
  useEffect(() => {
    if (!customer || !(Number(months) > 0)) { setState(null); return; }
    let active = true;
    api('/eligibility', {method: 'POST', body: JSON.stringify({customer, annualRate: Number(annualRate), months: Number(months)})})
      .then(r => { if (active) setState(r); })
      .catch(() => { if (active) setState(null); });
    return () => { active = false; };
  }, [debounced]);
  if (!state) return null;
  const ok = state.eligible && Number(principal) <= state.maxPrincipal;
  return (
    <div className={'hint span2 ' + (ok ? 'good' : 'bad')}>
      {ok ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
      <span>{ok ? 'Within eligibility.' : 'Above eligibility.'} Max loan for this customer at these terms is <b>{currency(state.maxPrincipal)}</b> (EMI up to {currency(state.maxEMI)}, {state.grade} credit).</span>
    </div>
  );
}

export function Repayments({run, refresh, notify}) {
  const {data, error, loading} = useData('/loans?status=approved', [refresh]);
  const recent = useData('/repayments', [refresh]);
  const [id, setId] = useState('');
  const [installment, setInstallment] = useState('');
  const detail = useData(id ? '/loans/' + id : null, [refresh]);
  async function pay() {
    const selected = detail.data?.installments?.find(i => i.installment === Number(installment));
    if (!selected || !await confirmAction(`Record payment of ${currency(selected.amount)} for installment #${installment}?`, 'Record payment')) return;
    run(async () => {
      await api('/loans/' + id + '/repayments', {method: 'POST', body: JSON.stringify({installment: Number(installment)})});
      setInstallment('');
      notify('Payment recorded', 'success');
    });
  }
  const pendingRows = detail.data?.installments?.filter(i => i.status === 'pending') || [];
  return (
    <div className="grid-2">
      <Panel title="Record EMI repayment" sub="Pick an active loan, then the installment being paid">
        <Loading {...{error, loading}}>
          <div className="stack">
            <label>Active loan
              <select value={id} onChange={e => { setId(e.target.value); setInstallment(''); }}>
                <option value="">Select a loan</option>
                {data?.items.map(l => <option value={l._id} key={l._id}>{l.customer?.name} — {l.type} · {currency(l.principal)}</option>)}
              </select>
            </label>
            {id && detail.data?.installments && (
              <label>Unpaid installment
                <select value={installment} onChange={e => setInstallment(e.target.value)}>
                  <option value="">Select installment</option>
                  {pendingRows.map(i => <option key={i.installment} value={i.installment}>#{i.installment} · {fmtDate(i.dueDate)} · {currency(i.amount)}</option>)}
                </select>
              </label>
            )}
            <button className="primary" disabled={!id || !installment} onClick={pay}>Record payment</button>
          </div>
        </Loading>
      </Panel>
      <Panel title="Recent repayments" sub="Latest 100 recorded installments">
        <Loading {...recent}>
          {recent.data && <div className="scroll-box"><Table rows={recent.data} rowKey={r => r._id} empty="No repayments recorded yet." columns={[
            {label: 'Customer', render: r => r.loan?.customer?.name || '—'},
            {label: 'Installment', render: r => '#' + r.installment},
            {label: 'Amount', render: r => currency(r.amount)},
            {label: 'Paid on', render: r => fmtDate(r.paidAt)}
          ]}/></div>}
        </Loading>
      </Panel>
    </div>
  );
}

export function Analytics() {
  const overview = useData('/analytics/overview');
  const advanced = useData('/analytics/advanced');
  return (
    <Loading error={overview.error || advanced.error} loading={overview.loading || advanced.loading}>
      {overview.data && advanced.data && (
        <div className="grid-2">
          <Panel title="Product mix by value" sub="Total principal per product"><ChartBar data={overview.data.byType} x="_id" y="amount"/></Panel>
          <Panel title="Interest rate bands" sub="MongoDB $bucket"><ChartBar data={advanced.data.interestBands.map(x => ({name: String(x._id) + '%+', count: x.count}))} x="name" y="count" color={1}/></Panel>
          <Panel title="Top cities" sub="MongoDB $lookup + $group"><ChartBar data={advanced.data.topCities} x="_id" y="count" color={2}/></Panel>
          <Panel title="Applications by weekday" sub="Date extraction"><ChartBar data={advanced.data.daily.map(x => ({name: ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x._id], count: x.count}))} x="name" y="count" color={3}/></Panel>
          <Panel title="Risk profile" sub="Rule-based borrower segments" className="span-all"><ChartBar data={overview.data.risk} x="_id" y="count" color={4}/></Panel>
        </div>
      )}
    </Loading>
  );
}

export function DataImport({run, refresh, notify}) {
  const [file, setFile] = useState(null);
  const jobs = useData('/import/jobs', [refresh]);
  function upload(e) {
    e.preventDefault();
    if (!file) return;
    run(async () => {
      const form = new FormData();
      form.append('file', file);
      const job = await api('/import/customers', {method: 'POST', body: form});
      notify(`Imported ${job.inserted} of ${job.processed} rows`, 'success');
      setFile(null);
      e.target.reset();
    });
  }
  return <>
    <Panel title="Bulk customer import" sub="CSV rows are validated and inserted in batches of 500">
      <form className={'dropzone' + (file ? ' ready' : '')} onSubmit={upload}>
        <Upload size={32}/>
        <p>{file ? file.name : 'Choose a CSV file (up to 5 MB)'}</p>
        <input type="file" accept=".csv,text/csv" required onChange={e => setFile(e.target.files[0])}/>
        <button className="primary">Upload</button>
        <small>Columns: name, email, phone, city, monthlyIncome, existingEMI, creditScore, employment</small>
      </form>
    </Panel>
    <Panel title="Import history">
      <Loading {...jobs}>
        {jobs.data && <Table rows={jobs.data} rowKey={j => j._id} empty="No imports yet." columns={[
          {label: 'File', render: j => j.filename},
          {label: 'Processed', render: j => j.processed},
          {label: 'Inserted', render: j => <Tag tone="good">{j.inserted}</Tag>},
          {label: 'Rejected', render: j => <Tag tone={j.rejected ? 'bad' : 'info'}>{j.rejected}</Tag>},
          {label: 'Date', render: j => fmtDate(j.createdAt)}
        ]}/>}
      </Loading>
    </Panel>
  </>;
}

export function QueryLab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function test() {
    setLoading(true);
    setError('');
    api('/analytics/performance').then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }
  const Result = ({title, sub, r, tone}) => (
    <Panel title={title} sub={sub}>
      <div className={'big-number ' + tone}>{r.ms} ms</div>
      <div className="kv">
        <p>Documents examined <b>{r.examined.toLocaleString('en-IN')}</b></p>
        <p>Index keys examined <b>{r.keys.toLocaleString('en-IN')}</b></p>
        <p>Documents returned <b>{r.returned.toLocaleString('en-IN')}</b></p>
      </div>
    </Panel>
  );
  return <>
    <Panel title="Index performance lab" sub="Compare an indexed IXSCAN with a forced COLLSCAN using explain('executionStats')">
      <p className="muted">The same approved-loans query runs twice. Numbers are measured live on your database.</p>
      <button className="primary" onClick={test} disabled={loading}>{loading ? 'Benchmarking…' : 'Run benchmark'}</button>
      {error && <p className="error">{error}</p>}
    </Panel>
    {data && <div className="grid-2">
      <Result title="Indexed query" sub="Compound index hint" r={data.indexed} tone="good"/>
      <Result title="Collection scan" sub="Forced $natural scan" r={data.collection} tone="bad"/>
      <p className="muted span-all">{data.note}</p>
    </div>}
  </>;
}

export function Reports() {
  const {data, error, loading} = useData('/reports/summary');
  return (
    <Loading {...{error, loading}}>
      {data && (
        <Panel title="Executive summary" sub={'Generated ' + new Date(data.generatedAt).toLocaleString('en-IN')} action={!DEMO && <button className="secondary" onClick={() => window.print()}><Download size={16}/> Print / Save PDF</button>}>
          <div className="report">
            <div className="report-title"><div className="brand-mark"><Landmark size={22}/></div><div><h2>{APP_NAME}</h2><p className="muted">Executive portfolio report</p></div></div>
            <div className="stats three">
              <Stat title="Total applications" value={data.total.toLocaleString('en-IN')} icon={Landmark}/>
              <Stat title="Overdue installments" value={data.overdue.count.toLocaleString('en-IN')} icon={Activity} tone="pink"/>
              <Stat title="Overdue amount" value={currency(data.overdue.amount)} icon={Wallet} tone="amber"/>
            </div>
            <h3>Loan status summary</h3>
            <Table rows={data.statuses} rowKey={s => s._id} columns={[
              {label: 'Status', render: s => <Tag tone={statusTone(s._id)}>{s._id}</Tag>},
              {label: 'Count', render: s => s.count.toLocaleString('en-IN')},
              {label: 'Principal', render: s => currency(s.amount)}
            ]}/>
            <p className="muted small">Demonstration project using synthetic data. Not for real lending decisions.</p>
          </div>
        </Panel>
      )}
    </Loading>
  );
}

export function Audit() {
  const {data, error, loading} = useData('/audit');
  return (
    <Panel title="Activity log" sub="Latest 100 authenticated actions">
      <Loading {...{error, loading}}>
        {data && <Table rows={data} rowKey={x => x._id} empty="No activity yet." columns={[
          {label: 'When', render: x => new Date(x.createdAt).toLocaleString('en-IN')},
          {label: 'Who', render: x => x.actor?.name || '—'},
          {label: 'Action', render: x => <Tag tone="info">{x.action}</Tag>},
          {label: 'Entity', render: x => x.entity},
          {label: 'Details', render: x => x.detail || x.entityId}
        ]}/>}
      </Loading>
    </Panel>
  );
}
