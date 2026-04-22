import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import type { WatchlistRecord } from "@/lib/types";

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

function isValidSymbol(sym: string): boolean {
  return /^[A-Z0-9.\-]{1,15}$/.test(sym);
}

/** If `data_updater.py` wake server is configured, skip its closed-market sleep. */
function notifyUpdaterWake(): void {
  const url = process.env.UPDATER_WAKE_URL?.trim();
  const secret = process.env.UPDATER_WAKE_SECRET?.trim();
  if (!url || !secret) return;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 2500);
  void fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: ac.signal,
  })
    .catch(() => {})
    .finally(() => clearTimeout(t));
}

export async function GET() {
  try {
    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("change_percent", { ascending: false, nullsFirst: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const items = (data ?? []) as WatchlistRecord[];
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { symbol?: string };
    const sym = typeof body.symbol === "string" ? normalizeSymbol(body.symbol) : "";
    if (!sym) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }
    if (!isValidSymbol(sym)) {
      return NextResponse.json({ error: "Invalid symbol format" }, { status: 400 });
    }
    const supabase = getSupabaseService();
    const { error } = await supabase.from("watchlist").upsert(
      { symbol: sym },
      { onConflict: "symbol", ignoreDuplicates: true },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { error: chartMetaError } = await supabase
      .from("chart_metadata")
      .upsert({ symbol: sym }, { onConflict: "symbol", ignoreDuplicates: true });
    if (chartMetaError) {
      return NextResponse.json({ error: chartMetaError.message }, { status: 500 });
    }
    notifyUpdaterWake();
    const wakeUrl = process.env.CHART_WATCHER_WAKE_URL;
    const wakeSecret = process.env.CHART_WATCHER_WAKE_SECRET;
    if (wakeUrl && wakeSecret) {
      fetch(wakeUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${wakeSecret}` },
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, symbol: sym });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { symbol?: string };
    if (typeof body.symbol !== "string" || !body.symbol.trim()) {
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }
    const sym = normalizeSymbol(body.symbol);
    if (!isValidSymbol(sym)) {
      return NextResponse.json({ error: "Invalid symbol format" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const { error } = await supabase.from("watchlist").delete().eq("symbol", sym);

    if (error) {
      console.error("[watchlist] delete watchlist:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Delete chart images from storage (stocks/{SYMBOL}_{PERIOD}.png).
    const periods = ["D", "W", "M"];
    for (const period of periods) {
      const { error: storageErr } = await supabase.storage
        .from("charts")
        .remove([`stocks/${sym}_${period}.png`]);
      if (storageErr) {
        console.error(`[watchlist] delete chart file ${sym}_${period}:`, storageErr.message);
        return NextResponse.json({ error: storageErr.message }, { status: 500 });
      }
    }

    const { error: metadataErr } = await supabase
      .from("chart_metadata")
      .delete()
      .eq("symbol", sym);
    if (metadataErr) {
      console.error(`[watchlist] delete chart_metadata ${sym}:`, metadataErr.message);
      return NextResponse.json({ error: metadataErr.message }, { status: 500 });
    }

    console.log(`[watchlist] deleted ${sym}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
