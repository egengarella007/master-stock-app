"""
Background chart capture service.

Reads watchlist from Supabase, ensures rows exist in chart_metadata,
prioritizes never-captured symbols then oldest captures beyond a 10 minute TTL,
captures Finviz charts for D/W/M using Playwright (parallel threads),
uploads PNGs to Supabase Storage bucket `charts`, and updates chart_metadata.

Runs forever.
"""

from __future__ import annotations

import base64
import json
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

_wake_event = threading.Event()
WAKE_PORT = int(os.environ.get("CHART_WATCHER_WAKE_PORT", "9091"))
WAKE_SECRET = os.environ.get("CHART_WATCHER_WAKE_SECRET", "")


def start_wake_server() -> None:
    if not WAKE_SECRET:
        print("[chart_watcher] ⚠️ no wake secret set, wake server disabled", flush=True)
        return

    class WakeHandler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            if self.path != "/wake":
                self.send_error(404)
                return
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {WAKE_SECRET}":
                self.send_error(401)
                return
            _wake_event.set()
            self.send_response(204)
            self.end_headers()
            print("[chart_watcher] ⚡ wake signal received", flush=True)

        def log_message(self, *args: object) -> None:
            pass

    def serve() -> None:
        bind = os.environ.get("CHART_WATCHER_WAKE_BIND", "0.0.0.0")
        server = ThreadingHTTPServer((bind, WAKE_PORT), WakeHandler)
        server.serve_forever()

    threading.Thread(target=serve, daemon=True, name="wake-server").start()
    print(f"[chart_watcher] ⚡ wake server on port {WAKE_PORT}", flush=True)


SUPABASE_URL = (
    os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    or os.environ.get("SUPABASE_URL")
    or ""
).rstrip("/")

SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or ""
)

if not SUPABASE_URL:
    raise RuntimeError("Set NEXT_PUBLIC_SUPABASE_URL in .env.local")
if not SUPABASE_KEY:
    raise RuntimeError("Set SUPABASE_SERVICE_ROLE_KEY in .env.local")

REST_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
ET = ZoneInfo("America/New_York")


def market_session_state() -> str:
    """
    Returns:
      'open'     — regular session 9:30-16:00 ET
      'cooldown' — 16:00-17:00 ET (1hr after close)
      'closed'   — everything else
    """
    now = datetime.now(ET)
    if now.weekday() >= 5:
        return "closed"
    mins = now.hour * 60 + now.minute
    if 9 * 60 + 30 <= mins < 16 * 60:
        return "open"
    if 16 * 60 <= mins < 17 * 60:
        return "cooldown"
    return "closed"


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_ts(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def supabase_get_watchlist() -> List[str]:
    url = f"{SUPABASE_URL}/rest/v1/watchlist?select=symbol&order=added_at.desc"
    r = requests.get(url, headers=REST_HEADERS, timeout=60)
    r.raise_for_status()
    return [row["symbol"] for row in r.json() if row.get("symbol")]


def supabase_get_chart_metadata() -> Dict[str, Dict[str, Optional[str]]]:
    url = f"{SUPABASE_URL}/rest/v1/chart_metadata?select=symbol,d_updated_at,w_updated_at,m_updated_at"
    r = requests.get(url, headers=REST_HEADERS, timeout=60)
    r.raise_for_status()
    out: Dict[str, Dict[str, Optional[str]]] = {}
    for row in r.json():
        out[row["symbol"]] = row
    return out


def supabase_upsert_chart_metadata_row(symbol: str) -> None:
    url = f"{SUPABASE_URL}/rest/v1/chart_metadata?on_conflict=symbol"
    headers = {**REST_HEADERS, "Prefer": "return=minimal,resolution=merge-duplicates"}
    body = {"symbol": symbol}
    r = requests.post(url, headers=headers, data=json.dumps(body), timeout=60)
    if r.status_code not in (200, 201, 204):
        raise RuntimeError(f"chart_metadata upsert failed: {r.status_code} {r.text}")


def supabase_patch_chart_metadata(symbol: str, patch: Dict[str, Any]) -> None:
    url = f"{SUPABASE_URL}/rest/v1/chart_metadata?symbol=eq.{quote(symbol, safe='')}"
    r = requests.patch(url, headers=REST_HEADERS, data=json.dumps(patch), timeout=60)
    if r.status_code not in (200, 204):
        raise RuntimeError(f"chart_metadata patch failed: {r.status_code} {r.text}")


def storage_object_name(symbol: str, period: str) -> str:
    safe = symbol.replace("^", "_CARET_")
    return f"stocks/{safe}_{period.upper()}.png"


def storage_upload(object_name: str, png_bytes: bytes) -> None:
    upload_url = f"{SUPABASE_URL}/storage/v1/object/charts/{object_name}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png",
        "x-upsert": "true",
    }
    r = requests.put(upload_url, headers=headers, data=png_bytes, timeout=120)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"storage upload failed: {r.status_code} {r.text}")


def upload_to_supabase_storage(local_path: str, object_name: str) -> None:
    png_bytes = Path(local_path).read_bytes()
    storage_upload(object_name, png_bytes)


def capture_finviz_chart_png(symbol: str, period: str) -> bytes:
    p = period.lower()
    if p not in ("d", "w", "m"):
        raise ValueError("period must be d, w, or m")

    url = f"https://finviz.com/quote.ashx?t={symbol}&p={p}"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        context.add_cookies(
            [
                {
                    "name": "theme",
                    "value": "dark",
                    "domain": ".finviz.com",
                    "path": "/",
                }
            ]
        )
        page = context.new_page()
        page.set_default_timeout(30_000)

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)

            try:
                page.wait_for_selector(".canvas.outline-none", timeout=15_000)
            except Exception:
                pass

            page.wait_for_timeout(4000)

            data_url = page.evaluate(
                """() => {
                const nodes = Array.from(
                    document.querySelectorAll('.canvas.outline-none')
                );
                for (const container of nodes) {
                    const canvases = container.querySelectorAll('canvas');
                    if (!canvases.length) continue;
                    const scale = 3;
                    const w = canvases[0].width;
                    const h = canvases[0].height;
                    const ec = document.createElement('canvas');
                    ec.width = w * scale;
                    ec.height = h * scale;
                    const ctx = ec.getContext('2d');
                    ctx.scale(scale, scale);
                    ctx.fillStyle = '#1b1b1b';
                    ctx.fillRect(0, 0, w, h);
                    canvases.forEach(c => ctx.drawImage(c, 0, 0));
                    return ec.toDataURL('image/png', 1.0);
                }
                return null;
            }"""
            )

            if not data_url:
                raise RuntimeError(f"no canvas found for {symbol} {period}")

            return base64.b64decode(data_url.split(",", 1)[1])
        finally:
            context.close()
            browser.close()


def capture_period_worker(args: Tuple[str, str]) -> Tuple[str, bytes]:
    symbol, period = args
    png = capture_finviz_chart_png(symbol, period)
    return period, png


def newest_capture(meta: Dict[str, Optional[str]]) -> Optional[datetime]:
    times = [parse_ts(meta.get("d_updated_at")), parse_ts(meta.get("w_updated_at")), parse_ts(meta.get("m_updated_at"))]
    times_n = [t for t in times if t is not None]
    if not times_n:
        return None
    return max(times_n)


def never_captured(meta: Optional[Dict[str, Optional[str]]]) -> bool:
    if not meta:
        return True
    return (
        meta.get("d_updated_at") is None
        and meta.get("w_updated_at") is None
        and meta.get("m_updated_at") is None
    )


def pick_symbol(watchlist: List[str], meta_by_sym: Dict[str, Dict[str, Optional[str]]]) -> Optional[str]:
    if not watchlist:
        return None

    now = datetime.now(timezone.utc)
    ttl = 30 * 60

    never: List[str] = []
    stale: List[Tuple[str, datetime]] = []
    for sym in watchlist:
        meta = meta_by_sym.get(sym)
        if never_captured(meta):
            never.append(sym)
            continue
        newest = newest_capture(meta or {})
        if newest is None:
            never.append(sym)
            continue
        if (now - newest).total_seconds() >= ttl:
            stale.append((sym, newest))

    if never:
        return never[0]
    if stale:
        stale.sort(key=lambda t: t[1])
        return stale[0][0]
    return None


def process_symbol(symbol: str) -> None:
    tasks: List[Tuple[str, str]] = [(symbol, "d"), (symbol, "w"), (symbol, "m")]
    results: Dict[str, bytes] = {}
    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = [ex.submit(capture_period_worker, t) for t in tasks]
        for fut in as_completed(futures):
            period, png = fut.result()
            results[period] = png

    patch: Dict[str, Any] = {}
    now = iso_now()
    for period, png in results.items():
        name = storage_object_name(symbol, period)
        storage_upload(name, png)
        if period == "d":
            patch["d_updated_at"] = now
        elif period == "w":
            patch["w_updated_at"] = now
        else:
            patch["m_updated_at"] = now

    supabase_patch_chart_metadata(symbol, patch)


def capture_index_charts() -> None:
    print("[chart_watcher] 📸 capturing index charts...")

    charts = [
        ("nasdaq", '[data-testid="chart-0-pane-0-canvas"] canvas'),
        ("sp500", '[data-testid="chart-1-pane-0-canvas"] canvas'),
        ("dow", '[data-testid="chart-2-pane-0-canvas"] canvas'),
    ]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        context.add_cookies(
            [
                {
                    "name": "theme",
                    "value": "dark",
                    "domain": ".finviz.com",
                    "path": "/",
                }
            ]
        )
        page = context.new_page()

        try:
            page.goto("https://finviz.com/", wait_until="domcontentloaded", timeout=30_000)
            try:
                page.wait_for_selector(
                    '[data-testid="chart-0-pane-0-canvas"] canvas',
                    timeout=15_000,
                )
            except Exception:
                pass
            page.wait_for_timeout(4000)

            for name, selector in charts:
                try:
                    page.locator(selector).first.wait_for(
                        state="attached", timeout=10_000
                    )

                    data_url = page.evaluate(
                        """(selector) => {
                        const el = document.querySelector(selector);
                        if (!el) return null;

                        const container = el.closest('.canvas-wrap') || el.parentElement;
                        const canvases = container
                            ? container.querySelectorAll('canvas')
                            : [el];

                        const scale = 2;
                        const w = el.width;
                        const h = el.height;
                        const ec = document.createElement('canvas');
                        ec.width = w * scale;
                        ec.height = h * scale;
                        const ctx = ec.getContext('2d');
                        if (!ctx) return null;
                        ctx.scale(scale, scale);
                        ctx.fillStyle = '#1b1b1b';
                        ctx.fillRect(0, 0, w, h);
                        canvases.forEach((c) => ctx.drawImage(c, 0, 0));
                        return ec.toDataURL('image/png', 1.0);
                    }""",
                        selector,
                    )

                    if data_url and data_url.startswith("data:image/png"):
                        img_bytes = base64.b64decode(data_url.split(",", 1)[1])

                        local_path = ROOT / "public" / "charts" / "index" / f"{name}.png"
                        local_path.parent.mkdir(parents=True, exist_ok=True)
                        local_path.write_bytes(img_bytes)

                        upload_to_supabase_storage(str(local_path), f"index/{name}.png")
                        print(f"[chart_watcher] ✅ index {name} captured and uploaded")
                    else:
                        print(f"[chart_watcher] ⚠️ no canvas data for {name}")
                except Exception as e:
                    print(f"[chart_watcher] ❌ index {name}: {e}")
        finally:
            context.close()
            browser.close()


def main() -> None:
    start_wake_server()
    print("[chart_watcher] 🚀 starting chart watcher", flush=True)
    print(f"[chart_watcher] Supabase: {SUPABASE_URL}", flush=True)
    print(
        "[chart_watcher] 📈 Mon–Fri: full rotation 09:30–17:00 ET (session + 1h cooldown); "
        "otherwise new symbols only; index charts only during open/cooldown.",
        flush=True,
    )

    last_index_capture = 0.0
    while True:
        state = market_session_state()
        # Full capture rotation during regular hours and 1h post-close cool-down
        if state == "open" or state == "cooldown":
            try:
                watchlist = supabase_get_watchlist()
                print(f"[chart_watcher] 📋 watchlist: {watchlist}", flush=True)
                meta_by_sym = supabase_get_chart_metadata()

                for sym in watchlist:
                    if sym not in meta_by_sym:
                        print(f"[chart_watcher] 🆕 adding {sym} to chart_metadata", flush=True)
                        supabase_upsert_chart_metadata_row(sym)

                meta_by_sym = supabase_get_chart_metadata()
                sym = pick_symbol(watchlist, meta_by_sym)

                if sym:
                    print(f"[chart_watcher] 📸 capturing {sym}...", flush=True)
                    process_symbol(sym)
                    print(f"[chart_watcher] ✅ {sym} done", flush=True)
                else:
                    print("[chart_watcher] ✅ all charts fresh", flush=True)

                now = time.time()
                if now - last_index_capture >= 60:
                    try:
                        capture_index_charts()
                        last_index_capture = now
                        print("[chart_watcher] ✅ index charts updated", flush=True)
                    except Exception as e:
                        print(f"[chart_watcher] ❌ index capture failed: {e}", flush=True)

            except Exception as e:
                print(f"[chart_watcher] error: {e}", flush=True)

            # Wait up to 5 seconds OR wake immediately if signal received
            _wake_event.wait(timeout=5)
            _wake_event.clear()
        else:
            last_index_capture = 0.0
            try:
                watchlist = supabase_get_watchlist()
                meta_by_sym = supabase_get_chart_metadata()

                # Ensure chart_metadata rows exist
                for sym in watchlist:
                    if sym not in meta_by_sym:
                        print(f"[chart_watcher] 🆕 new symbol: {sym}", flush=True)
                        supabase_upsert_chart_metadata_row(sym)

                meta_by_sym = supabase_get_chart_metadata()

                # Only capture never-captured symbols after hours
                new_symbols = [
                    sym for sym in watchlist
                    if never_captured(meta_by_sym.get(sym))
                ]

                if new_symbols:
                    sym = new_symbols[0]
                    print(
                        f"[chart_watcher] 🌙 market closed — "
                        f"capturing new symbol: {sym}",
                        flush=True,
                    )
                    process_symbol(sym)
                    print(f"[chart_watcher] ✅ {sym} done (after hours)", flush=True)
                else:
                    et = datetime.now(ET)
                    print(
                        f"[chart_watcher] 🌙 NYSE closed "
                        f"({et.strftime('%a %H:%M %Z')}) — no new symbols",
                        flush=True,
                    )

            except Exception as e:
                print(f"[chart_watcher] error: {e}", flush=True)

            # Wait 30 minutes or wake immediately from signal
            _wake_event.wait(timeout=30 * 60)
            _wake_event.clear()


if __name__ == "__main__":
    main()
