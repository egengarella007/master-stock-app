import { NextResponse } from "next/server";

import { getSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

export async function GET() {
  try {
    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("market_breadth")
      .select(
        "advancing,declining,new_highs,new_lows,above_sma50_pct,above_sma200_pct,updated_at",
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: NO_CACHE },
      );
    }

    const payload =
      data ?? {
        advancing: null,
        declining: null,
        new_highs: null,
        new_lows: null,
        above_sma50_pct: null,
        above_sma200_pct: null,
        updated_at: null,
      };

    return NextResponse.json(payload, { headers: NO_CACHE });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE });
  }
}
