import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import type { StockDataRow } from "@/lib/types";

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

function isValidSymbol(sym: string): boolean {
  return /^[A-Z0-9.\-]{1,15}$/.test(sym);
}

export async function GET() {
  try {
    const supabase = getSupabaseService();
    const { data: wl, error: wlErr } = await supabase
      .from("watchlist_symbols")
      .select("symbol, added_at")
      .order("added_at", { ascending: false });
    if (wlErr) {
      return NextResponse.json({ error: wlErr.message }, { status: 500 });
    }
    const symbols = (wl ?? []).map((r) => r.symbol as string);
    if (symbols.length === 0) {
      return NextResponse.json({ items: [] });
    }
    const { data: stocks, error: stErr } = await supabase
      .from("stock_data")
      .select("*")
      .in("symbol", symbols);
    if (stErr) {
      return NextResponse.json({ error: stErr.message }, { status: 500 });
    }
    const bySym = new Map<string, StockDataRow>();
    for (const row of stocks ?? []) {
      bySym.set((row as StockDataRow).symbol, row as StockDataRow);
    }
    const items = symbols.map((symbol) => ({
      symbol,
      added_at: (wl ?? []).find((w) => w.symbol === symbol)?.added_at ?? null,
      stock: bySym.get(symbol) ?? null,
    }));
    items.sort((a, b) => {
      const ca = a.stock?.change_percent ?? null;
      const cb = b.stock?.change_percent ?? null;
      if (ca == null && cb == null) return 0;
      if (ca == null) return 1;
      if (cb == null) return -1;
      return cb - ca;
    });
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
    const { error } = await supabase.from("watchlist_symbols").upsert(
      { symbol: sym },
      { onConflict: "symbol" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    const [w, s, c] = await Promise.all([
      supabase.from("watchlist_symbols").delete().eq("symbol", sym),
      supabase.from("stock_data").delete().eq("symbol", sym),
      supabase.from("chart_metadata").delete().eq("symbol", sym),
    ]);

    if (w.error) {
      console.error("[watchlist] delete watchlist_symbols:", w.error.message);
      return NextResponse.json({ error: w.error.message }, { status: 500 });
    }

    if (s.error) console.error("[watchlist] delete stock_data:", s.error.message);
    if (c.error) console.error("[watchlist] delete chart_metadata:", c.error.message);

    console.log(`[watchlist] deleted ${sym} from all tables`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
