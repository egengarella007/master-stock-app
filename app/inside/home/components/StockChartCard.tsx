"use client";

import { useEffect, useState } from "react";

type Props = { symbol: string };

type QuoteRow = {
  price: number | null;
  change_percent: number | null;
  change: string | null;
  volume: string | null;
  market_cap: string | null;
};

function isQuoteRow(d: unknown): d is QuoteRow {
  if (typeof d !== "object" || d === null) return false;
  if ("error" in d && typeof (d as { error?: string }).error === "string") {
    return false;
  }
  const o = d as Record<string, unknown>;
  return typeof o.symbol === "string";
}

const headline = {
  fontSize: 26,
  fontWeight: 800 as const,
  color: "#f8fafc",
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
};

export function StockChartCard({ symbol }: Props) {
  const [period, setPeriod] = useState<"D" | "W" | "M">("D");
  const [mounted, setMounted] = useState(false);
  const [cacheBust, setCacheBust] = useState(0);
  const [quote, setQuote] = useState<QuoteRow | null>(null);

  useEffect(() => {
    setMounted(true);
    setCacheBust(Date.now());
    const id = setInterval(() => setCacheBust(Date.now()), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(
          `/api/stock/${encodeURIComponent(symbol)}`,
          { cache: "no-store" },
        );
        const d: unknown = await r.json();
        if (cancelled) return;
        if (!r.ok || !isQuoteRow(d)) {
          setQuote(null);
        } else {
          const row = d as QuoteRow;
          setQuote({
            price: typeof row.price === "number" ? row.price : null,
            change_percent:
              typeof row.change_percent === "number"
                ? row.change_percent
                : null,
            change: row.change ?? null,
            volume: row.volume ?? null,
            market_cap: row.market_cap ?? null,
          });
        }
      } catch {
        if (!cancelled) setQuote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const STORAGE_URL = mounted
    ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    : "";

  const src = STORAGE_URL
    ? `${STORAGE_URL}/storage/v1/object/public/charts/stocks/${symbol.toUpperCase()}_${period}.png?t=${cacheBust}`
    : "";

  const symU = symbol.toUpperCase();
  const priceStr =
    quote?.price != null
      ? `$${quote.price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "—";
  const pctPart =
    quote?.change_percent != null
      ? `${quote.change_percent >= 0 ? "+" : ""}${quote.change_percent.toFixed(2)}%`
      : null;
  const changeColor =
    (quote?.change_percent ?? 0) >= 0 ? "#34d399" : "#f87171";
  const leftTail =
    quote?.change != null && pctPart != null
      ? `${quote.change} (${pctPart})`
      : quote?.change != null
        ? quote.change
        : pctPart != null
          ? `(${pctPart})`
          : "—";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(148,163,184,0.14)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px 12px",
          marginBottom: 12,
          minHeight: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "10px 14px",
            minWidth: 0,
            flex: "0 1 auto",
          }}
        >
          <span style={headline}>{symU}</span>
          <span style={headline}>{priceStr}</span>
          <span style={{ ...headline, color: changeColor }}>{leftTail}</span>
        </div>

        <div style={{ flex: 1, minWidth: 16 }} aria-hidden />

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 20,
            flexShrink: 0,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ ...headline, fontWeight: 700 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#94a3b8",
                marginRight: 6,
              }}
            >
              Volume:
            </span>
            {quote?.volume ?? "—"}
          </span>
          <span style={{ ...headline, fontWeight: 700 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#94a3b8",
                marginRight: 6,
              }}
            >
              Market Cap:
            </span>
            {quote?.market_cap ?? "—"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {(["D", "W", "M"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "none",
                background:
                  period === p ? "#a855f7" : "rgba(148,163,184,0.15)",
                color: period === p ? "#fff" : "#94a3b8",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {src ? (
        <img
          src={src}
          alt={`${symbol} ${period} chart`}
          style={{ width: "100%", borderRadius: 8, display: "block" }}
        />
      ) : (
        <div
          style={{
            color: "#94a3b8",
            textAlign: "center",
            padding: 40,
            fontSize: 13,
          }}
        >
          Chart loading...
        </div>
      )}
    </div>
  );
}
