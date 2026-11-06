import React, { useState } from 'react';
import { fmtDhaka } from './analysis.js';

// ===== এখানে নিজের তথ্য বদলান =====
const DEVELOPER_NAME = 'Sk. Mahadi Islam';
const DEPARTMENT = 'Department of CSE';
const UNIVERSITY = 'DIU';
const CONTACT = ''; // চাইলে ইমেইল বা ফোন লিখুন, ফাঁকা রাখলে দেখাবে না
const APP_VERSION = '1.2.0';
// ====================================

export default function About({ meta }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="অ্যাপ সম্পর্কে"
        className="fixed bottom-14 right-3 z-40 w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-base shadow-lg"
      >
        ℹ️
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-emerald-400">DSE Smart Screener</h3>
                <p className="text-xs text-slate-400">Islamic Edition · সংস্করণ {APP_VERSION}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-300 text-lg font-bold px-3 py-1 bg-slate-800 rounded-lg">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <span className="text-emerald-400 font-semibold block mb-1">👨‍💻 ডেভেলপার</span>
                <p className="text-sm text-slate-100 font-semibold">{DEVELOPER_NAME}</p>
                <p className="text-slate-300">{DEPARTMENT}</p>
                <p className="text-slate-300">{UNIVERSITY}</p>
                {CONTACT && <p className="text-slate-400 mt-0.5">{CONTACT}</p>}
                <p className="text-[10px] text-slate-500 mt-2">Developed via Vibe Coding</p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-emerald-400 font-semibold block mb-1">📚 তথ্যের সূত্র</span>
                <p>দাম, ক্যাটাগরি ও আর্থিক তথ্য: Dhaka Stock Exchange (DSE)।</p>
                <p>শরীয়াহ তালিকা: Islami Bank Securities Limited (IBSL)।</p>
                {meta && <p className="text-slate-400 mt-1">সর্বশেষ ডেটা আপডেট: {fmtDhaka(meta.generatedAt)}</p>}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
                <span className="font-semibold block mb-1">⚠️ সতর্কতা</span>
                <p>এটি বিনিয়োগ পরামর্শ বা ফতোয়া নয়। বিশ্লেষণ স্বয়ংক্রিয়ভাবে তৈরি, কোনো ভবিষ্যৎ পূর্বাভাস নয়। ডেটায় ভুল বা বিলম্ব থাকতে পারে। বিনিয়োগের আগে নিজে যাচাই করুন এবং আলেম বা শরীয়াহ বোর্ডের সাথে পরামর্শ করুন।</p>
              </div>
            </div>

            <button onClick={() => setOpen(false)} className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold">বন্ধ করুন</button>
          </div>
        </div>
      )}
    </>
  );
}