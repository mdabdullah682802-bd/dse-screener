// আসল DSE ডেটা থেকে নিয়মভিত্তিক বিশ্লেষণ ও সারসংক্ষেপ (কোনো ভবিষ্যৎ পূর্বাভাস নেই)

export const CFG = {
  MIN_DIV_YEARS: 3, // ডিভিডেন্ড চ্যাম্পিয়ন: কমপক্ষে কত বছর টানা
  MIN_AVG_DIV: 5, // গত ৩ বছরের গড় ক্যাশ ডিভিডেন্ড কমপক্ষে (%)
  DROP_WEEK: 10, // দাম কমা: ১ সপ্তাহে (%)
  DROP_MONTH: 15, // দাম কমা: ১ মাসে (%)
  BUDGET_PRICE: 100,
  UPGRADE_DAYS: 180,
};

const RANK = { Z: 0, B: 1, N: 1, A: 2 };

const pct = (a, b) => (a != null && b != null && b !== 0 ? ((a - b) / b) * 100 : null);
export const f = (x, d = 2) =>
  x == null || Number.isNaN(x) ? "—" : Number(x).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
export const sg = (x, d = 2) => (x == null ? "—" : `${x >= 0 ? "+" : ""}${f(x, d)}%`);
const f0 = (x) => f(x, 0);

export function derive(s) {
  const p = s.ltp;
  const fin = s.financials || [];
  const withEps = fin.filter((x) => x.eps != null); const e0 = withEps[0];
  const e1 = withEps[1];
  const div = s.dividend || {};
  const fv = s.faceValue || 10;
  const week = pct(p, s.closeWeekAgo);
  const month = pct(p, s.closeMonthAgo);
  const m3 = pct(p, s.closeThreeMonthAgo);
  const eps = e0?.eps ?? null;
  const nav = fin.find((x) => x.nav != null)?.nav ?? null;
  const pe = p && eps && eps > 0 ? p / eps : null;
  const pb = p && nav && nav > 0 ? p / nav : null;
  const dps = div.lastPct != null ? (div.lastPct / 100) * fv : null;
  const yieldNow = p && dps != null ? (dps / p) * 100 : null;
  const payout = dps != null && e0 && div.lastYear
    ? (() => { const row = fin.find((x) => x.year === div.lastYear); return row?.eps > 0 ? (dps / row.eps) * 100 : null; })()
    : null;
  const epsGrowth = eps != null && e1?.eps > 0 ? pct(eps, e1.eps) : null;
  const pos52 = s.high52 != null && s.low52 != null && s.high52 > s.low52 && p != null
    ? Math.max(0, Math.min(100, ((p - s.low52) / (s.high52 - s.low52)) * 100)) : null;
  const fromHigh = pct(p, s.high52);
  const epsPos3 = withEps.slice(0, 3).length >= 3 && withEps.slice(0, 3).every((x) => x.eps > 0);
  const healthy = (eps ?? 0) > 0 && (nav ?? 0) > 0;
  const cat = s.category;
  const age = s.listingYear ? new Date().getFullYear() - s.listingYear : null;
  const divYears = div.years || 0;
  const dropWeek = week != null && week <= -CFG.DROP_WEEK;
  const dropMonth = month != null && month <= -CFG.DROP_MONTH;
  const upgrade = (s.categoryChanges || []).find((c) =>
    (RANK[c.to] ?? -1) > (RANK[c.from] ?? 99) && (c.to === "A" || c.to === "B") &&
    (Date.now() - new Date(c.date).getTime()) / 864e5 <= CFG.UPGRADE_DAYS);

  const flags = {
    dividend: divYears >= CFG.MIN_DIV_YEARS && (div.avg3 ?? 0) >= CFG.MIN_AVG_DIV,
    upgrade: !!upgrade,
    blue: cat === "A" && epsPos3 && divYears >= 3 && healthy && (age ?? 0) >= 5,
    drop: (cat === "A" || cat === "B") && (dropWeek || dropMonth) && healthy,
    zdip: cat === "Z" && (dropWeek || dropMonth),
    risk: cat === "Z",
    junk: cat === "Z" && divYears === 0,
    budget: p != null && p <= CFG.BUDGET_PRICE && healthy,
  };
  return { p, week, month, m3, eps, nav, pe, pb, dps, yieldNow, payout, epsGrowth, pos52, fromHigh, epsPos3, healthy, age, divYears, upgrade, flags, e0, e1 };
}

export const TABS = [
  { id: "all", label: "সব শরীয়াহ স্টক", test: () => true },
  { id: "dividend", label: "💎 ডিভিডেন্ড চ্যাম্পিয়ন", test: (d) => d.flags.dividend && !d.flags.junk },
  { id: "upgrade", label: "⬆️ ক্যাটাগরি আপগ্রেড", test: (d) => d.flags.upgrade },
  { id: "blue", label: "🏛️ ব্লু-চিপ", test: (d) => d.flags.blue },
  { id: "drop", label: "📉 দাম কমা (A/B)", test: (d) => d.flags.drop },
  { id: "budget", label: "💰 বাজেট ফ্রেন্ডলি", test: (d) => d.flags.budget && !d.flags.junk },
  { id: "zdip", label: "⚡ Z-ক্যাটাগরি ডিপ", test: (d) => d.flags.zdip },
  { id: "risk", label: "⚠️ হাই রিস্ক", test: (d) => d.flags.risk },
];

export const TAB_HELP = {
  all: "আইবিএসএল শরীয়াহ তালিকার সব কোম্পানি। হাই রিস্ক কোম্পানি চিহ্নিত থাকবে।",
  dividend: `টানা কমপক্ষে ${CFG.MIN_DIV_YEARS} বছর ক্যাশ ডিভিডেন্ড দিয়েছে এবং গত ৩ বছরের গড় ${CFG.MIN_AVG_DIV}% বা তার বেশি।`,
  upgrade: `গত ${CFG.UPGRADE_DAYS} দিনে Z বা B থেকে উঁচু ক্যাটাগরিতে উঠেছে (পরিবর্তন ট্র্যাকিং শুরুর পর থেকে)।`,
  blue: "A ক্যাটাগরি, গত ৩ বছর ধারাবাহিক লাভ (EPS), টানা ডিভিডেন্ড, ইতিবাচক NAV এবং ৫+ বছর তালিকাভুক্ত।",
  drop: `A/B ক্যাটাগরি, ১ সপ্তাহে ${CFG.DROP_WEEK}% বা ১ মাসে ${CFG.DROP_MONTH}% এর বেশি কমেছে, কিন্তু EPS ও NAV ইতিবাচক।`,
  budget: `দাম ৳${CFG.BUDGET_PRICE} এর নিচে এবং EPS ও NAV ইতিবাচক।`,
  zdip: "Z ক্যাটাগরির শেয়ার যার দাম হঠাৎ কমেছে। এগুলো উচ্চ ঝুঁকির, আলাদা সতর্কতাসহ দেখানো হয়।",
  risk: "Z ক্যাটাগরির সব শেয়ার। টানা ডিভিডেন্ড না দেওয়া কোম্পানিতে ‘জাঙ্ক’ ট্যাগ থাকে।",
};

// -------------------------------------------------------------- কেন এই তালিকায়?
export function whyFeatured(s, d, tabId) {
  const L = [];
  const cat = s.category ? `${s.category} ক্যাটাগরির` : "";
  if (tabId === "dividend" || (tabId === "all" && d.flags.dividend)) {
    L.push(`${cat} কোম্পানিটি টানা ${d.divYears} বছর ক্যাশ ডিভিডেন্ড দিয়েছে, গত ৩ বছরের গড় ${f(s.dividend?.avg3, 1)}%।`);
    if (d.yieldNow != null) L.push(`সর্বশেষ ডিভিডেন্ড (${s.dividend.lastYear}) ${f(s.dividend.lastPct, 0)}% ধরলে বর্তমান দামে ইল্ড প্রায় ${f(d.yieldNow, 1)}%।`);
  } else if (tabId === "upgrade" && d.upgrade) {
    L.push(`${d.upgrade.date} তারিখে ক্যাটাগরি ${d.upgrade.from} থেকে ${d.upgrade.to}-তে উঠেছে।`);
  } else if (tabId === "blue") {
    L.push(`A ক্যাটাগরির, গত ৩ বছর ধারাবাহিক লাভ (সর্বশেষ EPS ৳${f(d.eps)}), NAV ৳${f(d.nav)} এবং টানা ${d.divYears} বছর ডিভিডেন্ড।`);
  } else if (tabId === "drop" || tabId === "zdip") {
    const parts = [];
    if (d.week != null) parts.push(`১ সপ্তাহে ${sg(d.week, 1)}`);
    if (d.month != null) parts.push(`১ মাসে ${sg(d.month, 1)}`);
    L.push(`${cat} শেয়ারটির দাম ${parts.join(", ")} বদলেছে।`);
    if (tabId === "drop") L.push(`একই সময়ে ফান্ডামেন্টাল ইতিবাচক: EPS ৳${f(d.eps)}, NAV ৳${f(d.nav)}।`);
    else L.push("Z ক্যাটাগরি হওয়ায় ঝুঁকি বেশি; দাম হঠাৎ ওঠানামা করতে পারে।");
    if (s.high52 && d.fromHigh != null) L.push(`৫২ সপ্তাহের সর্বোচ্চ দামের চেয়ে এখন ${f(Math.abs(d.fromHigh), 1)}% নিচে।`);
  } else if (tabId === "budget") {
    L.push(`দাম ৳${f(d.p)} (১০০ টাকার নিচে), EPS ৳${f(d.eps)}, NAV ৳${f(d.nav)}।`);
  } else if (tabId === "risk") {
    L.push("Z ক্যাটাগরির শেয়ার, ঝুঁকি বেশি।");
    if (d.flags.junk) L.push("উপলব্ধ ইতিহাসে ডিভিডেন্ড দেওয়ার রেকর্ড নেই।");
  } else {
    L.push(`${cat} ${s.sector || ""} খাতের শরীয়াহ-তালিকাভুক্ত কোম্পানি।`.trim());
    if (d.divYears > 0) L.push(`টানা ${d.divYears} বছর ক্যাশ ডিভিডেন্ড দিয়েছে।`);
  }
  return L;
}

// -------------------------------------------------- আর্থিক স্বাস্থ্য সারসংক্ষেপ
export function healthSummary(s) {
  const d = derive(s);
  const pts = []; // {tone: good|warn|info, text}
  const add = (tone, text) => pts.push({ tone, text });
  const fin = s.financials || [];
  const div = s.dividend || {};

  // মুনাফা
  if (d.eps != null) {
    if (d.eps > 0) {
      let t = `${d.e0.year} সালে শেয়ারপ্রতি আয় (EPS) ৳${f(d.eps)}`;
      if (d.epsGrowth != null) t += `, আগের বছরের চেয়ে ${f(Math.abs(d.epsGrowth), 1)}% ${d.epsGrowth >= 0 ? "বেশি" : "কম"}`;
      add(d.epsGrowth != null && d.epsGrowth < -20 ? "warn" : "good", t + "।");
    } else add("warn", `${d.e0.year} সালে শেয়ারপ্রতি আয় (EPS) ঋণাত্মক (৳${f(d.eps)}), অর্থাৎ কোম্পানি ক্ষতিতে ছিল।`);
    const n = fin.filter((x) => x.eps != null).slice(0, 5);
    const posN = n.filter((x) => (x.eps ?? 0) > 0).length;
    if (n.length >= 3) add(posN === n.length ? "good" : posN <= n.length / 2 ? "warn" : "info", `গত ${n.length} বছরের মধ্যে ${posN} বছর লাভজনক।`);
  } else add("info", "আর্থিক ফলাফলের (EPS) তথ্য পাওয়া যায়নি।");

  // সম্পদ ও মূল্যায়ন
  if (d.nav != null) {
    let t = `শেয়ারপ্রতি নিট সম্পদমূল্য (NAV) ৳${f(d.nav)}`;
    if (d.pb != null) t += `; বর্তমান দাম NAV-এর ${f(d.pb)} গুণ`;
    add(d.nav <= 0 ? "warn" : "info", t + (d.nav <= 0 ? " (ঋণাত্মক NAV, ঝুঁকিপূর্ণ)।" : "।"));
  }
  if (d.pe != null) {
    const band = d.pe <= 10 ? "তুলনামূলক কম" : d.pe <= 25 ? "মাঝারি" : "তুলনামূলক বেশি";
    add("info", `বর্তমান দামে P/E অনুপাত ${f(d.pe, 1)}, যা সাধারণ মানদণ্ডে ${band} (≤১০ কম, ১০–২৫ মাঝারি, >২৫ বেশি)।`);
  }

  // ডিভিডেন্ড
  if (div.available > 0) {
    if (div.years > 0) {
      add("good", `টানা ${div.years} বছর ক্যাশ ডিভিডেন্ড দিয়েছে; গত ৩ বছরের গড় ${f(div.avg3, 1)}%${div.avg5 != null ? `, ৫ বছরের গড় ${f(div.avg5, 1)}%` : ""}।`);
      if (d.yieldNow != null) add("info", `সর্বশেষ ডিভিডেন্ড (${div.lastYear}) ${f(div.lastPct, 0)}% (মুখ্যমূল্য ৳${f(s.faceValue || 10, 0)}); বর্তমান দামে ইল্ড প্রায় ${f(d.yieldNow, 1)}%।`);
      if (d.payout != null) add(d.payout > 100 ? "warn" : "info", `ওই বছরের আয়ের ${f(d.payout, 0)}% ডিভিডেন্ডে দিয়েছে${d.payout > 100 ? " (আয়ের চেয়ে বেশি, জমানো মুনাফা থেকে দেওয়া হয়েছে)" : ""}।`);
      if (div.latestPending) add("info", `${fin[0]?.year} সালের ডিভিডেন্ড এখনো ডেটায় আসেনি, তাই হিসাব আগের বছর থেকে।`);
    } else add("warn", "উপলব্ধ ইতিহাসে নিয়মিত ক্যাশ ডিভিডেন্ডের রেকর্ড নেই।");
  }

  // দামের অবস্থান
  if (d.pos52 != null) {
    const where = d.pos52 >= 80 ? "৫২ সপ্তাহের সীমার উপরের দিকে" : d.pos52 <= 20 ? "৫২ সপ্তাহের সীমার নিচের দিকে" : "৫২ সপ্তাহের সীমার মাঝামাঝি";
    add("info", `দাম ${where} (সর্বনিম্ন ৳${f(s.low52)} – সর্বোচ্চ ৳${f(s.high52)}); সর্বোচ্চ থেকে ${sg(d.fromHigh, 1)}।`);
  }
  const moves = [];
  if (d.week != null) moves.push(`১ সপ্তাহে ${sg(d.week, 1)}`);
  if (d.month != null) moves.push(`১ মাসে ${sg(d.month, 1)}`);
  if (d.m3 != null) moves.push(`৩ মাসে ${sg(d.m3, 1)}`);
  if (moves.length) add((d.week ?? 0) <= -CFG.DROP_WEEK || (d.month ?? 0) <= -CFG.DROP_MONTH ? "warn" : "info", `দামের পরিবর্তন: ${moves.join(", ")}।`);

  // আকার ও লেনদেন
  if (s.marketCapMn) add("info", `বাজার মূলধন প্রায় ৳${f(s.marketCapMn / 1000, 1)} বিলিয়ন (${f(s.marketCapMn, 0)} মিলিয়ন)।`);
  if (s.valueMn != null && s.avgVolume30 != null)
    add(s.valueMn < 1 ? "warn" : "info", `সর্বশেষ দিনে লেনদেন ৳${f(s.valueMn, 1)} মিলিয়ন; গত ৩০ দিনের গড় দৈনিক ভলিউম ${f0(s.avgVolume30)} শেয়ার${s.valueMn < 1 ? " (লেনদেন কম, কিনতে/বেচতে অসুবিধা হতে পারে)" : ""}।`);

  // মালিকানা
  const sh = s.shareholding || {};
  if (sh.director != null || sh.public != null)
    add("info", `মালিকানা: উদ্যোক্তা/পরিচালক ${f(sh.director, 1)}%, প্রতিষ্ঠান ${f(sh.inst, 1)}%, বিদেশি ${f(sh.foreign, 1)}%, সাধারণ বিনিয়োগকারী ${f(sh.public, 1)}%।`);

  // ক্যাটাগরি
  const catNote = { A: "নিয়মিত এজিএম ও ডিভিডেন্ডের শর্ত পূরণকারী (সবচেয়ে নির্ভরযোগ্য ক্যাটাগরি)", B: "এজিএম হয়েছে তবে ডিভিডেন্ডের শর্ত আংশিক", N: "নতুন তালিকাভুক্ত", Z: "নিয়ম/ডিভিডেন্ডের শর্ত পূরণ করেনি বা কার্যক্রমে সমস্যা, উচ্চ ঝুঁকি" }[s.category];
  if (catNote) add(s.category === "Z" ? "warn" : "info", `DSE ক্যাটাগরি ${s.category}: ${catNote}।`);
  if (s.categoryChanges?.length) {
    const c = s.categoryChanges[s.categoryChanges.length - 1];
    add("info", `সর্বশেষ ক্যাটাগরি পরিবর্তন: ${c.from} → ${c.to} (${c.date})।`);
  }

  const good = pts.filter((x) => x.tone === "good").length;
  const warn = pts.filter((x) => x.tone === "warn").length;
  const head = [
    `${s.category ? s.category + " ক্যাটাগরির " : ""}${s.sector || ""} খাতের কোম্পানি।`,
    d.divYears > 0 ? `টানা ${d.divYears} বছর ডিভিডেন্ড দিয়েছে।` : "নিয়মিত ডিভিডেন্ডের রেকর্ড নেই।",
    d.eps != null ? (d.eps > 0 ? "সর্বশেষ বছরে লাভজনক।" : "সর্বশেষ বছরে ক্ষতিতে।") : "",
    warn ? `${warn}টি বিষয় খেয়াল রাখার মতো।` : "বড় কোনো সতর্কতা পাওয়া যায়নি।",
  ].filter(Boolean).join(" ");
  return { head, pts, good, warn, d };
}

// ----------------------------------------------------------- আজকের বাজার সারসংক্ষেপ
export function marketSummary(stocks) {
  const traded = stocks.filter((s) => s.changePct != null && s.ltp);
  const up = traded.filter((s) => s.changePct > 0).length;
  const down = traded.filter((s) => s.changePct < 0).length;
  const flat = traded.length - up - down;
  const turnover = stocks.reduce((a, s) => a + (s.valueMn || 0), 0);
  const sorted = [...traded].sort((a, b) => b.changePct - a.changePct);
  const byValue = [...stocks].sort((a, b) => (b.valueMn || 0) - (a.valueMn || 0));
  return {
    up, down, flat, turnover,
    gainers: sorted.slice(0, 3),
    losers: sorted.slice(-3).reverse(),
    active: byValue.slice(0, 3),
    text: `শরীয়াহ তালিকার ${traded.length}টি শেয়ারের মধ্যে ${up}টির দাম বেড়েছে, ${down}টির কমেছে, ${flat}টি অপরিবর্তিত। মোট লেনদেন প্রায় ৳${f(turnover, 0)} মিলিয়ন।`,
  };
}

// ---------------------------------------------------------------- সময় ও স্ট্যাটাস
export function dhakaParts(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(date).map((x) => [x.type, x.value]));
  return { wd: p.weekday, h: Number(p.hour), m: Number(p.minute) };
}

export function marketOpenNow() {
  const { wd, h, m } = dhakaParts();
  if (wd === "Fri" || wd === "Sat") return false;
  const t = h * 60 + m;
  return t >= 600 && t <= 870; // ১০:০০ – ১৪:৩০
}

export function fmtDhaka(iso) {
  try {
    return new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });
  }
}

export function agoText(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "এইমাত্র";
  if (min < 60) return `${min} মিনিট আগে`;
  if (min < 1440) return `${Math.floor(min / 60)} ঘণ্টা আগে`;
  return `${Math.floor(min / 1440)} দিন আগে`;
}

export function dataStatus(meta) {
  if (!meta?.generatedAt) return { tone: "warn", label: "ডেটা নেই" };
  const ageMin = (Date.now() - new Date(meta.generatedAt).getTime()) / 60000;
  if (marketOpenNow()) {
    return ageMin <= 45
      ? { tone: "good", label: "লাইভ (প্রায় ১৫–২০ মিনিট বিলম্বে)" }
      : { tone: "warn", label: "ডেটা পুরনো, আপডেটের অপেক্ষায়" };
  }
  return ageMin <= 60 * 24 * 3
    ? { tone: "idle", label: "বাজার বন্ধ, শেষ ট্রেডিং ডেটা" }
    : { tone: "warn", label: "ডেটা পুরনো" };
}