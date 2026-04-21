"""
Background chart capture service.

Reads watchlist from Supabase, ensures rows exist in chart_metadata,
prioritizes never-captured symbols then oldest captures beyond a 10 minute TTL,
captures Finviz charts for D/W/M using Playwright (parallel threads),
uploads PNGs to Supabase Storage bucket `charts`, and updates chart_metadata.

Runs forever.
"""

from __future__ import annotations

import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()


def supabase_base_url() -> str:
    base = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    if not base:
        raise RuntimeError("Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
    return base.rstrip("/")


SUPABASE_URL = supabase_base_url()
SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

REST_HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


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
    return f"{safe}_{period.upper()}.png"


def storage_upload(object_name: str, png_bytes: bytes) -> None:
    upload_url = f"{SUPABASE_URL}/storage/v1/object/charts/{object_name}"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "image/png",
        "x-upsert": "true",
    }
    r = requests.put(upload_url, headers=headers, data=png_bytes, timeout=120)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"storage upload failed: {r.status_code} {r.text}")


def capture_finviz_chart_png(symbol: str, period: str) -> bytes:
    p = period.lower()
    if p not in ("d", "w", "m"):
        raise ValueError("period must be d, w, or m")

    chart_url = f"https://finviz.com/chart.ashx?t={symbol}&ty=c&ta=1&p={p}&s=l"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        context.add_cookies(
            [
                {
                    "name": "screenerchartisdark",
                    "value": "true",
                    "domain": ".finviz.com",
                    "path": "/",
                }
            ]
        )
        page = context.new_page()
        page.goto(chart_url, wait_until="networkidle", timeout=120_000)
        page.wait_for_timeout(1500)
        locator = page.locator('img[src*="chart.ashx"]').first
        png = locator.screenshot(type="png")
        context.close()
        browser.close()
        return png


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
    ttl = 10 * 60

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


def capture_index_files() -> None:
    mapping = [
        ("DIA", "INDEX_DJ_D.png"),
        ("QQQ", "INDEX_NDX_D.png"),
        ("SPY", "INDEX_SPX_D.png"),
    ]
    for sym, filename in mapping:
        png = capture_finviz_chart_png(sym, "d")
        storage_upload(filename, png)


def main() -> None:
    last_index = 0.0
    while True:
        try:
            watchlist = supabase_get_watchlist()
            meta_by_sym = supabase_get_chart_metadata()
            for sym in watchlist:
                if sym not in meta_by_sym:
                    supabase_upsert_chart_metadata_row(sym)
            meta_by_sym = supabase_get_chart_metadata()

            sym = pick_symbol(watchlist, meta_by_sym)
            if sym:
                process_symbol(sym)

            now = time.time()
            if now - last_index > 60 * 30:
                capture_index_files()
                last_index = now
        except Exception as e:
            print(f"[chart_watcher] error: {e}", flush=True)

        time.sleep(2)


if __name__ == "__main__":
    main()
