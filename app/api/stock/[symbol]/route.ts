import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";

function normalizeSymbol(raw: string): string {
  return decodeURIComponent(raw).trim().toUpperCase();
}

export async function GET(
  _request: NextRequest,
  context: { params: { symbol: string } },
) {
  try {
    const { symbol: raw } = context.params;
    const symbol = normalizeSymbol(raw);
    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }
    const supabase = getSupabaseService();
    const { data, error } = await supabase.from("stock_data").select("*").eq("symbol", symbol).maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ stock: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
