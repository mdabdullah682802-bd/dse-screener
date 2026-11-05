import React, { useState, useEffect, useMemo, useCallback } from 'react';
import shariah from './src/shariah_codes.json';
import {
  TABS, TAB_HELP, derive, whyFeatured, healthSummary, marketSummary,
  dataStatus, fmtDhaka, agoText, f, sg,
} from './src/analysis.js';

// আসল ডেটার ঠিকানা (GitHub Actions প্রতিদিন/বাজার চলাকালীন আপডেট করে)
const DATA_URL = 'https://raw.githubusercontent.com/mdabdullah682802-bd/dse-screener/data/stocks.json';
const CACHE_KEY = 'dse_screener_cache_v1';
const SHARIAH_CODES = new Set(shariah.codes);
const BLOCKED_SECTORS = ['bank', 'conventional bank', 'mixed bank', 'islamic window', 'insurance', 'nbfi', 'financial institution', 'tobacco', 'alcohol', 'gambling'];

// দ্বিতীয় তালা: তালিকার বাইরের কিছু দেখানো হবে না
const isStrictlyShariah = (s) => SHARIAH_CODES.has(s.code) && !BLOCKED_SECTORS.includes(String(s.sector || '').toLowerCase());

const SORTS = [
  { id: 'code', label: 'কোড (A–Z)', fn: (a, b) => a.s.code.localeCompare(b.s.code) },
  { id: 'change', label: 'আজকের পরিবর্তন', fn: (a, b) => (b.s.changePct ?? -999) - (a.s.changePct ?? -999) },
  { id: 'week', label: '১ সপ্তাহের পরিবর্তন', fn: (a, b) => (a.d.week ?? 999) - (b.d.week ?? 999) },
  { id: 'yield', label: 'ডিভিডেন্ড ইল্ড', fn: (a, b) => (b.d.yieldNow ?? -1) - (a.d.yieldNow ?? -1) },
  { id: 'mcap', label: 'বাজার মূলধন', fn: (a, b) => (b.s.marketCapMn ?? 0) - (a.s.marketCapMn ?? 0) },
  { id: 'price', label: 'দাম (কম থেকে বেশি)', fn: (a, b) => (a.s.ltp ?? 1e9) - (b.s.ltp ?? 1e9) },
];

const TONE = {
  good: { icon: '✅', box: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' },
  warn: { icon: '⚠️', box: 'bg-amber-500/10 border-amber-500/20 text-amber-100' },
  info: { icon: 'ℹ️', box: 'bg-slate-800/60 border-slate-700 text-slate-200' },
};
const DOT = { good: 'bg-emerald-400', idle: 'bg-sky-400', warn: 'bg-amber-400' };
const CATCLS = {
  A: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  B: 'bg-sky-500/10 text-sky-300 border border-sky-500/20',
  Z: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
};
const catCls = (c) => CATCLS[c] || 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
const chgCls = (x) => (x == null ? 'text-slate-400' : x >= 0 ? 'text-emerald-400' : 'text-rose-400');

function Spark({ data }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), W = 300, H = 70;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - 4 - ((v - min) / (max - min || 1)) * (H - 8)}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
      <polyline points={pts} fill="none" stroke={up ? '#34d399' : '#fb7185'} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function RangeBar({ s, d }) {
  if (d.pos52 == null) return null;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-slate-800">
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" style={{ left: `calc(${d.pos52}% - 6px)` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>৫২সপ্তাহ সর্বনিম্ন ৳{f(s.low52)}</span><span>সর্বোচ্চ ৳{f(s.high52)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, cls = 'text-slate-200' }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
      <span className="text-[10px] text-slate-500 block">{label}</span>
      <span className={`text-sm font-semibold ${cls}`}>{value}</span>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('all');
  const [sortId, setSortId] = useState('code');
  const [limit, setLimit] = useState(40);
  const [detail, setDetail] = useState(null);
  const [openWhy, setOpenWhy] = useState({});
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`সার্ভার উত্তর: ${res.status}`);
      const json = await res.json();
      if (!json.stocks || !json.meta) throw new Error('ডেটার গঠন ঠিক নয়');
      setData(json);
      setError(null);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(json)); } catch { /* জায়গা নেই */ }
    } catch (e) {
      setError(e.message || 'ডেটা আনা যায়নি');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);
    const tick = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    const vis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(refresh); clearInterval(tick); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  const meta = data?.meta;
  const stocks = useMemo(() => (data?.stocks || []).filter(isStrictlyShariah), [data]);
  const rows = useMemo(() => stocks.map((s) => ({ s, d: derive(s) })), [stocks]);
  const sectors = useMemo(() => [...new Set(stocks.map((s) => s.sector).filter(Boolean))].sort(), [stocks]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, rows.filter((r) => t.test(r.d)).length])), [rows]);
  const market = useMemo(() => marketSummary(stocks), [stocks]);

  const shown = useMemo(() => {
    const t = TABS.find((x) => x.id === tab);
    const q = query.trim().toLowerCase();
    const sortFn = SORTS.find((x) => x.id === sortId).fn;
    return rows
      .filter((r) => t.test(r.d))
      .filter((r) => sector === 'all' || r.s.sector === sector)
      .filter((r) => !q || r.s.code.toLowerCase().includes(q) || (r.s.name || '').toLowerCase().includes(q))
      .sort(sortFn);
  }, [rows, tab, query, sector, sortId]);

  useEffect(() => { setLimit(40); }, [tab, query, sector, sortId]);

  const status = dataStatus(meta);
  const detailRow = detail ? rows.find((r) => r.s.code === detail) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 pb-24">
      {/* হেডার */}
      <div className="max-w-6xl mx-auto mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            DSE Smart Screener (Islamic Edition)
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${DOT[status.tone]} ${status.tone === 'good' ? 'animate-pulse' : ''}`}></span> {status.label}
            </span>
            {meta && (
              <span className="text-[11px] text-slate-400">
                সর্বশেষ আপডেট: {fmtDhaka(meta.generatedAt)} · {agoText(meta.generatedAt)}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-2">
            সুদমুক্ত ও শরীয়াহ সম্মত তালিকাভিত্তিক স্টক বিশ্লেষণ, কোনো ভবিষ্যৎ পূর্বাভাস ছাড়া।
          </p>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-800/50 px-4 py-2 rounded-xl text-xs text-emerald-300">
          🔒 <b>Pure Shariah Mode</b><br />
          তালিকায় {SHARIAH_CODES.size} কোড · DSE-তে পাওয়া গেছে {stocks.length}টি<br />
          কনভেনশনাল ব্যাংক ও ইসলামিক উইন্ডো বাদ
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-5">
        {/* ডেটা নেই / ত্রুটি */}
        {!data && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
            <p className="text-slate-300 text-sm mb-2">{loading ? 'ডেটা লোড হচ্ছে...' : 'এখনো কোনো ডেটা পাওয়া যায়নি।'}</p>
            {error && <p className="text-amber-300 text-xs mb-3">সমস্যা: {error}. GitHub-এ ডেটা তৈরি না হয়ে থাকলে Actions থেকে “Update DSE data” একবার চালান।</p>}
            <button onClick={load} className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-semibold">আবার চেষ্টা করুন</button>
          </div>
        )}
        {data && error && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
            নতুন ডেটা আনা যায়নি ({error})। আগে সংরক্ষিত ডেটা দেখানো হচ্ছে।
          </div>
        )}

        {data && (
          <>
            {/* বাজার সারসংক্ষেপ */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-emerald-400 font-semibold block mb-1">📊 আজকের বাজার সারসংক্ষেপ (শরীয়াহ তালিকা)</span>
              <p className="text-sm text-slate-300">{market.text}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                {[['🔺 সর্বোচ্চ বৃদ্ধি', market.gainers, (s) => sg(s.changePct, 1), 'text-emerald-400'],
                  ['🔻 সর্বোচ্চ পতন', market.losers, (s) => sg(s.changePct, 1), 'text-rose-400'],
                  ['💹 সবচেয়ে বেশি লেনদেন', market.active, (s) => `৳${f(s.valueMn, 1)} মি.`, 'text-sky-300']].map(([title, list, fmt, cls]) => (
                  <div key={title} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-slate-500 block mb-1">{title}</span>
                    {list.map((s) => (
                      <button key={s.code} onClick={() => setDetail(s.code)} className="flex justify-between w-full py-0.5">
                        <span className="text-slate-200">{s.code}</span><span className={cls}>{fmt(s)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* ট্যাব */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-medium transition ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  {t.label} <span className="opacity-70">({counts[t.id]})</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 -mt-2">{TAB_HELP[tab]}</p>

            {/* সার্চ ও ফিল্টার */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <input type="text" placeholder="কোম্পানির নাম বা কোড (যেমন: GP, SQURPHARMA)" value={query} onChange={(e) => setQuery(e.target.value)}
                className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-emerald-500 text-slate-200" />
              <select value={sector} onChange={(e) => setSector(e.target.value)}
                className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200">
                <option value="all">সব খাত</option>
                {sectors.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <select value={sortId} onChange={(e) => setSortId(e.target.value)}
                className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200">
                {SORTS.map((x) => <option key={x.id} value={x.id}>সাজান: {x.label}</option>)}
              </select>
            </div>

            {/* কার্ড */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shown.slice(0, limit).map(({ s, d }) => (
                <div key={s.code} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <span className="text-lg font-bold text-slate-100">{s.code}</span>
                        <span className="text-xs text-slate-400 block truncate">{s.name}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${catCls(s.category)}`}>Cat: {s.category || '—'}</span>
                    </div>
                    <div className="my-3 py-2 border-y border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-500 block">বর্তমান মূল্য</span><span className="text-base font-bold text-slate-200">৳{f(s.ltp)}</span></div>
                      <div><span className="text-slate-500 block">আজ</span><span className={`font-semibold ${chgCls(s.changePct)}`}>{sg(s.changePct)}</span></div>
                      <div><span className="text-slate-500 block">১ সপ্তাহ / ১ মাস</span><span className="font-medium"><span className={chgCls(d.week)}>{sg(d.week, 1)}</span> / <span className={chgCls(d.month)}>{sg(d.month, 1)}</span></span></div>
                      <div><span className="text-slate-500 block">ডিভিডেন্ড ইল্ড / P/E</span><span className="text-slate-300 font-medium">{d.yieldNow != null ? `${f(d.yieldNow, 1)}%` : '—'} / {d.pe != null ? f(d.pe, 1) : '—'}</span></div>
                    </div>
                    <RangeBar s={s} d={d} />
                    <div className="flex flex-wrap items-center gap-1.5 my-3">
                      <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded text-[10px]">✓ শরীয়াহ তালিকাভুক্ত</span>
                      {s.sector && <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">{s.sector}</span>}
                      {d.flags.dividend && <span className="px-2 py-0.5 bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded text-[10px]">💎 {d.divYears} বছর ডিভিডেন্ড</span>}
                      {d.flags.blue && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-[10px]">🏛️ ব্লু-চিপ</span>}
                      {d.flags.drop && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded text-[10px]">📉 দাম কমেছে</span>}
                      {d.flags.upgrade && <span className="px-2 py-0.5 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded text-[10px]">⬆️ {d.upgrade.from}→{d.upgrade.to}</span>}
                      {d.flags.risk && <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded text-[10px]">⚠️ High Risk Alert{d.flags.junk ? ' · জাঙ্ক' : ''}</span>}
                    </div>
                    {openWhy[s.code] && (
                      <div className="mb-3 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 space-y-1">
                        {whyFeatured(s, d, tab).map((l, i) => <p key={i}>{l}</p>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setOpenWhy((o) => ({ ...o, [s.code]: !o[s.code] }))}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium">❓ কেন এই তালিকায়?</button>
                    <button onClick={() => setDetail(s.code)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg text-xs font-medium">✨ বিশ্লেষণ</button>
                  </div>
                </div>
              ))}
            </div>

            {shown.length > limit && (
              <button onClick={() => setLimit((l) => l + 40)} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium">
                আরও দেখান ({shown.length - limit}টি বাকি)
              </button>
            )}
            {shown.length === 0 && (
              <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl">
                <p className="text-slate-400 text-sm">এই ফিল্টারে কোনো স্টক নেই। অন্য ট্যাব বা ফিল্টার চেষ্টা করুন।</p>
              </div>
            )}
            {tab === 'upgrade' && (
              <p className="text-[11px] text-slate-500">ক্যাটাগরি পরিবর্তনের ইতিহাস {meta.categoryTrackingSince} থেকে জমা হচ্ছে, তাই শুরুতে এই তালিকা খালি থাকা স্বাভাবিক।</p>
            )}
            {meta.missingCodes?.length > 0 && (
              <p className="text-[11px] text-slate-600">DSE-র বর্তমান তালিকায় পাওয়া যায়নি: {meta.missingCodes.join(', ')}</p>
            )}
          </>
        )}
        <p className="text-center text-[11px] text-slate-500 pb-2">
          শরীয়াহ তালিকার সূত্র: Islami Bank Securities Ltd. (IBSL) · ডেটার সূত্র: Dhaka Stock Exchange। এটি ফতোয়া বা বিনিয়োগ পরামর্শ নয়; বিনিয়োগের আগে আলেম বা শরীয়াহ বোর্ডের সাথে মিলিয়ে নিন।
        </p>
      </div>

      {/* নিচের স্ট্যাটাস বার */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-2 z-40 flex items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 shrink-0 rounded-full ${DOT[status.tone]} ${status.tone === 'good' ? 'animate-pulse' : ''}`}></span>
          <span className="text-slate-300 truncate">
            {meta ? `সর্বশেষ আপডেট: ${fmtDhaka(meta.generatedAt)} (${agoText(meta.generatedAt)})` : 'ডেটা নেই'} · {status.label}
          </span>
        </div>
        <button onClick={load} disabled={loading} className="shrink-0 px-3 py-1.5 bg-emerald-600 disabled:opacity-50 rounded-lg font-semibold">
          {loading ? '...' : '🔄 রিফ্রেশ'}
        </button>
      </div>

      {/* বিশ্লেষণ মোডাল */}
      {detailRow && (() => {
        const { s } = detailRow;
        const h = healthSummary(s);
        const d = h.d;
        const sh = s.shareholding || {};
        return (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="max-w-2xl mx-auto min-h-full bg-slate-900 border-x border-slate-800 p-5 pb-16">
              <div className="flex justify-between items-start mb-4 sticky top-0 bg-slate-900 py-2 z-10">
                <div>
                  <h3 className="text-xl font-bold text-emerald-400">{s.code}</h3>
                  <p className="text-xs text-slate-400">{s.name} · {s.sector}</p>
                </div>
                <button onClick={() => setDetail(null)} className="text-slate-300 hover:text-white text-lg font-bold px-3 py-1 bg-slate-800 rounded-lg">✕</button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <Stat label="বর্তমান মূল্য" value={`৳${f(s.ltp)}`} />
                <Stat label="আজকের পরিবর্তন" value={sg(s.changePct)} cls={chgCls(s.changePct)} />
                <Stat label="ক্যাটাগরি" value={s.category || '—'} />
              </div>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                <span className="text-xs text-emerald-400 font-semibold block mb-1">🧾 এক নজরে সারসংক্ষেপ</span>
                <p className="text-sm text-slate-200">{h.head}</p>
                <p className="text-[11px] text-slate-400 mt-1">✅ {h.good}টি ইতিবাচক · ⚠️ {h.warn}টি সতর্কতা</p>
              </div>

              <div className="space-y-2 mb-5">
                <span className="text-xs text-emerald-400 font-semibold block">📊 আর্থিক স্বাস্থ্য ও বিশ্লেষণ (সহজ বাংলায়)</span>
                {h.pts.map((p, i) => (
                  <div key={i} className={`p-2.5 border rounded-lg text-xs leading-relaxed ${TONE[p.tone].box}`}>{TONE[p.tone].icon} {p.text}</div>
                ))}
              </div>

              <div className="mb-5">
                <span className="text-xs text-emerald-400 font-semibold block mb-2">📈 দামের গতি (সর্বশেষ ~৯০ ট্রেডিং দিন)</span>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <Spark data={s.spark} />
                  <div className="mt-3"><RangeBar s={s} d={d} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <Stat label="EPS (সর্বশেষ বছর)" value={d.eps != null ? `৳${f(d.eps)}` : '—'} />
                <Stat label="NAV" value={d.nav != null ? `৳${f(d.nav)}` : '—'} />
                <Stat label="P/E" value={d.pe != null ? f(d.pe, 1) : '—'} />
                <Stat label="দাম / NAV" value={d.pb != null ? f(d.pb) : '—'} />
                <Stat label="ডিভিডেন্ড ইল্ড" value={d.yieldNow != null ? `${f(d.yieldNow, 1)}%` : '—'} />
                <Stat label="বাজার মূলধন" value={s.marketCapMn ? `৳${f(s.marketCapMn / 1000, 1)} বিলিয়ন` : '—'} />
                <Stat label="মুখ্যমূল্য" value={s.faceValue ? `৳${f(s.faceValue, 0)}` : '—'} />
                <Stat label="তালিকাভুক্তি" value={s.listingYear || '—'} />
              </div>

              {s.financials?.length > 0 && (
                <div className="mb-5">
                  <span className="text-xs text-emerald-400 font-semibold block mb-2">🗓️ বছরভিত্তিক আর্থিক ও ডিভিডেন্ড ইতিহাস</span>
                  <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-lg">
                    <table className="w-full text-[11px] text-slate-300">
                      <thead><tr className="text-slate-500 text-left"><th className="p-2">সাল</th><th className="p-2">EPS</th><th className="p-2">NAV</th><th className="p-2">P/E</th><th className="p-2">ডিভিডেন্ড %</th></tr></thead>
                      <tbody>
                        {s.financials.map((r) => (
                          <tr key={r.year} className="border-t border-slate-800">
                            <td className="p-2">{r.year}</td><td className="p-2">{f(r.eps)}</td><td className="p-2">{f(r.nav)}</td>
                            <td className="p-2">{f(r.pe, 1)}</td><td className="p-2">{r.dividendPct != null ? f(r.dividendPct, 0) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">সূত্র: DSE-র অডিটেড আর্থিক সারণি। সর্বশেষ বছরে ‘—’ মানে ডিভিডেন্ড এখনো ঘোষণা/প্রকাশ হয়নি হতে পারে।</p>
                </div>
              )}

              <div className="mb-5">
                <span className="text-xs text-emerald-400 font-semibold block mb-2">🏷️ ক্যাটাগরির ইতিহাস</span>
                {s.categoryChanges?.length ? (
                  <ul className="text-xs text-slate-300 space-y-1">
                    {s.categoryChanges.map((c, i) => <li key={i}>{c.date}: {c.from} → {c.to}</li>)}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">{meta.categoryTrackingSince} থেকে ট্র্যাকিং শুরু; এর মধ্যে কোনো পরিবর্তন হয়নি (বর্তমান: {s.category || '—'})।</p>
                )}
              </div>

              {(sh.director != null || sh.public != null) && (
                <div className="mb-5">
                  <span className="text-xs text-emerald-400 font-semibold block mb-2">👥 শেয়ার মালিকানা</span>
                  <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
                    <div className="bg-emerald-500" style={{ width: `${sh.director || 0}%` }}></div>
                    <div className="bg-sky-500" style={{ width: `${sh.inst || 0}%` }}></div>
                    <div className="bg-violet-500" style={{ width: `${sh.foreign || 0}%` }}></div>
                    <div className="bg-amber-500" style={{ width: `${(sh.public || 0) + (sh.govt || 0)}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">🟩 পরিচালক {f(sh.director, 1)}% · 🟦 প্রতিষ্ঠান {f(sh.inst, 1)}% · 🟪 বিদেশি {f(sh.foreign, 1)}% · 🟧 সাধারণ/সরকারি {f((sh.public || 0) + (sh.govt || 0), 1)}%</p>
                </div>
              )}

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed">
                ⚠️ <b>নোট:</b> এই বিশ্লেষণ DSE-র প্রকাশিত বর্তমান ও বিগত ডেটা থেকে নিয়ম অনুযায়ী স্বয়ংক্রিয়ভাবে তৈরি, ভবিষ্যৎ পূর্বাভাস বা বিনিয়োগের পরামর্শ নয়। আর্থিক ডেটায় ভুল বা বিলম্ব থাকতে পারে।
                শরীয়াহ তালিকা একটি ব্রোকারেজের সূত্র থেকে নেওয়া, এটি ফতোয়া নয়।
              </div>
              <button onClick={() => setDetail(null)} className="w-full mt-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold">বন্ধ করুন</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}