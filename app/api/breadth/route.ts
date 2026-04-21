import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import type { MarketBreadthResponse } from "@/lib/types";
import { parseNumericString } from "@/lib/formatters";

let cache: { at: number; payload: MarketBreadthResponse } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return NextResponse.json(cache.payload);
    }
    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("stock_data")
      .select("change_percent, price, high_52w, low_52w, sma50_pct, sma200_pct");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const rows = data ?? [];
    let advancing = 0;
    let declining = 0;
    let unchanged = 0;
    let newHighs = 0;
    let newLows = 0;
    let above50 = 0;
    let above200 = 0;
    let counted50 = 0;
    let counted200 = 0;

    for (const r of rows) {
      const cp = r.change_percent as number | null;
      if (cp == null) continue;
      if (cp > 0) advancing += 1;
      else if (cp < 0) declining += 1;
      else unchanged += 1;

      const price = r.price as number | null;
      const hi = parseNumericString(r.high_52w as string | null);
      const lo = parseNumericString(r.low_52w as string | null);
      if (price != null && hi != null && hi > 0) {
        if (price >= hi * 0.995) newHighs += 1;
      }
      if (price != null && lo != null && lo > 0) {
        if (price <= lo * 1.005) newLows += 1;
      }

      const s50 = parseNumericString(r.sma50_pct as string | null);
      if (s50 != null) {
        counted50 += 1;
        if (s50 > 0) above50 += 1;
      }
      const s200 = parseNumericString(r.sma200_pct as string | null);
      if (s200 != null) {
        counted200 += 1;
        if (s200 > 0) above200 += 1;
      }
    }

    const payload: MarketBreadthResponse = {
      advancing,
      declining,
      unchanged,
      newHighs,
      newLows,
      pctAboveSma50: counted50 ? (above50 / counted50) * 100 : null,
      pctAboveSma200: counted200 ? (above200 / counted200) * 100 : null,
      sampleSize: rows.length,
    };
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
