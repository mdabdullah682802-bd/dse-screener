#!/usr/bin/env python3
"""Fetch real DSE data and write out/stocks.json (Shariah-listed companies only).

MODE=full   : prices + fundamentals + 1-year price history (once a day, slow)
MODE=prices : latest prices only (during market hours, fast)
MODE=auto   : prices if previous data exists, otherwise full
"""
import json
import os
import re
import statistics
import sys
import time
import datetime as dt
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CODES_FILE = ROOT / "src" / "shariah_codes.json"
OUT_DIR = Path(os.environ.get("OUT_DIR", ROOT / "out"))
PREV_FILE = Path(os.environ.get("PREV_FILE", ROOT / "prev" / "stocks.json"))
MODE = os.environ.get("MODE", "auto").strip().lower()
SLEEP = float(os.environ.get("REQUEST_SLEEP", "0.5"))
BD = dt.timezone(dt.timedelta(hours=6))


# ----------------------------------------------------------------- helpers
def num(v):
    """Extract a number from any value; None if not possible."""
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return None if v != v else float(v)
    s = str(v).replace(",", "").strip()
    if s in ("", "-", "--", "None", "nan", "NaN", "N/A", "n/a"):
        return None
    m = re.match(r"^-?(\d+\.?\d*|\.\d+)", s)
    return float(m.group(0)) if m else None


def pos(v):
    x = num(v)
    return x if (x is not None and x > 0) else None


def year_key(s):
    m = re.search(r"(19|20)\d{2}", str(s))
    return int(m.group(0)) if m else 0


def clean(s):
    s = "" if s is None else str(s).strip()
    return None if s in ("", "-", "--", "None", "nan") else s


def retry(fn, *a, tries=3, wait=4, **k):
    last = None
    for i in range(tries):
        try:
            return fn(*a, **k)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(wait * (i + 1))
    raise last


def load_codes():
    data = json.loads(CODES_FILE.read_text(encoding="utf-8"))
    seen, out = set(), []
    for c in data["codes"]:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def load_prev():
    try:
        data = json.loads(PREV_FILE.read_text(encoding="utf-8"))
        return data.get("meta", {}), {s["code"]: s for s in data.get("stocks", [])}
    except Exception:  # noqa: BLE001
        return {}, {}


# ------------------------------------------------------------ live prices
def live_from_row(r):
    ltp, close, ycp = pos(r.get("LTP")), pos(r.get("CLOSEP")), pos(r.get("YCP"))
    price = ltp or close or ycp
    chg = None
    if price and ycp:
        chg = round((price - ycp) / ycp * 100, 2)
    return {
        "ltp": price,
        "ycp": ycp,
        "high": pos(r.get("HIGH")),
        "low": pos(r.get("LOW")),
        "changePct": chg,
        "trades": num(r.get("TRADE")),
        "valueMn": num(r.get("VALUE_MN")),
        "volume": num(r.get("VOLUME")),
    }


# ---------------------------------------------------------------- history
def process_history(records):
    rows = []
    for r in records:
        try:
            d = dt.date.fromisoformat(str(r.get("DATE"))[:10])
        except Exception:  # noqa: BLE001
            continue
        c = pos(r.get("CLOSEP")) or pos(r.get("LTP")) or pos(r.get("YCP"))
        if not c:
            continue
        rows.append((d, c, pos(r.get("HIGH")) or c, pos(r.get("LOW")) or c, num(r.get("VOLUME")) or 0))
    rows.sort(key=lambda x: x[0])
    if not rows:
        return {}
    ref = rows[-1][0]

    def close_before(days):
        target = ref - dt.timedelta(days=days)
        cand = [x[1] for x in rows if x[0] <= target]
        return cand[-1] if cand else None

    last_year = [x for x in rows if x[0] > ref - dt.timedelta(days=365)]
    vols = [x[4] for x in rows[-30:]]
    return {
        "lastTradeDate": ref.isoformat(),
        "high52": max(x[2] for x in last_year) if last_year else None,
        "low52": min(x[3] for x in last_year) if last_year else None,
        "closeWeekAgo": close_before(7),
        "closeMonthAgo": close_before(30),
        "closeThreeMonthAgo": close_before(90),
        "closeYearAgo": close_before(365),
        "avgVolume30": round(sum(vols) / len(vols)) if vols else None,
        "spark": [round(x[1], 2) for x in rows[-90:]],
    }


# ------------------------------------------------------------ fundamentals
def process_fin(records):
    seen, out = set(), []
    for r in sorted(records, key=lambda r: year_key(r.get("year")), reverse=True):
        year = str(r.get("year", "")).strip()
        if not year or year in seen:
            continue
        seen.add(year)
        eps = num(r.get("eps_restated"))
        if eps is None:
            eps = num(r.get("eps_original"))
        nav = num(r.get("nav_restated"))
        if nav is None:
            nav = num(r.get("nav_original"))
        pe = num(r.get("pe_restated"))
        if pe is None:
            pe = num(r.get("pe_original"))
        out.append({
            "year": year,
            "eps": eps,
            "nav": nav,
            "pe": pe,
            "profit": num(r.get("profit")),
            "dividendPct": num(r.get("dividend_p")),
            "dividendYield": num(r.get("dividend_yield_p")),
        })
    return out[:8]


def dividend_stats(hist):
    pcts = [h["dividendPct"] or 0 for h in hist]

    def streak(start):
        n = 0
        for p in pcts[start:]:
            if p > 0:
                n += 1
            else:
                break
        return n

    s = streak(0)
    pending = False
    if s == 0 and len(hist) > 1 and (hist[0]["eps"] or 0) > 0 and streak(1) > 0:
        s, pending = streak(1), True
    base = pcts[1:] if pending else pcts
    base_h = hist[1:] if pending else hist
    return {
        "years": s,
        "latestPending": pending,
        "avg3": round(statistics.mean(base[:3]), 2) if base else None,
        "avg5": round(statistics.mean(base[:5]), 2) if base else None,
        "lastPct": base[0] if base else None,
        "lastYear": base_h[0]["year"] if base_h else None,
        "available": len(hist),
    }


def build_full(code, live, company, fin, hist, prev):
    c = company or {}
    fin_list = process_fin(fin) if fin else (prev or {}).get("financials", [])
    h = process_history(hist) if hist else {}
    rec = dict(prev or {})
    rec.update({
        "code": code,
        "name": clean(c.get("company_name")) or (prev or {}).get("name") or code,
        "sector": clean(c.get("sector")) or (prev or {}).get("sector"),
        "category": clean(c.get("market_category")) or (prev or {}).get("category"),
        "listingYear": int(num(c.get("listing_year"))) if num(c.get("listing_year")) else (prev or {}).get("listingYear"),
        "faceValue": num(c.get("face_value")) or (prev or {}).get("faceValue"),
        "marketCapMn": num(c.get("market_cap")) or (prev or {}).get("marketCapMn"),
        "paidUpCapitalMn": num(c.get("paid_up_capital")) or (prev or {}).get("paidUpCapitalMn"),
        "outstandingShares": num(c.get("outstanding_share")) or (prev or {}).get("outstandingShares"),
        "yearEnd": clean(c.get("year_end")) or (prev or {}).get("yearEnd"),
        "lastAgmDate": clean(c.get("last_agm_date")) or (prev or {}).get("lastAgmDate"),
        "latestCashDividend": {"pct": num(c.get("cash_dividend_p")), "year": clean(c.get("cash_dividend_year"))},
        "latestStockDividend": {"pct": num(c.get("stock_dividend_p")), "year": clean(c.get("stock_dividend_year"))},
        "shareholding": {
            "director": num(c.get("sh_director")), "govt": num(c.get("sh_govt")),
            "inst": num(c.get("sh_inst")), "foreign": num(c.get("sh_foreign")),
            "public": num(c.get("sh_public")),
        },
        "financials": fin_list,
        "dividend": dividend_stats(fin_list),
        "fundamentalsOk": bool(company) and bool(fin),
    })
    for k in ("high52", "low52", "closeWeekAgo", "closeMonthAgo", "closeThreeMonthAgo",
              "closeYearAgo", "avgVolume30", "spark", "lastTradeDate"):
        if k in h:
            rec[k] = h[k]
    rec.update(live)
    return rec


# -------------------------------------------------------------------- main
def main():
    from stocksurferbd import FundamentalData, PriceData

    codes = load_codes()
    prev_meta, prev = load_prev()
    mode = MODE
    if mode == "auto":
        mode = "prices" if prev else "full"
    if mode == "prices" and not prev:
        mode = "full"
    now = dt.datetime.now(BD)
    today = now.date()
    print(f"mode: {mode} | codes: {len(codes)} | previous records: {len(prev)}")

    price_loader = PriceData(timeout=60)
    price_df = retry(price_loader.get_current_price_df, "DSE")
    prices = {str(r["TRADING_CODE"]).strip(): r for r in price_df.to_dict("records")}
    if len(prices) < 100:
        print(f"ERROR: price table too small ({len(prices)} rows); the DSE page layout may have changed")
        sys.exit(1)
    market_date = str(price_df["DATE"].iloc[0])
    missing = [c for c in codes if c not in prices]
    present = [c for c in codes if c in prices]
    print(f"found on DSE: {len(present)} | not found: {len(missing)} {missing[:15]}")

    stocks, failed = {}, []
    if mode == "prices":
        for code in present:
            if code in prev:
                rec = dict(prev[code])
                rec.update(live_from_row(prices[code]))
                stocks[code] = rec
        fundamentals_at = prev_meta.get("fundamentalsAt")
        if len(stocks) < 0.5 * len(present):
            print("previous data incomplete, switching to full mode")
            mode = "full"
            stocks = {}
    if mode == "full":
        fd = FundamentalData(timeout=60)
        start = today - dt.timedelta(days=400)
        for i, code in enumerate(present, 1):
            live = live_from_row(prices[code])
            company = fin = hist = None
            errs = []
            try:
                cdf, fdf = retry(fd.get_company_df, code, tries=2)
                company = cdf.iloc[0].to_dict()
                fin = fdf.to_dict("records")
            except Exception as e:  # noqa: BLE001
                errs.append(f"fundamentals: {str(e)[:120]}")
            time.sleep(SLEEP)
            try:
                hdf = retry(price_loader.get_price_history_df, code, "DSE", start, today, tries=2)
                hist = hdf.to_dict("records")
            except Exception as e:  # noqa: BLE001
                errs.append(f"history: {str(e)[:120]}")
            time.sleep(SLEEP)
            if errs:
                failed.append(code)
                if len(failed) <= 8:
                    print(f"[{code}] problem: {' | '.join(errs)}")
            stocks[code] = build_full(code, live, company, fin, hist, prev.get(code))
            if i % 25 == 0:
                print(f"  {i}/{len(present)} done")
        fundamentals_at = now.isoformat(timespec="seconds")
        if prev and len(failed) > 0.7 * len(present):
            print("ERROR: more than 70% of companies failed; keeping the previous data unchanged")
            sys.exit(2)

    # keep a history of category changes
    for code, rec in stocks.items():
        old = prev.get(code, {})
        changes = list(old.get("categoryChanges", []))
        if old.get("category") and rec.get("category") and old["category"] != rec["category"]:
            changes.append({"date": today.isoformat(), "from": old["category"], "to": rec["category"]})
        rec["categoryChanges"] = changes[-10:]

    out = {
        "meta": {
            "generatedAt": now.isoformat(timespec="seconds"),
            "marketDate": market_date,
            "mode": mode,
            "fundamentalsAt": fundamentals_at,
            "categoryTrackingSince": prev_meta.get("categoryTrackingSince") or today.isoformat(),
            "source": "Dhaka Stock Exchange (DSE)",
            "shariahSource": "Islami Bank Securities Limited (IBSL) Shariah Stock List",
            "listCount": len(codes),
            "count": len(stocks),
            "missingCodes": missing,
            "failedCodes": failed,
        },
        "stocks": sorted(stocks.values(), key=lambda s: s["code"]),
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "stocks.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"done: wrote {len(stocks)} companies ({mode}), {len(failed)} had problems")


if __name__ == "__main__":
    main()