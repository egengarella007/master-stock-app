import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import type { WatchlistRecord } from "@/lib/types";

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

function isValidSymbol(sym: string): boolean {
  return /^[A-Z0-9.\-]{1,15}$/.test(sym);
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

    console.log(`[watchlist] deleted ${sym}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
