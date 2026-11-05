import React, { useState, useEffect } from 'react';

// ============================================================
// শরীয়াহ নিয়ম: এই তালিকার বাইরের কোনো স্টক অ্যাপে দেখানো হবে না
// সূত্র: Islami Bank Securities Limited (IBSL) Shariah Stock List
// ============================================================

const SHARIAH_LIST_TEXT = `
ALARABANK FIRSTSBANK GIB ICBIBANK ISLAMIBANK SHAHJABANK SIBL
FAREASTLIF ICICL ISLAMIINS MERCINS NORTHRNINS PADMALIFE PRIMEINSUR PRIMELIFE TAKAFULINS TILIL ISLAMICFIN
ARAMITCEM CONFIDCEM CROWNCEMNT HEIDELBCEM LHBL MEGHNACEM PREMIERCEM
FUWANGCER MONNOCERA RAKCERAMIC SPCERAMICS STANCERAM
AFTABAUTO ANWARGALV APOLOISPAT ATLASBANG AZIZPIPES BBS BBSCABLES BDAUTOCA BDLAMPS BDTHAI BENGALWTL BSRMLTD BSRMSTEEL COPPERTECH DESHBANDHU DOMINAGE ECABLES GOLDENSON GPHISPAT IFADAUTOS KAY&QUE KDSALTD MIRAKHTER MONNOAGML NAHEEACP NAVANACNG NPOLYMER NTLTUBES OAL OIMEX QUASEMIND RANFOUNDRY RENWICKJA RSRMSTEEL RUNNERAUTO SALAMCRST SHURWID SINGERBD SSSTEEL WALTONHIL WMSHIPYARD YPL MOSTFAMETL NIALCO WONDERTOYS
AMCL(PRAN) APEXFOODS BANGAS BDTHAIFOOD BEACHHATCH EMERALDOIL FINEFOODS FUWANGFOOD GEMINISEA GHAIL LOVELLO MEGCONMILK MEGHNAPET NTC OLYMPIC RAHIMAFOOD RDFOOD SHYAMPSUG UNILEVERCL ZEALBANGLA ACHIASF AOPLC BENGALBISC YUSUFLOUR
AOL BARKAPOWER BDWELDING BPPL CVOPRL DESCO DOREENPWR EASTRNLUB EPGL GBBPOWER INTRACO JAMUNAOIL KPCL LINDEBD LRBDL MJLBD MPETROLEUM PADMAOIL POWERGRID SPCL SUMITPOWER TITASGAS UPGDCL
AAMRANET AAMRATECH ADNTEL AGNISYSL BDCOM DAFODILCOM EGEN GENEXIL INTECH ISNLTD ITC
BPML HAKKANIPUL KPPL MONOSPOOL PAPERPROC SONALIPAPR WEBCOATS
ACI ACIFORMULA ACMELAB ACMEPL ACTIVEFINE ADVENT AFCAGRO AMBEEPHA ASIATICLAB BEACONPHAR BXPHARMA BXSYNTH CENTRALPHL FARCHEM GHCL IBNSINA IBP IMAMBUTTON JHRML JMISMDL KEYACOSMET KOHINOOR LIBRAINFU MARICO NAVANAPHAR ORIONINFU ORIONPHARM PHARMAID RECKITTBEN RENATA SALVOCHEM SILCOPHL SILVAPHL SQURPHARMA TECHNODRUG WATACHEM AMPL BDPAINTS MAMUNAGRO SADHESIVE
EHL SAIFPOWER SAMORITA SAPORTL
APEXFOOT APEXTANRY BATASHOE FORTUNE LEGACYFOOT SAMATALETH CRAFTSMAN MKFOOTWEAR
BSCCL GP ROBI
ACFL AIL AL-HAJTEX ALIF ALLTEX ANLIMAYARN APEXSPINN ARGONDENIM CNATEX DACCADYE DELTASPINN DSHGARME DSSL DULAMIACOT ENVOYTEX ESQUIRENIT ETL FAMILYTEX FEKDIL GENNEXT HFL HRTEX HWAWELLTEX KTL MAKSONSPIN MALEKSPIN MATINSPINN METROSPIN MHSML MITHUNKNIT MLDYEING MONNOFABR NEWLINE NURANI PDL PRIMETEX PTL QUEENSOUTH RAHIMTEXT REGENTTEX RINGSHINE RNSPIN SAFKOSPINN SAIHAMCOT SAIHAMTEX SHASHADNIM SHEPHERD SIMTEX SONARGAON SQUARETEXT STYLECRAFT TALLUSPIN TAMIJTEX TOSRIFA TUNGHAI VFSTDL ZAHEENSPIN ZAHINTEX APEXWEAV
BDSERVICE BESTHLDNG PENINSULA SEAPEARL UNIQUEHRL
JUTESPINN NORTHERN SONALIANSH
AMANFEED ARAMIT BERGERPBL BEXIMCO BSC GQBALLPEN HAMI INDEXAGRO KBPPWBIL MIRACLEIND NFML SAVAREFR SINOBANGLA SKTRIMS USMANIAGL HIMADRI KBSEED KFL MASTERAGRO ORYZAAGRO
`;

// ইচ্ছে করে বাদ রাখা (পূর্ণ ইসলামিক কিনা নিশ্চিত নয়, নিশ্চিত হলে উপরে যোগ করুন):
// EXIMBANK, STANDBANKL, UNIONBANK, SONALILIFE
// মিউচুয়াল ফান্ড ও বন্ড কোম্পানির শেয়ার নয়, তাই বাদ।

const SHARIAH_CODES = new Set(SHARIAH_LIST_TEXT.trim().split(/\s+/));

// এই খাতের কোনো কোম্পানি তালিকায় থাকলেও দেখানো হবে না
const BLOCKED_SECTORS = [
  "bank",
  "conventional bank",
  "mixed bank",
  "islamic window",
  "insurance",
  "nbfi",
  "financial institution",
  "tobacco",
  "alcohol",
  "gambling",
];

const isStrictlyShariah = (stock) =>
  SHARIAH_CODES.has(stock.code) &&
  !BLOCKED_SECTORS.includes(String(stock.sector).toLowerCase());

// ============================================================
// স্টক ডেটা (ডেমো মূল্য, প্রতি ৪ সেকেন্ডে সিমুলেশন চলে)
// ============================================================
const INITIAL_STOCKS = [
  { id: 1, code: "GP", name: "Grameenphone Ltd.", price: 285.50, prevPrice: 310.00, change: -7.90, category: "A", week: "Last Week", dividendYield: 12.5, isDividendChampion: true, isBudget: false, isDip: true, sector: "Telecom" },
  { id: 3, code: "SQURPHARMA", name: "Square Pharmaceuticals PLC", price: 215.40, prevPrice: 235.00, change: -8.34, category: "A", week: "Last Week", dividendYield: 8.5, isDividendChampion: true, isBudget: false, isDip: true, sector: "Pharma" },
  { id: 4, code: "RENATA", name: "Renata PLC", price: 920.00, prevPrice: 950.00, change: -3.15, category: "A", week: "This Week", dividendYield: 6.0, isDividendChampion: true, isBudget: false, isDip: false, sector: "Pharma" },
  { id: 5, code: "LHBL", name: "LafargeHolcim Bangladesh", price: 68.20, prevPrice: 62.00, change: 10.00, category: "A", week: "This Week", dividendYield: 15.0, isDividendChampion: true, isBudget: true, isDip: false, sector: "Cement" },
  { id: 6, code: "BXPHARMA", name: "Beximco Pharmaceuticals Ltd.", price: 115.00, prevPrice: 130.00, change: -11.53, category: "A", week: "Last Week", dividendYield: 5.0, isDividendChampion: false, isBudget: false, isDip: true, sector: "Pharma" },
  { id: 7, code: "HEIDELBCEM", name: "Heidelberg Materials Bangladesh", price: 185.00, prevPrice: 155.00, change: 19.35, category: "A", week: "This Week", dividendYield: 7.0, isDividendChampion: false, isBudget: false, isDip: false, sector: "Cement" },
  { id: 8, code: "ACMELAB", name: "ACME Laboratories Ltd.", price: 78.50, prevPrice: 85.00, change: -7.64, category: "A", week: "Last Week", dividendYield: 6.5, isDividendChampion: false, isBudget: true, isDip: true, sector: "Pharma" },
  { id: 9, code: "SILCOPHL", name: "Silco Pharmaceuticals Ltd.", price: 26.80, prevPrice: 24.50, change: 9.38, category: "B", week: "This Week", dividendYield: 4.0, isDividendChampion: false, isBudget: true, isDip: false, sector: "Pharma" },
  { id: 10, code: "ORIONPHARM", name: "Orion Pharma Ltd.", price: 65.20, prevPrice: 79.00, change: -17.46, category: "A", week: "Last Week", dividendYield: 3.5, isDividendChampion: false, isBudget: true, isDip: true, sector: "Pharma" },
  { id: 11, code: "RUNNERAUTO", name: "Runner Automobiles PLC", price: 44.50, prevPrice: 41.00, change: 8.53, category: "A", week: "This Week", dividendYield: 5.0, isDividendChampion: false, isBudget: true, isDip: false, sector: "Engineering" },
  { id: 12, code: "ISLAMIBANK", name: "Islami Bank Bangladesh PLC", price: 38.40, prevPrice: 35.00, change: 9.71, category: "A", week: "This Week", dividendYield: 10.0, isDividendChampion: true, isBudget: true, isDip: false, sector: "Islamic Bank" },
  { id: 13, code: "FIRSTSBANK", name: "First Security Islami Bank PLC", price: 9.80, prevPrice: 9.20, change: 6.52, category: "Z", week: "This Week", dividendYield: 2.0, isDividendChampion: false, isBudget: true, isDip: false, sector: "Islamic Bank" },
  { id: 14, code: "AMBEEPHA", name: "Ambee Pharmaceuticals PLC", price: 320.00, prevPrice: 280.00, change: 14.28, category: "A", week: "This Week", dividendYield: 3.0, isDividendChampion: false, isBudget: false, isDip: false, sector: "Pharma" }
];

export default function App() {
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedStockAI, setSelectedStockAI] = useState(null);

  // লাইভ সিমুলেশন
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prevStocks =>
        prevStocks.map(stock => {
          if (Math.random() > 0.6) {
            const fluctuation = (Math.random() * 2 - 1).toFixed(2);
            const newPrice = Number((stock.price + Number(fluctuation)).toFixed(2));
            const changePercent = Number(((((newPrice - stock.prevPrice) / stock.prevPrice)) * 100).toFixed(2));
            return { ...stock, price: newPrice, change: changePercent };
          }
          return stock;
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // সবার আগে কঠোর শরীয়াহ ছাঁকনি: তালিকার বাইরের কিছুই এর পরে যাবে না
  const shariahFilteredStocks = stocks.filter(isStrictlyShariah);

  const filteredStocks = shariahFilteredStocks.filter(stock => {
    const matchesSearch = stock.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          stock.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === "dividend") return stock.isDividendChampion;
    if (selectedFilter === "budget") return stock.isBudget && stock.price <= 100;
    if (selectedFilter === "dip") return stock.isDip && stock.change < 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              DSE Smart Screener (Islamic Edition)
            </h1>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> LIVE STREAMING
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            সুদমুক্ত ও শরীয়াহ সম্মত তালিকা ভিত্তিক রিয়েল-টাইম স্টক অ্যানালাইসিস (কোনো ভবিষ্যৎ পূর্বাভাস ছাড়া)
          </p>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/50 px-4 py-2 rounded-xl text-xs text-emerald-300 text-center md:text-right">
          🔒 <b>Pure Shariah Mode Active</b> <br/>
          শরীয়াহ তালিকায় মোট {SHARIAH_CODES.size} কোড, অ্যাপে দেখানো হচ্ছে {shariahFilteredStocks.length} টি। <br/>
          কনভেনশনাল ব্যাংক ও ইসলামিক উইন্ডো কোম্পানি বাদ।
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <input
            type="text"
            placeholder="কোম্পানির নাম বা কোড দিয়ে সার্চ করুন (যেমন: GP, SQURPHARMA)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-emerald-500 text-slate-200"
          />

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition ${selectedFilter === "all" ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              সকল শরীয়াহ স্টক
            </button>
            <button
              onClick={() => setSelectedFilter("dividend")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition ${selectedFilter === "dividend" ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              💎 ডিভিডেন্ড চ্যাম্পিয়ন
            </button>
            <button
              onClick={() => setSelectedFilter("budget")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition ${selectedFilter === "budget" ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              💰 বাজেট ফ্রেন্ডলি (৳১০০ এর নিচে)
            </button>
            <button
              onClick={() => setSelectedFilter("dip")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition ${selectedFilter === "dip" ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              📉 হুট করে দাম কমা ভালো শেয়ার
            </button>
          </div>
        </div>

        {/* Stock Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStocks.map(stock => (
            <div key={stock.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-lg font-bold text-slate-100">{stock.code}</span>
                    <span className="text-xs text-slate-400 block">{stock.name}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${stock.category === 'A' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    Cat: {stock.category}
                  </span>
                </div>

                <div className="my-3 py-2 border-y border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">বর্তমান মূল্য:</span>
                    <span className="text-base font-bold text-slate-200">৳{stock.price}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">পরিবর্তন ({stock.week}):</span>
                    <span className={`font-semibold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stock.change >= 0 ? `+${stock.change}%` : `${stock.change}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">পূর্বের মূল্য:</span>
                    <span className="text-slate-300 font-medium">৳{stock.prevPrice}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ডিভিডেন্ড ইল্ড:</span>
                    <span className="text-slate-300 font-medium">{stock.dividendYield}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded text-[10px]">
                    ✓ শরীয়াহ তালিকাভুক্ত
                  </span>
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                    {stock.sector}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedStockAI(stock)}
                className="w-full mt-2 py-2 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2"
              >
                ✨ এআই বিশ্লেষণ ও ইতিহাস দেখুন
              </button>
            </div>
          ))}
        </div>

        {filteredStocks.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-slate-400 text-sm">কোনো স্টক পাওয়া যায়নি। ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।</p>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-500 pb-4">
          শরীয়াহ তালিকার সূত্র: Islami Bank Securities Limited (IBSL)। এটি ফতোয়া নয়, বিনিয়োগের আগে আলেম বা শরীয়াহ বোর্ডের সাথে মিলিয়ে নিন।
        </p>
      </div>

      {/* AI Analysis Modal */}
      {selectedStockAI && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-emerald-400">{selectedStockAI.code} - এআই বিশ্লেষণ</h3>
                <p className="text-xs text-slate-400">{selectedStockAI.name}</p>
              </div>
              <button
                onClick={() => setSelectedStockAI(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-emerald-400 font-semibold block mb-1">📊 বর্তমান পারফরম্যান্স ও ট্রেন্ড:</span>
                <p>
                  কোম্পানিটির বর্তমান বাজার মূল্য ৳{selectedStockAI.price}, যা {selectedStockAI.week} পূর্বের মূল্য ৳{selectedStockAI.prevPrice} থেকে
                  <span className={selectedStockAI.change >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}> {selectedStockAI.change}% </span>
                  পরিবর্তিত হয়েছে। এটি {selectedStockAI.sector} খাতের তালিকাভুক্ত শেয়ার।
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-emerald-400 font-semibold block mb-1">🏛️ শরীয়াহ কমপ্লায়েন্স ও ডিভিডেন্ড স্ট্যাটাস:</span>
                <p>
                  কোম্পানিটি IBSL-এর শরীয়াহ স্টক তালিকায় অন্তর্ভুক্ত। এর গড় ডিভিডেন্ড ইল্ড {selectedStockAI.dividendYield}%, যা দীর্ঘমেয়াদী বিনিয়োগের জন্য একটি ঐতিহাসিক তথ্য।
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                ⚠️ <b>নোট:</b> এটি কোনো ভবিষ্যৎ পূর্বাভাস বা বিনিয়োগের পরামর্শ নয়। শুধুমাত্র বর্তমান ও বিগত ডেটার ভিত্তিতে প্রস্তুতকৃত তথ্য।
              </div>
            </div>

            <button
              onClick={() => setSelectedStockAI(null)}
              className="w-full mt-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}