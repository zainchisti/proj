import {createContext, useContext, useEffect, useState} from 'react';

export const APP_NAME = 'LendFlow';
export const LOAN_TYPES = ['Personal', 'Home', 'Vehicle', 'Education', 'Business'];
export const LOAN_STATUSES = ['pending', 'approved', 'rejected', 'closed'];

export const currency = n => '₹' + Number(n || 0).toLocaleString('en-IN', {maximumFractionDigits: 0});
export const fmtDate = d => (d ? new Date(d).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}) : '—');
export const compact = n => '₹' + Intl.NumberFormat('en-IN', {notation: 'compact', maximumFractionDigits: 1}).format(Number(n || 0));

export const PALETTES = {
  light: {series: ['#4f46e5', '#f59e0b', '#10b981', '#ec4899', '#0ea5e9'], grid: '#e8e8f0', axis: '#6b7280', tooltip: {background: '#ffffff', border: '1px solid #e2e2ec', borderRadius: 10, color: '#111827'}},
  dark: {series: ['#818cf8', '#fbbf24', '#34d399', '#f472b6', '#38bdf8'], grid: '#262a3f', axis: '#9ca3af', tooltip: {background: '#181b2e', border: '1px solid #2f3450', borderRadius: 10, color: '#e5e7eb'}}
};

export const ThemeContext = createContext({theme: 'light', palette: PALETTES.light, toggle: () => {}});
export const usePalette = () => useContext(ThemeContext).palette;

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } }
};
export {storage};

export async function api(path, options = {}) {
  const token = storage.get('lf_token');
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : {'Content-Type': 'application/json'}),
      ...(token ? {Authorization: 'Bearer ' + token} : {}),
      ...options.headers
    }
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && token) window.dispatchEvent(new Event('lf:logout'));
  if (!res.ok) throw Error(json.error || 'Request failed');
  return json;
}

export async function download(path, filename) {
  const res = await fetch('/api' + path, {headers: {Authorization: 'Bearer ' + storage.get('lf_token')}});
  if (!res.ok) throw Error((await res.json().catch(() => ({}))).error || 'Export failed');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), {href: url, download: filename});
  a.click();
  URL.revokeObjectURL(url);
}

export function useData(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!path) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    api(path)
      .then(d => { if (active) { setData(d); setError(''); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, ...deps]);
  return {data, error, loading};
}

export function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return debounced;
}
