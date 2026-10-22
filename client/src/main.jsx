import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutDashboard, Users, Landmark, Calculator, Wallet, BarChart3, Database, Upload, FileText, Activity, LogOut, Menu, ShieldCheck, Clock, UserCog, Settings as SettingsIcon, Moon, Sun, TrendingUp, Zap, Lock} from 'lucide-react';
import {api, storage, APP_NAME, PALETTES, ThemeContext, DEMO} from './lib.js';
import {ConfirmHost} from './components.jsx';
import {Overview, Customers, Loans, Repayments, Analytics, DataImport, QueryLab, Reports, Audit} from './pages.jsx';
import {LoanTools, Collections, Team, Settings} from './tools.jsx';
import './style.css';

const NAV = [
  {group: 'Main', items: [
    {name: 'Overview', icon: LayoutDashboard, sub: 'Your lending portfolio at a glance'},
    {name: 'Customers', icon: Users, sub: 'Borrower directory and profiles'},
    {name: 'Loans', icon: Landmark, sub: 'Applications, approvals and schedules'},
    {name: 'Repayments', icon: Wallet, sub: 'Record EMI payments'},
    {name: 'Collections', icon: Clock, sub: 'Overdue and upcoming installments'}
  ]},
  {group: 'Insights', items: [
    {name: 'Loan Tools', icon: Calculator, sub: 'EMI, eligibility and prepayment calculators'},
    {name: 'Analytics', icon: BarChart3, sub: 'Aggregations across the portfolio'},
    {name: 'Reports', icon: FileText, sub: 'Printable executive summary'}
  ]},
  {group: 'Admin', admin: true, items: [
    {name: 'Data Import', icon: Upload, sub: 'Bulk CSV customer import'},
    {name: 'Query Lab', icon: Database, sub: 'MongoDB index benchmarking'},
    {name: 'Team', icon: UserCog, sub: 'Manage staff accounts'},
    {name: 'Audit Log', icon: Activity, sub: 'Who did what, and when'}
  ]},
  {group: 'Account', items: [
    {name: 'Settings', icon: SettingsIcon, sub: 'Profile, appearance and password'}
  ]}
];

function initialTheme() {
  const saved = storage.get('lf_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  const host = document.documentElement.dataset.theme;
  if (host === 'light' || host === 'dark') return host;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(storage.get('lf_user') || 'null'); } catch { return null; } });
  const [page, setPage] = useState(() => storage.get('lf_page') || 'Overview');
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => { document.documentElement.dataset.theme = theme; storage.set('lf_theme', theme); }, [theme]);
  useEffect(() => { storage.set('lf_page', page); }, [page]);
  useEffect(() => {
    const onLogout = () => logout();
    window.addEventListener('lf:logout', onLogout);
    return () => window.removeEventListener('lf:logout', onLogout);
  }, []);

  const themeValue = useMemo(() => ({theme, palette: PALETTES[theme], toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}), [theme]);
  const toastTimer = useRef(null);
  const notify = (message, tone = 'error') => {
    clearTimeout(toastTimer.current);
    setToast({message, tone});
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };
  const run = async fn => {
    setBusy(true);
    try { await fn(); setRefresh(x => x + 1); } catch (e) { notify(e.message); } finally { setBusy(false); }
  };
  function logout() {
    storage.remove('lf_token');
    storage.remove('lf_user');
    setUser(null);
  }

  if (!user) return <ThemeContext.Provider value={themeValue}><Login onLogin={setUser} theme={theme} toggleTheme={themeValue.toggle}/></ThemeContext.Provider>;

  const isAdmin = user.role === 'admin';
  const groups = NAV.filter(g => !g.admin || isAdmin);
  const current = groups.flatMap(g => g.items).find(i => i.name === page) || NAV[0].items[0];
  const go = name => { setPage(name); setMenu(false); };
  const shared = {run, busy, refresh, notify, admin: isAdmin};
  const pages = {
    'Overview': <Overview key={refresh} go={go}/>,
    'Customers': <Customers {...shared}/>,
    'Loans': <Loans {...shared}/>,
    'Repayments': <Repayments {...shared}/>,
    'Collections': <Collections {...shared}/>,
    'Loan Tools': <LoanTools/>,
    'Analytics': <Analytics/>,
    'Reports': <Reports/>,
    'Data Import': <DataImport {...shared}/>,
    'Query Lab': <QueryLab/>,
    'Team': <Team {...shared}/>,
    'Audit Log': <Audit/>,
    'Settings': <Settings user={user} theme={theme} toggleTheme={themeValue.toggle} {...shared}/>
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <div className="shell">
        {menu && <div className="scrim" onClick={() => setMenu(false)}/>}
        <aside className={'sidebar' + (menu ? ' open' : '')}>
          <Brand/>
          <nav>
            {groups.map(g => (
              <div key={g.group} className="nav-group">
                <span className="nav-caption">{g.group}</span>
                {g.items.map(({name, icon: Icon}) => (
                  <button key={name} className={'nav-item' + (current.name === name ? ' active' : '')} onClick={() => go(name)}>
                    <Icon size={18}/>{name}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-foot">
            <div className="me">
              <div className="avatar">{user.name[0]}</div>
              <div><b>{user.name}</b><small>{user.role}</small></div>
              <button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button>
            </div>
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <button className="icon-btn mobile-only" onClick={() => setMenu(true)} aria-label="Open menu"><Menu/></button>
            <div className="title">
              <h1>{current.name}</h1>
              <p>{current.sub}</p>
            </div>
            <div className="topbar-right">
              {DEMO && <span className="demo-pill">Demo data</span>}
              <span className="date">{new Date().toLocaleDateString('en-IN', {weekday: 'short', day: 'numeric', month: 'short'})}</span>
              <button className="icon-btn bordered" onClick={themeValue.toggle} title="Toggle theme" aria-label="Toggle theme">{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
            </div>
          </header>
          <div className="content" key={current.name}>{pages[current.name]}</div>
        </main>
        {toast && <div className={'toast ' + toast.tone}>{toast.message}</div>}
        <ConfirmHost/>
      </div>
    </ThemeContext.Provider>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><Landmark size={20}/></div>
      <div><strong>{APP_NAME}</strong><small>Smart lending suite</small></div>
    </div>
  );
}

function Login({onLogin, theme, toggleTheme}) {
  const [email, setEmail] = useState('admin@lendflow.local');
  const [password, setPassword] = useState(DEMO ? 'demo12345' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await api('/auth/login', {method: 'POST', body: JSON.stringify({email, password})});
      storage.set('lf_token', r.token);
      storage.set('lf_user', JSON.stringify(r.user));
      onLogin(r.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="login">
      <div className="login-art">
        <Brand/>
        <div>
          <span className="eyebrow light">Lending, simplified</span>
          <h2>Approve faster.<br/>Collect smarter.</h2>
          <p>{APP_NAME} brings applications, risk checks, repayments and collections into one clear workspace.</p>
          <div className="features">
            <div><TrendingUp size={18}/><span>Live portfolio analytics</span></div>
            <div><Zap size={18}/><span>Instant eligibility checks</span></div>
            <div><Lock size={18}/><span>Role-based secure access</span></div>
          </div>
        </div>
        <small>© {new Date().getFullYear()} {APP_NAME} · Demo with synthetic data</small>
      </div>
      <div className="login-side">
        <button className="icon-btn bordered theme-corner" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
        <form className="login-form" onSubmit={submit}>
          <div className="login-icon"><ShieldCheck size={26}/></div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to your {APP_NAME} workspace.</p>
          <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username"/></label>
          <label>Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password"/></label>
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          {DEMO
            ? <div className="demo-note"><b>Online demo.</b> Sample data is kept in this browser. Admin: admin@lendflow.local · Officer: officer@lendflow.local · Password: demo12345</div>
            : <small className="muted center">Admin credentials are set in server/.env before seeding.</small>}
        </form>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
