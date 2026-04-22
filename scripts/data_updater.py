from __future__ import annotations

import json
import math
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

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
BREADTH_INTERVAL = 300  # 5 minutes
# Sentinel so first loop always passes (now - last >= BREADTH_INTERVAL).
last_breadth_fetch = -BREADTH_INTERVAL
# Seconds between DB checks when NYSE is closed and there are no pending new rows
# (so a ticker added from the UI is picked up quickly).
CLOSED_POLL_INTERVAL = 15

# Optional: HTTP wake so the app (or anything) can skip this sleep immediately.
# Set UPDATER_WAKE_PORT (e.g. 9090) and UPDATER_WAKE_SECRET (long random string).
# POST http://127.0.0.1:9090/wake with header Authorization: Bearer <secret>
# Next.js: set UPDATER_WAKE_URL + UPDATER_WAKE_SECRET to match (see app/api/watchlist).
_wake_event = threading.Event()

NYSE_TZ = ZoneInfo("America/New_York")
# Regular session only (Mon–Fri 09:30–16:00 ET). Does not model exchange holidays.
NYSE_OPEN_MIN = 9 * 60 + 30
NYSE_CLOSE_MIN = 16 * 60


def nyse_regular_session_open(now_utc: datetime | None = None) -> bool:
    """True during NYSE regular hours in America/New_York (DST-aware)."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    elif now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)
    et = now_utc.astimezone(NYSE_TZ)
    if et.weekday() >= 5:
        return False
    mins = et.hour * 60 + et.minute
    return NYSE_OPEN_MIN <= mins < NYSE_CLOSE_MIN


def _ignore_market_hours() -> bool:
    return (os.environ.get("UPDATER_IGNORE_MARKET_HOURS") or "").strip() in (
        "1",
        "true",
        "yes",
    )


def _sleep_closed_poll() -> None:
    """Sleep CLOSED_POLL_INTERVAL unless HTTP wake fires (see start_wake_server_if_configured)."""
    elapsed = 0.0
    step = 1.0
    while elapsed < CLOSED_POLL_INTERVAL:
        remaining = CLOSED_POLL_INTERVAL - elapsed
        timeout = min(step, remaining)
        if _wake_event.wait(timeout):
            _wake_event.clear()
            print("[updater] ⚡ wake (HTTP) — checking queue now", flush=True)
            return
        elapsed += timeout


def _make_wake_handler(secret: str) -> type[BaseHTTPRequestHandler]:
    class WakeHandler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            path = self.path.split("?", 1)[0]
            if path != "/wake":
                self.send_error(404)
                return
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {secret}":
                self.send_error(401)
                return
            _wake_event.set()
            self.send_response(204)
            self.end_headers()

        def log_message(self, *_args: object) -> None:
            pass

    return WakeHandler


def start_wake_server_if_configured() -> None:
    raw_port = (os.environ.get("UPDATER_WAKE_PORT") or "").strip()
    port = int(raw_port) if raw_port.isdigit() else 0
    secret = (os.environ.get("UPDATER_WAKE_SECRET") or "").strip()
    bind = (os.environ.get("UPDATER_WAKE_BIND") or "127.0.0.1").strip() or "127.0.0.1"

    if port <= 0:
        return
    if not secret:
        print(
            "[updater] ⚠️ UPDATER_WAKE_PORT set but UPDATER_WAKE_SECRET empty — wake server disabled",
            flush=True,
        )
        return

    handler = _make_wake_handler(secret)

    def serve() -> None:
        srv = ThreadingHTTPServer((bind, port), handler)
        srv.serve_forever()

    threading.Thread(target=serve, daemon=True, name="updater-wake-http").start()
    print(
        f"[updater] ⚡ wake server listening POST http://{bind}:{port}/wake",
        flush=True,
    )


def _safe_numeric(v: object) -> object | None:
    """PostgREST JSON must not contain NaN/Infinity."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def get_next_symbol(*, pending_only: bool = False) -> str | None:
    """
    Before each Finviz pull, pick one symbol from `watchlist`:

    1. **New / not yet filled** — `updated_at` is NULL (e.g. just added in the UI).
       Take the **most recently added** (`added_at` DESC) so a brand-new ticker
       jumps ahead of older symbols that were never synced.

    2. **Otherwise** (skipped when ``pending_only=True``) — every row has been fetched
       at least once. Take the **stalest** row: smallest `updated_at`.

    When NYSE is closed, callers pass ``pending_only=True`` so we only fill new rows
    and do not refresh stale quotes.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    try:
        # Queue 1: newly added or never successfully saved — prioritize latest add.
        url_new = (
            f"{SUPABASE_URL}/rest/v1/watchlist"
            f"?select=symbol,added_at&updated_at=is.null&order=added_at.desc&limit=1"
        )
        req = urllib.request.Request(url_new, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
        if rows and rows[0].get("symbol"):
            symbol = str(rows[0]["symbol"]).strip().upper()
            print(f"[updater] 🆕 new / pending first fetch: {symbol} (added {rows[0].get('added_at', '?')})")
            return symbol

        if pending_only:
            return None

        # Queue 2: rows already synced at least once — smallest `updated_at`
        # in Supabase = longest time since that row was last written (stalest).
        # PostgREST: `is` operator with `not_null` (see postgrest filter docs).
        url_stale = (
            f"{SUPABASE_URL}/rest/v1/watchlist"
            f"?select=symbol,updated_at&updated_at=is.not_null&order=updated_at.asc&limit=1"
        )
        req2 = urllib.request.Request(url_stale, headers=headers)
        with urllib.request.urlopen(req2, timeout=10) as resp2:
            rows2 = json.loads(resp2.read().decode("utf-8"))
        if rows2 and rows2[0].get("symbol"):
            symbol = str(rows2[0]["symbol"]).strip().upper()
            updated = rows2[0].get("updated_at", "never")
            print(f"[updater] 🔄 stalest refresh: {symbol} (last: {updated})")
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
    raw = {
        "symbol": data["symbol"],
        "price": _safe_numeric(data.get("price")),
        "change": data.get("change"),
        "change_percent": _safe_numeric(data.get("change_percent")),
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
        "updated_at": data.get("updated_at"),
    }
    # Do not send `news` unless the table has that column (PGRST204 otherwise).
    # To add it: ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS news JSONB DEFAULT '[]'::jsonb;
    payload: dict = {"symbol": raw["symbol"], "updated_at": raw["updated_at"]}
    for k, v in raw.items():
        if k in ("symbol", "updated_at"):
            continue
        if v is not None:
            payload[k] = v

    try:
        # strict JSON: PostgREST rejects NaN/Infinity from default float encoding
        body = json.dumps(payload, allow_nan=False, default=str).encode("utf-8")
        url = f"{SUPABASE_URL}/rest/v1/watchlist?on_conflict=symbol"
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                # merge-duplicates = UPSERT on primary key / on_conflict columns
                "Prefer": "resolution=merge-duplicates",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
        return True
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        print(
            f"[updater] ❌ save failed {data.get('symbol')}: HTTP {e.code} {e.reason}\n{detail}",
            flush=True,
        )
        return False
    except (TypeError, ValueError) as e:
        # e.g. allow_nan=False caught NaN when building JSON
        print(f"[updater] ❌ save failed {data.get('symbol')}: invalid payload for JSON ({e})", flush=True)
        return False
    except Exception as e:
        print(f"[updater] ❌ save failed {data.get('symbol')}: {e}", flush=True)
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


def breadth_needs_fetch() -> bool:
    """
    Returns True if:
    1. Market is open (NYSE regular hours), OR
    2. Breadth has never been populated (advancing is null)
    """
    print(
        f"[updater] 🔍 breadth_needs_fetch: market_open={nyse_regular_session_open()}",
        flush=True,
    )
    if nyse_regular_session_open():
        return True

    try:
        url = f"{SUPABASE_URL}/rest/v1/market_breadth?select=advancing&id=eq.1"
        req = urllib.request.Request(
            url,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
        print(f"[updater] 🔍 breadth row: {rows}", flush=True)
        if rows and rows[0].get("advancing") is not None:
            return False  # Has real data, market closed, skip
        return True  # advancing is null, fetch once to populate
    except Exception:
        return False


def fetch_and_save_breadth() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        req = urllib.request.Request("https://finviz.com/", headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        adv = re.search(r"Advancing.*?(\d[\d,]+)", html, re.DOTALL)
        dec = re.search(r"Declining.*?(\d[\d,]+)", html, re.DOTALL)
        highs = re.search(r"New High.*?(\d[\d,]+)", html, re.DOTALL)
        lows = re.search(r"New Low.*?(\d[\d,]+)", html, re.DOTALL)
        sma50 = re.search(r"Above SMA50.*?([\d.]+)%", html, re.DOTALL)
        sma200 = re.search(r"Above SMA200.*?([\d.]+)%", html, re.DOTALL)

        def parse_int(m: re.Match[str] | None) -> int | None:
            if not m:
                return None
            return int(m.group(1).replace(",", ""))

        def parse_float_pct(m: re.Match[str] | None) -> float | None:
            if not m:
                return None
            try:
                return float(m.group(1))
            except ValueError:
                return None

        payload = {
            "id": 1,
            "advancing": parse_int(adv),
            "declining": parse_int(dec),
            "new_highs": parse_int(highs),
            "new_lows": parse_int(lows),
            "above_sma50_pct": parse_float_pct(sma50),
            "above_sma200_pct": parse_float_pct(sma200),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        body = json.dumps(payload).encode("utf-8")
        req2 = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/market_breadth?on_conflict=id",
            data=body,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
            method="POST",
        )
        urllib.request.urlopen(req2, timeout=10)
        print(
            f"[updater] ✅ breadth saved: adv={payload['advancing']} "
            f"dec={payload['declining']} highs={payload['new_highs']} lows={payload['new_lows']}",
            flush=True,
        )
    except Exception as e:
        print(f"[updater] ❌ breadth fetch failed: {e}", flush=True)


def main() -> None:
    global last_breadth_fetch

    print("[updater] 🚀 starting stock data updater")
    print(f"[updater] checking for new/stale stocks every {FETCH_INTERVAL}s")
    start_wake_server_if_configured()
    if _ignore_market_hours():
        print("[updater] ⚙️ UPDATER_IGNORE_MARKET_HOURS set — full refresh any time")
    else:
        print(
            "[updater] ⏸️ NYSE closed: only new watchlist rows (`updated_at` null) are scraped; "
            "regular session (Mon–Fri 09:30–16:00 ET): full stale refresh. Holidays not modeled."
        )

    while True:
        now = time.time()
        if now - last_breadth_fetch >= BREADTH_INTERVAL:
            if breadth_needs_fetch():
                fetch_and_save_breadth()
                last_breadth_fetch = now
            else:
                print("[updater] 🌙 NYSE closed — skipping breadth", flush=True)
                last_breadth_fetch = now

        ignore_hours = _ignore_market_hours()
        market_open = ignore_hours or nyse_regular_session_open()

        if market_open:
            symbol = get_next_symbol(pending_only=False)
        else:
            symbol = get_next_symbol(pending_only=True)
            if not symbol:
                et = datetime.now(timezone.utc).astimezone(NYSE_TZ)
                print(
                    f"[updater] 🌙 NYSE closed (now {et.strftime('%a %Y-%m-%d %H:%M %Z')}), "
                    f"no pending new symbols — sleeping up to {CLOSED_POLL_INTERVAL}s (wakeable)"
                )
                _sleep_closed_poll()
                continue

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
