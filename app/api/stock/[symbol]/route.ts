import { NextResponse } from "next/server";

import { getSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { symbol: string } },
) {
  try {
    const supabase = getSupabaseService();
    const sym = params.symbol.toUpperCase();
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("symbol", sym)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
