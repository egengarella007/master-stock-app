from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv

try:
    from bs4 import BeautifulSoup
except ImportError as e:
    print(
        "[updater] ❌ beautifulsoup4 is required: pip install beautifulsoup4",
        file=sys.stderr,
    )
    raise e

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://finviz.com/",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

FETCH_INTERVAL = 5


def get_next_symbol() -> str | None:
    """
    Single watchlist table:
    1. Rows where updated_at IS NULL (never fetched), oldest added_at first
    2. Else oldest updated_at first
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    try:
        url_never = (
            f"{SUPABASE_URL}/rest/v1/watchlist"
            f"?select=symbol&updated_at=is.null&order=added_at.asc&limit=1"
        )
        req = urllib.request.Request(url_never, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
        if rows and rows[0].get("symbol"):
            symbol = str(rows[0]["symbol"]).strip().upper()
            print(f"[updater] 🆕 never fetched: {symbol}")
            return symbol

        url_old = (
            f"{SUPABASE_URL}/rest/v1/watchlist"
            f"?select=symbol,updated_at&order=updated_at.asc.nullslast&limit=1"
        )
        req2 = urllib.request.Request(url_old, headers=headers)
        with urllib.request.urlopen(req2, timeout=10) as resp2:
            rows2 = json.loads(resp2.read().decode("utf-8"))
        if rows2 and rows2[0].get("symbol"):
            symbol = str(rows2[0]["symbol"]).strip().upper()
            updated = rows2[0].get("updated_at", "never")
            print(f"[updater] 🔄 oldest updated_at: {symbol} (last: {updated})")
            return symbol

        return None

    except Exception as e:
        print(f"[updater] ❌ get_next_symbol failed: {e}")
        return None


def first_price_token(raw: str | None) -> str | None:
    if not raw:
        return None
    m = re.match(r"^([\d,.]+)", raw.strip())
    return m.group(1) if m else None


def build_snapshot_map(html: str) -> dict[str, str]:
    """Match app logic: `finvizQuoteParser` snapshot-table2 label → value."""
    soup = BeautifulSoup(html, "html.parser")
    out: dict[str, str] = {}
    for el in soup.select(".snapshot-table2 .snapshot-td-label"):
        label = re.sub(r"\s+", " ", el.get_text()).strip()
        if not label:
            continue
        td = el.find_parent("td")
        if td is None:
            continue
        nxt = td.find_next_sibling("td")
        if nxt is None:
            continue
        content = nxt.select_one(".snapshot-td-content")
        node = content if content is not None else nxt
        val = re.sub(r"\s+", " ", node.get_text(separator=" ", strip=True)).strip()
        if label:
            out[label] = val
    return out


def parse_header_change(soup: BeautifulSoup) -> tuple[str | None, float | None]:
    rows = soup.select(".quote-price_wrapper_change .table-row")
    if len(rows) < 2:
        return None, None
    dollar_el = rows[0]
    for sr in dollar_el.select(".sr-only"):
        sr.decompose()
    dollar = re.sub(r"\s+", "", dollar_el.get_text()).strip() or None

    pct_el = rows[1]
    for sr in pct_el.select(".sr-only"):
        sr.decompose()
    pct_raw = re.sub(r"\s+", "", pct_el.get_text()).replace("%", "").strip()
    change_pct: float | None
    try:
        change_pct = float(pct_raw) if pct_raw else None
    except ValueError:
        change_pct = None
    return dollar, change_pct


def parse_first_analyst_row(soup: BeautifulSoup) -> dict[str, str | None]:
    row = None
    for candidate in soup.select("tr.styled-row.is-hoverable"):
        cls = candidate.get("class") or []
        if "hidden" in cls:
            continue
        row = candidate
        break
    if row is None:
        row = soup.select_one("tr.styled-row.is-hoverable")
    if row is None:
        return {
            "analyst_date": None,
            "analyst_action": None,
            "analyst_firm": None,
            "analyst_rating_change": None,
            "analyst_price_target": None,
        }
    tds = row.find_all("td", recursive=False)
    if len(tds) < 5:
        return {
            "analyst_date": None,
            "analyst_action": None,
            "analyst_firm": None,
            "analyst_rating_change": None,
            "analyst_price_target": None,
        }

    def t(i: int) -> str | None:
        if i >= len(tds):
            return None
        return re.sub(r"\s+", " ", tds[i].get_text()).strip() or None

    action_cell = tds[1]
    fv = action_cell.select_one(".fv-label")
    action_txt = (
        re.sub(r"\s+", " ", fv.get_text()).strip()
        if fv
        else (t(1) or "")
    ) or None

    return {
        "analyst_date": t(0),
        "analyst_action": action_txt,
        "analyst_firm": t(2),
        "analyst_rating_change": t(3),
        "analyst_price_target": t(4),
    }


def parse_finviz_html(symbol: str, html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    snap = build_snapshot_map(html)
    ch_dollar, ch_pct = parse_header_change(soup)
    analyst = parse_first_analyst_row(soup)

    price_el = soup.select_one(".quote-price_wrapper_price")
    price_txt = (
        price_el.get_text(strip=True)
        if price_el is not None
        else snap.get("Price")
    )
    price: float | None = None
    if price_txt:
        try:
            price = float(price_txt.replace(",", "").strip())
        except ValueError:
            pass

    change_pct = ch_pct
    if change_pct is None and snap.get("Change"):
        raw = snap["Change"].replace("%", "").strip()
        try:
            change_pct = float(raw)
        except ValueError:
            pass

    high_raw = snap.get("52W High")
    low_raw = snap.get("52W Low")

    return {
        "symbol": symbol,
        "price": price,
        "change": ch_dollar,
        "change_percent": change_pct,
        "volume": snap.get("Volume"),
        "market_cap": snap.get("Market Cap"),
        "high_52w": first_price_token(high_raw) or high_raw,
        "low_52w": first_price_token(low_raw) or low_raw,
        "sma20_pct": snap.get("SMA20"),
        "sma50_pct": snap.get("SMA50"),
        "sma200_pct": snap.get("SMA200"),
        "rsi": snap.get("RSI (14)"),
        "beta": snap.get("Beta"),
        "short_float": snap.get("Short Float"),
        "inst_own": snap.get("Inst Own"),
        "perf_week": snap.get("Perf Week"),
        "perf_month": snap.get("Perf Month"),
        "perf_quarter": snap.get("Perf Quarter"),
        "perf_half_year": snap.get("Perf Half Y"),
        "perf_year": snap.get("Perf Year"),
        "analyst_date": analyst["analyst_date"],
        "analyst_action": analyst["analyst_action"],
        "analyst_firm": analyst["analyst_firm"],
        "analyst_rating_change": analyst["analyst_rating_change"],
        "analyst_price_target": analyst["analyst_price_target"],
        "news": [],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_finviz_data(symbol: str) -> dict | None:
    try:
        url = f"https://finviz.com/quote.ashx?t={quote(symbol, safe='')}"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        return parse_finviz_html(symbol, html)
    except urllib.error.HTTPError as e:
        print(f"[updater] ❌ HTTP {e.code} for {symbol}: {e.reason}")
        return None
    except Exception as e:
        print(f"[updater] ❌ fetch failed {symbol}: {e}")
        return None


def save_to_supabase(data: dict) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    payload = {
        "symbol": data["symbol"],
        "price": data.get("price"),
        "change": data.get("change"),
        "change_percent": data.get("change_percent"),
        "volume": data.get("volume"),
        "market_cap": data.get("market_cap"),
        "high_52w": data.get("high_52w"),
        "low_52w": data.get("low_52w"),
        "sma20_pct": data.get("sma20_pct"),
        "sma50_pct": data.get("sma50_pct"),
        "sma200_pct": data.get("sma200_pct"),
        "rsi": data.get("rsi"),
        "beta": data.get("beta"),
        "short_float": data.get("short_float"),
        "inst_own": data.get("inst_own"),
        "perf_week": data.get("perf_week"),
        "perf_month": data.get("perf_month"),
        "perf_quarter": data.get("perf_quarter"),
        "perf_half_year": data.get("perf_half_year"),
        "perf_year": data.get("perf_year"),
        "analyst_date": data.get("analyst_date"),
        "analyst_action": data.get("analyst_action"),
        "analyst_firm": data.get("analyst_firm"),
        "analyst_rating_change": data.get("analyst_rating_change"),
        "analyst_price_target": data.get("analyst_price_target"),
        "news": data.get("news") if data.get("news") is not None else [],
        "updated_at": data.get("updated_at"),
    }

    try:
        body = json.dumps(payload, default=str).encode("utf-8")
        url = f"{SUPABASE_URL}/rest/v1/watchlist?on_conflict=symbol"
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal,resolution=merge-duplicates",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
        return True
    except Exception as e:
        print(f"[updater] ❌ save failed {data.get('symbol')}: {e}")
        return False


def print_data(data: dict) -> None:
    sym = data.get("symbol")
    price = data.get("price")
    ch = data.get("change")
    pct = data.get("change_percent")
    print(f"\n{'=' * 50}")
    print(f"  {sym}  ${price}  {ch} ({pct}%)")
    print(f"{'=' * 50}")
    print(f"  Volume:        {data.get('volume')}")
    print(f"  Market Cap:    {data.get('market_cap')}")
    print(f"  52W High:      {data.get('high_52w')}")
    print(f"  52W Low:       {data.get('low_52w')}")
    print(f"  SMA20:         {data.get('sma20_pct')}")
    print(f"  SMA50:         {data.get('sma50_pct')}")
    print(f"  SMA200:        {data.get('sma200_pct')}")
    print(f"  RSI(14):       {data.get('rsi')}")
    print(f"  Beta:          {data.get('beta')}")
    print(f"  Short Float:   {data.get('short_float')}")
    print(f"  Inst Own:      {data.get('inst_own')}")
    print(f"  Perf Week:     {data.get('perf_week')}")
    print(f"  Perf Month:    {data.get('perf_month')}")
    print(f"  Perf Quarter:  {data.get('perf_quarter')}")
    print(f"  Perf Half Y:   {data.get('perf_half_year')}")
    print(f"  Perf Year:     {data.get('perf_year')}")
    if data.get("analyst_action"):
        print(
            f"  Analyst:       {data.get('analyst_date')} "
            f"{data.get('analyst_action')} — {data.get('analyst_firm')}"
        )
        print(f"  Rating change: {data.get('analyst_rating_change')}")
        print(f"  Price target:  {data.get('analyst_price_target')}")


def main() -> None:
    print("[updater] 🚀 starting stock data updater")
    print(f"[updater] checking for new/stale stocks every {FETCH_INTERVAL}s")

    while True:
        symbol = get_next_symbol()

        if not symbol:
            print("[updater] ⚠️ no symbols found, retrying in 30s")
            time.sleep(30)
            continue

        print(f"[updater] fetching {symbol}...")
        data = fetch_finviz_data(symbol)

        if data:
            print_data(data)
            if save_to_supabase(data):
                print(f"[updater] ✅ saved {symbol}")
            else:
                print(f"[updater] ❌ save failed {symbol}")
        else:
            print(f"[updater] ⚠️ no data returned for {symbol}")

        time.sleep(FETCH_INTERVAL)


if __name__ == "__main__":
    main()
