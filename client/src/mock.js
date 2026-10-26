// In-browser stand-in for the Express API, used by the demo build (VITE_DEMO=1).
// Data is generated with a fixed seed and kept in this browser's localStorage.
import {emi, schedule, riskScore, money, eligibility, prepayment} from '../../server/src/logic.js';

const KEY = 'lf_demo_db_v1';
const DAY = 86400000;
const TYPES = ['Personal', 'Home', 'Vehicle', 'Education', 'Business'];
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kochi', 'Jaipur', 'Ahmedabad', 'Kolkata'];
const FIRST = ['Aarav', 'Ananya', 'Rahul', 'Meera', 'Vikram', 'Sara', 'Rohan', 'Priya', 'Arjun', 'Kavya', 'Ishaan', 'Diya', 'Kabir', 'Nisha', 'Aditya', 'Sneha', 'Farhan', 'Pooja', 'Siddharth', 'Neha', 'Manav', 'Riya', 'Karthik', 'Zoya', 'Varun', 'Aisha', 'Nikhil', 'Tanvi', 'Harsh', 'Divya'];
const LAST = ['Sharma', 'Rao', 'Mehta', 'Nair', 'Shah', 'Khan', 'Iyer', 'Reddy', 'Gupta', 'Patel', 'Das', 'Menon', 'Kulkarni', 'Singh', 'Joshi', 'Bose', 'Pillai', 'Verma', 'Chopra', 'Hegde'];

const id = () => Array.from({length: 24}, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate() {
  const rand = rng(20261022);
  const pick = a => a[Math.floor(rand() * a.length)];
  const now = Date.now();
  const users = [
    {_id: id(), name: 'LendFlow Admin', email: 'admin@lendflow.local', role: 'admin', password: 'demo12345', createdAt: now - 200 * DAY},
    {_id: id(), name: 'Priya Officer', email: 'officer@lendflow.local', role: 'officer', password: 'demo12345', createdAt: now - 150 * DAY}
  ];
  const customers = [], loans = [], repayments = [];
  for (let i = 0; i < 300; i++) {
    const first = pick(FIRST), last = pick(LAST);
    customers.push({
      _id: id(), name: `${first} ${last}`, email: `${first}.${last}${i}@example.test`.toLowerCase(),
      phone: '9' + String(Math.floor(rand() * 1e9)).padStart(9, '0'), city: pick(CITIES),
      monthlyIncome: 25000 + Math.round(rand() * 175) * 1000, existingEMI: Math.round(rand() * 12) * 1000,
      creditScore: 480 + Math.floor(rand() * 400), employment: pick(['Salaried', 'Salaried', 'Self-employed', 'Business']),
      createdAt: now - Math.floor(rand() * 365) * DAY
    });
  }
  for (const c of customers) {
    const principal = pick([50000, 100000, 250000, 500000, 1000000, 2500000]);
    const annualRate = pick([7.5, 9, 10.5, 12, 14, 17]);
    const months = pick([12, 24, 36, 48, 60]);
    const payment = emi(principal, annualRate, months), risk = riskScore(c, payment);
    const createdAt = now - Math.floor(rand() * 360) * DAY;
    let status = pick(['pending', 'approved', 'approved', 'approved', 'rejected']);
    if (status === 'pending' && now - createdAt > 45 * DAY) status = 'approved';
    const loan = {_id: id(), customer: c._id, type: pick(TYPES), principal, annualRate, months, emi: payment, risk: risk.level, dti: risk.dti, status, notes: '', createdAt, totalPaid: 0, paid: []};
    if (status === 'approved') {
      loan.approvedAt = createdAt + Math.floor(rand() * 7 + 1) * DAY;
      const behind = rand() < 0.25 ? 1 + Math.floor(rand() * 3) : 0; // a quarter of borrowers fall behind
      const rows = schedule(principal, annualRate, months, new Date(loan.approvedAt));
      const due = rows.filter(r => r.dueDate.getTime() < now).length;
      for (const r of rows.slice(0, Math.max(0, due - behind))) {
        const paidAt = r.dueDate.getTime() - Math.floor(rand() * 4) * DAY;
        loan.paid.push([r.installment, paidAt]);
        loan.totalPaid = money(loan.totalPaid + r.amount);
        repayments.push({_id: id(), loan: loan._id, installment: r.installment, amount: r.amount, paidAt, recordedBy: users[1]._id});
      }
      if (loan.paid.length === months) loan.status = 'closed';
    }
    loans.push(loan);
  }
  return {customers, loans, repayments, users, jobs: [], audit: []};
}

let db;
function load() {
  if (db) return db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db?.loans) db = generate();
  return db;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage unavailable: keep in memory */ }
}
export function resetDemo() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  db = null;
  load();
}

const fail = (message, status = 400) => { throw Object.assign(Error(message), {status}); };
const customerById = cid => db.customers.find(c => c._id === cid);
const loanById = lid => db.loans.find(l => l._id === lid) || fail('Loan not found', 404);
function installments(l) {
  if (!l.approvedAt) return [];
  const paid = new Map(l.paid);
  return schedule(l.principal, l.annualRate, l.months, new Date(l.approvedAt)).map(r => (paid.has(r.installment) ? {...r, status: 'paid', paidAt: new Date(paid.get(r.installment))} : r));
}
const publicLoan = (l, fields) => {
  const {paid, ...rest} = l;
  const c = customerById(l.customer);
  return {...rest, customer: c && (fields ? Object.fromEntries(['_id', ...fields].map(k => [k, c[k]])) : c)};
};
const group = (items, key, extra = () => ({})) => {
  const out = new Map();
  for (const it of items) {
    const k = key(it);
    const g = out.get(k) || {_id: k, count: 0, amount: 0};
    g.count++; g.amount += it.principal ?? 0;
    Object.assign(g, extra(g, it));
    out.set(k, g);
  }
  return [...out.values()];
};
let session = null;
function log(action, entity, entityId, detail = '') {
  db.audit.unshift({_id: id(), actor: session?._id, action, entity, entityId: String(entityId), detail, createdAt: Date.now()});
  db.audit.length = Math.min(db.audit.length, 200);
}
const admin = () => { if (session?.role !== 'admin') fail('Admin access required', 403); };
function pageOf(items, q) {
  const page = Math.max(1, Number(q.get('page')) || 1);
  return {items: items.slice((page - 1) * 20, page * 20), total: items.length};
}
function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/).map(line => {
    const cells = []; let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch; }
      else if (ch === '"') quoted = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return cells.map(s => s.trim());
  });
  const header = rows.shift() || [];
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const routes = [
  ['POST', /^\/auth\/login$/, (b) => {
    const u = db.users.find(x => x.email === String(b.email || '').toLowerCase());
    if (!u || u.password !== String(b.password || '')) fail('Invalid credentials. In the demo, use the password demo12345.', 401);
    session = u;
    return {token: 'demo-' + u._id, user: {name: u.name, role: u.role, email: u.email}};
  }],
  ['PATCH', /^\/auth\/password$/, (b) => {
    if (String(b.next || '').length < 10) fail('New password must be at least 10 characters');
    if (session.password !== b.current) fail('Current password is incorrect', 401);
    session.password = b.next; log('password', 'user', session._id);
    return {ok: true};
  }],
  ['GET', /^\/users$/, () => { admin(); return db.users.map(({password, ...u}) => u).sort((a, b) => b.createdAt - a.createdAt); }],
  ['POST', /^\/users$/, (b) => {
    admin();
    if (!b.name || !b.email || String(b.password || '').length < 10) fail('Name, email and a 10+ character password are required');
    if (db.users.some(u => u.email === b.email.toLowerCase())) fail('Duplicate value');
    const u = {_id: id(), name: b.name, email: b.email.toLowerCase(), role: b.role, password: b.password, createdAt: Date.now()};
    db.users.push(u); log('create', 'user', u._id, u.email);
    return {...u, password: undefined};
  }],
  ['GET', /^\/customers$/, (b, q) => {
    const s = String(q.get('search') || '').toLowerCase();
    const items = db.customers.filter(c => !s || c.name.toLowerCase().includes(s) || c.email.includes(s)).sort((a, b) => b.createdAt - a.createdAt);
    return pageOf(items, q);
  }],
  ['POST', /^\/customers$/, (b) => {
    if (!b.name || !b.email || !(b.monthlyIncome >= 0)) fail('Name, email and income are required');
    const c = {...b, _id: id(), email: b.email.toLowerCase(), createdAt: Date.now()};
    db.customers.push(c); log('create', 'customer', c._id);
    return c;
  }],
  ['PUT', /^\/customers\/(\w+)$/, (b, q, [cid]) => {
    const c = customerById(cid) || fail('Not found', 404);
    for (const k of ['name', 'email', 'phone', 'city', 'monthlyIncome', 'existingEMI', 'creditScore', 'employment']) if (b[k] !== undefined) c[k] = b[k];
    log('update', 'customer', c._id);
    return c;
  }],
  ['DELETE', /^\/customers\/(\w+)$/, (b, q, [cid]) => {
    admin();
    if (db.loans.some(l => l.customer === cid)) fail('This customer has loans and cannot be deleted', 409);
    db.customers = db.customers.filter(c => c._id !== cid); log('delete', 'customer', cid);
    return {ok: true};
  }],
  ['GET', /^\/customers\/(\w+)\/profile$/, (b, q, [cid]) => {
    const customer = customerById(cid) || fail('Not found', 404);
    const loans = db.loans.filter(l => l.customer === cid).sort((a, b) => b.createdAt - a.createdAt).map(l => publicLoan(l, []));
    const active = loans.filter(l => l.status === 'approved');
    return {customer, loans, summary: {loans: loans.length, active: active.length, borrowed: active.reduce((s, l) => s + l.principal, 0), paid: loans.reduce((s, l) => s + (l.totalPaid || 0), 0), monthlyEMI: active.reduce((s, l) => s + l.emi, 0)}};
  }],
  ['GET', /^\/loans$/, (b, q) => {
    const status = q.get('status'), type = q.get('type');
    const items = db.loans.filter(l => (!status || l.status === status) && (!type || l.type === type)).sort((a, b) => b.createdAt - a.createdAt);
    const pg = pageOf(items, q);
    return {...pg, items: pg.items.map(l => publicLoan(l, ['name', 'email', 'creditScore']))};
  }],
  ['POST', /^\/loans$/, (b) => {
    const c = customerById(b.customer) || fail('Customer not found', 404);
    const payment = emi(b.principal, b.annualRate, b.months), risk = riskScore(c, payment);
    const l = {_id: id(), customer: c._id, type: b.type, principal: b.principal, annualRate: b.annualRate, months: b.months, emi: payment, risk: risk.level, dti: risk.dti, status: 'pending', notes: b.notes, createdAt: Date.now(), totalPaid: 0, paid: []};
    db.loans.push(l); log('apply', 'loan', l._id);
    return publicLoan(l, ['name']);
  }],
  ['GET', /^\/loans\/(\w+)$/, (b, q, [lid]) => { const l = loanById(lid); return {...publicLoan(l), installments: installments(l)}; }],
  ['PATCH', /^\/loans\/(\w+)\/status$/, (b, q, [lid]) => {
    admin();
    const l = loanById(lid);
    if (!['approved', 'rejected'].includes(b.status)) fail('Invalid decision');
    if (l.status !== 'pending') fail('Only pending loans can be decided', 409);
    l.status = b.status;
    if (b.status === 'approved') l.approvedAt = Date.now();
    log(b.status, 'loan', l._id);
    return publicLoan(l);
  }],
  ['POST', /^\/loans\/(\w+)\/repayments$/, (b, q, [lid]) => {
    const l = loanById(lid);
    if (l.status !== 'approved') fail('Loan is not active', 409);
    const item = installments(l).find(i => i.installment === Number(b.installment));
    if (!item || item.status === 'paid') fail('Installment unavailable', 409);
    l.paid.push([item.installment, Date.now()]);
    l.totalPaid = money(l.totalPaid + item.amount);
    if (l.paid.length === l.months) l.status = 'closed';
    db.repayments.push({_id: id(), loan: l._id, installment: item.installment, amount: item.amount, paidAt: Date.now(), recordedBy: session._id});
    log('repayment', 'loan', l._id, `Installment ${item.installment}`);
    return {ok: true, amount: item.amount};
  }],
  ['GET', /^\/repayments$/, () => [...db.repayments].sort((a, b) => b.paidAt - a.paidAt).slice(0, 100).map(r => {
    const l = db.loans.find(x => x._id === r.loan);
    return {...r, loan: l && {_id: l._id, customer: {name: customerById(l.customer)?.name}}};
  })],
  ['GET', /^\/installments\/due$/, (b, q) => {
    const days = Math.min(90, Math.max(1, Number(q.get('days')) || 30)), now = Date.now(), until = now + days * DAY;
    const rows = [];
    for (const l of db.loans.filter(x => x.status === 'approved')) {
      const c = customerById(l.customer);
      for (const i of installments(l)) {
        if (i.status === 'pending' && i.dueDate.getTime() <= until) rows.push({loan: l._id, type: l.type, customer: c?.name, phone: c?.phone, installment: i.installment, dueDate: i.dueDate, amount: i.amount});
      }
    }
    return rows.sort((a, b) => a.dueDate - b.dueDate).slice(0, 200).map(r => ({...r, overdue: r.dueDate.getTime() < now, daysLate: Math.max(0, Math.floor((now - r.dueDate.getTime()) / DAY))}));
  }],
  ['POST', /^\/emi$/, (b) => {
    const payment = emi(b.principal, b.annualRate, b.months);
    return {emi: payment, total: money(payment * b.months), interest: money(payment * b.months - b.principal), schedule: schedule(b.principal, b.annualRate, b.months)};
  }],
  ['POST', /^\/eligibility$/, (b) => eligibility(b.customer ? customerById(b.customer) || fail('Customer not found', 404) : b, b.annualRate, Number(b.months))],
  ['POST', /^\/prepayment$/, (b) => prepayment(b.balance, b.annualRate, Number(b.months), b.extra)],
  ['GET', /^\/analytics\/overview$/, () => {
    const L = db.loans;
    const approved = L.filter(l => ['approved', 'closed'].includes(l.status));
    const month = t => new Date(t).toISOString().slice(0, 7);
    return {
      stats: {total: L.length, principal: L.reduce((s, l) => s + l.principal, 0), approvedValue: approved.reduce((s, l) => s + l.principal, 0), collected: L.reduce((s, l) => s + l.totalPaid, 0), avgEMI: L.length ? L.reduce((s, l) => s + l.emi, 0) / L.length : 0},
      byType: group(L, l => l.type).sort((a, b) => b.count - a.count),
      byStatus: group(L, l => l.status).map(({_id, count}) => ({_id, count})),
      monthly: group(L, l => month(l.createdAt)).sort((a, b) => a._id.localeCompare(b._id)).slice(-12),
      risk: group(L, l => l.risk).map(({_id, count}) => ({_id, count}))
    };
  }],
  ['GET', /^\/analytics\/advanced$/, () => {
    const bounds = [0, 5, 10, 15, 20, 30, 101];
    const band = r => bounds[bounds.findIndex((x, i) => r >= x && r < bounds[i + 1])];
    return {
      interestBands: group(db.loans, l => band(l.annualRate)).sort((a, b) => a._id - b._id),
      topCities: group(db.loans, l => customerById(l.customer)?.city || 'Unknown').sort((a, b) => b.count - a.count).slice(0, 10),
      daily: group(db.loans, l => new Date(l.createdAt).getDay() + 1).map(({_id, count}) => ({_id, count})).sort((a, b) => a._id - b._id)
    };
  }],
  ['GET', /^\/analytics\/performance$/, () => {
    admin();
    // Browser stand-in for MongoDB explain(): a prebuilt status index versus a full scan.
    const index = new Map();
    for (const l of db.loans) { if (!index.has(l.status)) index.set(l.status, []); index.get(l.status).push(l); }
    const reps = 2000;
    let t = performance.now(), hits;
    for (let i = 0; i < reps; i++) hits = index.get('approved') || [];
    const indexedMs = performance.now() - t;
    t = performance.now();
    let scanned;
    for (let i = 0; i < reps; i++) scanned = db.loans.filter(l => l.status === 'approved');
    const scanMs = performance.now() - t;
    return {
      indexed: {ms: +indexedMs.toFixed(2), examined: hits.length, keys: hits.length, returned: hits.length},
      collection: {ms: +scanMs.toFixed(2), examined: db.loans.length, keys: 0, returned: scanned.length},
      note: `Online demo: measured in your browser over ${reps} runs of the query. With MongoDB the same page uses explain('executionStats').`
    };
  }],
  ['POST', /^\/import\/customers$/, async (b) => {
    admin();
    const file = b instanceof FormData ? b.get('file') : null;
    if (!file) fail('CSV file required');
    if (file.size > 5 * 1024 * 1024) fail('File is larger than 5 MB');
    let processed = 0, inserted = 0, rejected = 0; const errors = [];
    for (const row of parseCSV(await file.text())) {
      processed++;
      const monthlyIncome = Number(row.monthlyIncome), creditScore = Number(row.creditScore || 650);
      if (!row.name || !row.email || !Number.isFinite(monthlyIncome) || monthlyIncome < 0 || creditScore < 300 || creditScore > 900) { rejected++; if (errors.length < 20) errors.push(`Row ${processed}: invalid customer`); continue; }
      db.customers.push({_id: id(), name: row.name, email: row.email.toLowerCase(), phone: row.phone || '', city: row.city || '', monthlyIncome, creditScore, existingEMI: Number(row.existingEMI) || 0, employment: row.employment || 'Salaried', createdAt: Date.now()});
      inserted++;
    }
    const job = {_id: id(), filename: file.name, processed, inserted, rejected, errors, createdAt: Date.now()};
    db.jobs.unshift(job); log('import', 'customers', job._id);
    return job;
  }],
  ['GET', /^\/import\/jobs$/, () => { admin(); return db.jobs.slice(0, 30); }],
  ['GET', /^\/audit$/, () => { admin(); return db.audit.slice(0, 100).map(a => ({...a, actor: db.users.find(u => u._id === a.actor) && {name: db.users.find(u => u._id === a.actor).name}})); }],
  ['GET', /^\/reports\/summary$/, () => {
    const now = Date.now();
    const overdue = {count: 0, amount: 0};
    for (const l of db.loans.filter(x => x.status === 'approved')) for (const i of installments(l)) if (i.status === 'pending' && i.dueDate.getTime() < now) { overdue.count++; overdue.amount += i.amount; }
    return {generatedAt: now, total: db.loans.length, statuses: group(db.loans, l => l.status), overdue};
  }]
];

export async function handle(path, options = {}) {
  load();
  const url = new URL(path, 'http://demo');
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body instanceof FormData ? options.body : options.body ? JSON.parse(options.body) : {};
  if (!session) {
    const token = (() => { try { return localStorage.getItem('lf_token'); } catch { return null; } })();
    session = db.users.find(u => token === 'demo-' + u._id) || null;
  }
  await new Promise(r => setTimeout(r, 120));
  if (!session && url.pathname !== '/auth/login') fail('Please sign in again', 401);
  for (const [m, re, fn] of routes) {
    const match = m === method && url.pathname.match(re);
    if (!match) continue;
    try {
      const result = await fn(body, url.searchParams, match.slice(1));
      if (method !== 'GET') save();
      return JSON.parse(JSON.stringify(result));
    } catch (e) {
      throw e.status ? e : Object.assign(Error(e.message || 'Request failed'), {status: 400});
    }
  }
  fail('Not available in the online demo', 404);
}
