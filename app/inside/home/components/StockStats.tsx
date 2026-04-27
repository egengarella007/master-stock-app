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

/** Parse Finviz-style numeric strings (commas, optional suffix). */
function parseNumericField(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "").trim();
  const m = cleaned.match(/^[-+]?\d*\.?\d+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function Week52RangeBar({
  lowRaw,
  highRaw,
  price,
}: {
  lowRaw: string | null;
  highRaw: string | null;
  price: number | null;
}) {
  const low = parseNumericField(lowRaw);
  const high = parseNumericField(highRaw);
  const rangeOk =
    low != null && high != null && high > low && Number.isFinite(low) && Number.isFinite(high);

  if (!rangeOk) {
    return (
      <div style={{ fontSize: 13, color: "#64748b", padding: "8px 0" }}>
        52-week high/low unavailable
      </div>
    );
  }

  const loN = low as number;
  const hiN = high as number;
  let pct = 0;
  const hasPrice = price != null && Number.isFinite(price);
  if (hasPrice) {
    pct = ((price as number) - loN) / (hiN - loN);
    pct = Math.max(0, Math.min(1, pct)) * 100;
  }

  const trackBg = "rgba(148,163,184,0.14)";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 8,
          gap: 12,
        }}
      >
        <div>
          <div style={{ ...label, marginBottom: 2 }}>52W Low</div>
          <div style={{ ...value, fontSize: 15 }}>{lowRaw ?? "—"}</div>
        </div>
        {hasPrice ? (
          <div style={{ textAlign: "center", flex: "1 1 auto", minWidth: 0 }}>
            <div style={{ ...label, marginBottom: 2 }}>Price</div>
            <div style={{ ...value, fontSize: 15, color: "#a855f7" }}>
              $
              {(price as number).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <div style={{ textAlign: "right" }}>
          <div style={{ ...label, marginBottom: 2 }}>52W High</div>
          <div style={{ ...value, fontSize: 15 }}>{highRaw ?? "—"}</div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 5,
          background: trackBg,
          border: "1px solid rgba(148,163,184,0.2)",
        }}
      >
        {hasPrice ? (
          <div
            style={{
              position: "absolute",
              left: `${pct}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#a855f7",
              border: "2px solid #f8fafc",
              boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
              zIndex: 1,
            }}
            title={`Within 52w range (${pct.toFixed(0)}% from low to high)`}
          />
        ) : null}
      </div>
    </div>
  );
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

  return (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={sectionTitle}>52-week range</div>
        <Week52RangeBar
          lowRaw={data.low_52w}
          highRaw={data.high_52w}
          price={data.price}
        />
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
          <div style={sectionTitle}>Moving averages</div>
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

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={sectionTitle}>Technicals</div>
        <StatRow label="RSI (14)" value={data.rsi} />
        <StatRow label="Beta" value={data.beta} />
        <StatRow label="Short Float" value={data.short_float} />
        <StatRow label="Inst Own" value={data.inst_own} />
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
