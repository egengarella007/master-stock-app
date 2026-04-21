import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";

function storageBase(): string | null {
  const base = process.env.NEXT_PUBLIC_STORAGE_URL?.replace(/\/$/, "") ?? null;
  return base;
}

function chartObjectPath(symbol: string, period: "D" | "W" | "M"): string {
  const safe = symbol.replace(/\^/g, "_CARET_");
  return `${safe}_${period}.png`;
}

export async function GET(request: NextRequest) {
  try {
    const base = storageBase();
    if (!base) {
      return NextResponse.json({ error: "NEXT_PUBLIC_STORAGE_URL is not configured" }, { status: 500 });
    }
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    const bust = Date.now();

    if (kind === "index") {
      const paths = {
        dow: "INDEX_DJ_D.png",
        nasdaq: "INDEX_NDX_D.png",
        sp500: "INDEX_SPX_D.png",
      };
      return NextResponse.json({
        urls: {
          dow: `${base}/${paths.dow}?t=${bust}`,
          nasdaq: `${base}/${paths.nasdaq}?t=${bust}`,
          sp500: `${base}/${paths.sp500}?t=${bust}`,
        },
      });
    }

    const symbol = (url.searchParams.get("symbol") ?? "").trim().toUpperCase();
    const period = (url.searchParams.get("period") ?? "D").toUpperCase();
    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }
    if (!["D", "W", "M"].includes(period)) {
      return NextResponse.json({ error: "period must be D, W, or M" }, { status: 400 });
    }
    const p = period as "D" | "W" | "M";

    const supabase = getSupabaseService();
    const { data: meta, error } = await supabase
      .from("chart_metadata")
      .select("d_updated_at, w_updated_at, m_updated_at")
      .eq("symbol", symbol)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const col = p === "D" ? "d_updated_at" : p === "W" ? "w_updated_at" : "m_updated_at";
    const updatedAt = meta ? (meta as Record<string, string | null>)[col] : null;

    return NextResponse.json({
      symbol,
      period: p,
      imageUrl: `${base}/${chartObjectPath(symbol, p)}?t=${bust}`,
      updatedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
