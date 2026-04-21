"""
Background stock updater.

Reads watchlist_symbols from Supabase, prioritizes missing/oldest rows in stock_data,
scrapes finviz.com HTML, and upserts stock_data.

Runs forever with a 5 second delay between symbols.
"""

from __future__ import annotations

import html as html_lib
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

import requests
from dotenv import load_dotenv

load_dotenv()


def supabase_base_url() -> str:
    base = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    if not base:
        raise RuntimeError("Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
    return base.rstrip("/")


SUPABASE_URL = supabase_base_url()
SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

FINVIZ_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def clean_cell(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    s = html_lib.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def extract_snapshot_kv(page_html: str) -> Dict[str, str]:
    m = re.search(r'class="snapshot-table2"(.*?)</table>', page_html, flags=re.S | re.I)
    if not m:
        return {}
    tbl = m.group(1)
    pairs = re.findall(
        r'<td[^>]*class="snapshot-td2"[^>]*>(.*?)</td>\s*<td[^>]*class="snapshot-td2"[^>]*>(.*?)</td>',
        tbl,
        flags=re.S | re.I,
    )
    out: Dict[str, str] = {}
    for k_raw, v_raw in pairs:
        k = clean_cell(k_raw)
        v = clean_cell(v_raw)
        if k:
            out[k] = v
    return out


def first_match(kv: Dict[str, str], needles: Tuple[str, ...]) -> Optional[str]:
    for needle in needles:
        needle_l = needle.lower()
        for k, v in kv.items():
            if needle_l in k.lower():
                return v
    return None


def parse_price(raw: Optional[str]) -> Optional[float]:
    if not raw:
        return None
    raw = raw.replace(",", "")
    m = re.search(r"([-+]?\d*\.?\d+)", raw)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def parse_change_percent(raw: Optional[str]) -> Optional[float]:
    if not raw:
        return None
    m = re.search(r"([-+]?\d*\.?\d+)\s*%", raw)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def kv_to_stock_row(symbol: str, kv: Dict[str, str]) -> Dict[str, Any]:
    price = parse_price(first_match(kv, ("Price",)))
    change_raw = first_match(kv, ("Change",))
    change_pct_raw = first_match(kv, ("Change %", "% Change"))
    change_percent = parse_change_percent(change_pct_raw)
    if change_percent is None and change_raw:
        change_percent = parse_change_percent(change_raw)

    return {
        "symbol": symbol,
        "price": price,
        "change_percent": change_percent,
        "change": change_raw,
        "volume": first_match(kv, ("Volume",)),
        "market_cap": first_match(kv, ("Market Cap",)),
        "high_52w": first_match(kv, ("52W High", "52wk High")),
        "low_52w": first_match(kv, ("52W Low", "52wk Low")),
        "sma20_pct": first_match(kv, ("% from SMA 20", "20-Day SMA")),
        "sma50_pct": first_match(kv, ("% from SMA 50", "50-Day SMA")),
        "sma200_pct": first_match(kv, ("% from SMA 200", "200-Day SMA")),
        "rsi": first_match(kv, ("RSI (14)", "RSI")),
        "beta": first_match(kv, ("Beta",)),
        "short_float": first_match(kv, ("Short Float",)),
        "inst_own": first_match(kv, ("Inst Own", "Institutional Ownership")),
        "perf_week": first_match(kv, ("Perf Week",)),
        "perf_month": first_match(kv, ("Perf Month",)),
        "perf_quarter": first_match(kv, ("Perf Quarter",)),
        "perf_half_year": first_match(kv, ("Perf Half Y", "Perf Half Year")),
        "perf_year": first_match(kv, ("Perf Year",)),
        "analyst_date": None,
        "analyst_action": None,
        "analyst_firm": None,
        "analyst_rating_change": None,
        "analyst_price_target": None,
        "news": [],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def supabase_get_watchlist() -> List[str]:
    url = f"{SUPABASE_URL}/rest/v1/watchlist_symbols?select=symbol&order=added_at.desc"
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    rows = r.json()
    return [row["symbol"] for row in rows if row.get("symbol")]


def supabase_get_stock_symbols() -> Dict[str, Optional[str]]:
    url = f"{SUPABASE_URL}/rest/v1/stock_data?select=symbol,updated_at"
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    out: Dict[str, Optional[str]] = {}
    for row in r.json():
        out[row["symbol"]] = row.get("updated_at")
    return out


def supabase_upsert_stock_data(row: Dict[str, Any]) -> None:
    url = f"{SUPABASE_URL}/rest/v1/stock_data?on_conflict=symbol"
    headers = {**HEADERS, "Prefer": "return=minimal,resolution=merge-duplicates"}
    r = requests.post(url, headers=headers, data=json.dumps(row), timeout=60)
    if r.status_code not in (200, 201, 204):
        raise RuntimeError(f"stock_data upsert failed: {r.status_code} {r.text}")


def pick_next_symbol(watchlist: List[str], stock_meta: Dict[str, Optional[str]]) -> Optional[str]:
    if not watchlist:
        return None
    missing = [s for s in watchlist if s not in stock_meta]
    if missing:
        return missing[0]

    def sort_key(sym: str) -> str:
        return stock_meta.get(sym) or "1970-01-01T00:00:00Z"

    return sorted(watchlist, key=sort_key)[0]


def fetch_finviz(symbol: str) -> Dict[str, Any]:
    url = f"https://finviz.com/quote.ashx?t={quote(symbol, safe='')}"
    r = requests.get(url, headers=FINVIZ_HEADERS, timeout=60)
    r.raise_for_status()
    kv = extract_snapshot_kv(r.text)
    if not kv:
        raise RuntimeError(f"Failed to parse finviz snapshot for {symbol}")
    return kv_to_stock_row(symbol, kv)


def main() -> None:
    while True:
        try:
            watchlist = supabase_get_watchlist()
            stock_meta = supabase_get_stock_symbols()
            sym = pick_next_symbol(watchlist, stock_meta)
            if not sym:
                time.sleep(5)
                continue

            row = fetch_finviz(sym)
            supabase_upsert_stock_data(row)
        except Exception as e:
            print(f"[data_updater] error: {e}", flush=True)
        time.sleep(5)


if __name__ == "__main__":
    main()
