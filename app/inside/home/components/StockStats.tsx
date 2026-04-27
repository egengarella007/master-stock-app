"use client";

import { useEffect, useState } from "react";

type StockData = {
  symbol: string;
  price: number | null;
  change_percent: number | null;
  change: string | null;
  volume: string | null;
  market_cap: string | null;
  high_52w: string | null;
  low_52w: string | null;
  sma20_pct: string | null;
  sma50_pct: string | null;
  sma200_pct: string | null;
  rsi: string | null;
  beta: string | null;
  short_float: string | null;
  inst_own: string | null;
  perf_week: string | null;
  perf_month: string | null;
  perf_quarter: string | null;
  perf_half_year: string | null;
  perf_year: string | null;
  analyst_date: string | null;
  analyst_action: string | null;
  analyst_firm: string | null;
  analyst_rating_change: string | null;
  analyst_price_target: string | null;
  updated_at: string | null;
};

const card = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

const label = {
  fontSize: 11,
  color: "#94a3b8",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: 4,
};

const value = {
  fontSize: 14,
  fontWeight: 600,
  color: "#f8fafc",
};

const sectionTitle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: 12,
};

function pctColor(val: string | null): string {
  if (!val) return "#94a3b8";
  const n = parseFloat(val);
  if (Number.isNaN(n)) return "#94a3b8";
  return n >= 0 ? "#34d399" : "#f87171";
}

function StatRow({
  label: l,
  value: v,
  color,
}: {
  label: string;
  value: string | null;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid rgba(148,163,184,0.08)",
      }}
    >
      <span style={{ fontSize: 12, color: "#94a3b8" }}>{l}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: color ?? "#f8fafc",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v ?? "—"}
      </span>
    </div>
  );
}

function isStockData(d: unknown): d is StockData {
  return (
    typeof d === "object" &&
    d !== null &&
    "symbol" in d &&
    typeof (d as StockData).symbol === "string" &&
    !("error" in d && typeof (d as { error?: string }).error === "string")
  );
}

export function StockStats({ symbol }: { symbol: string }) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const r = await fetch(
          `/api/stock/${encodeURIComponent(symbol)}`,
          { cache: "no-store" },
        );
        const d: unknown = await r.json();
        if (cancelled) return;
        if (!r.ok || !isStockData(d)) {
          setData(null);
        } else {
          setData(d);
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div
        style={{
          ...card,
          color: "#94a3b8",
          fontSize: 13,
          textAlign: "center",
          padding: 32,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!data) return null;

  const priceColor =
    (data.change_percent ?? 0) >= 0 ? "#34d399" : "#f87171";

  return (
    <div>
      <div style={{ ...card }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc" }}>
              $
              {data.price?.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) ?? "—"}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: priceColor,
                marginTop: 4,
              }}
            >
              {data.change ?? "—"} (
              {data.change_percent != null
                ? `${data.change_percent >= 0 ? "+" : ""}${data.change_percent.toFixed(2)}%`
                : "—"}
              )
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Volume</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>
              {data.volume ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
              Market Cap
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>
              {data.market_cap ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={sectionTitle}>Technicals</div>
          <StatRow
            label="SMA 20"
            value={data.sma20_pct}
            color={pctColor(data.sma20_pct)}
          />
          <StatRow
            label="SMA 50"
            value={data.sma50_pct}
            color={pctColor(data.sma50_pct)}
          />
          <StatRow
            label="SMA 200"
            value={data.sma200_pct}
            color={pctColor(data.sma200_pct)}
          />
          <StatRow label="RSI (14)" value={data.rsi} />
          <StatRow label="Beta" value={data.beta} />
          <StatRow label="52W High" value={data.high_52w} />
          <StatRow label="52W Low" value={data.low_52w} />
          <StatRow label="Short Float" value={data.short_float} />
          <StatRow label="Inst Own" value={data.inst_own} />
        </div>

        <div style={{ ...card, marginBottom: 0 }}>
          <div style={sectionTitle}>Performance</div>
          <StatRow
            label="Week"
            value={data.perf_week}
            color={pctColor(data.perf_week)}
          />
          <StatRow
            label="Month"
            value={data.perf_month}
            color={pctColor(data.perf_month)}
          />
          <StatRow
            label="Quarter"
            value={data.perf_quarter}
            color={pctColor(data.perf_quarter)}
          />
          <StatRow
            label="Half Year"
            value={data.perf_half_year}
            color={pctColor(data.perf_half_year)}
          />
          <StatRow
            label="Year"
            value={data.perf_year}
            color={pctColor(data.perf_year)}
          />
        </div>
      </div>

      {data.analyst_action ? (
        <div style={{ ...card }}>
          <div style={sectionTitle}>Latest Analyst Action</div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div style={label}>Date</div>
              <div style={value}>{data.analyst_date ?? "—"}</div>
            </div>
            <div>
              <div style={label}>Action</div>
              <div
                style={{
                  ...value,
                  color: data.analyst_action?.toLowerCase().includes("upgrade")
                    ? "#34d399"
                    : data.analyst_action?.toLowerCase().includes("downgrade")
                      ? "#f87171"
                      : "#f8fafc",
                }}
              >
                {data.analyst_action ?? "—"}
              </div>
            </div>
            <div>
              <div style={label}>Firm</div>
              <div style={value}>{data.analyst_firm ?? "—"}</div>
            </div>
            <div>
              <div style={label}>Rating</div>
              <div style={value}>{data.analyst_rating_change ?? "—"}</div>
            </div>
            <div>
              <div style={label}>Target</div>
              <div style={value}>{data.analyst_price_target ?? "—"}</div>
            </div>
          </div>
        </div>
      ) : null}

      {data.updated_at ? (
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            textAlign: "right",
            marginTop: -8,
          }}
        >
          Updated: {new Date(data.updated_at).toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}
