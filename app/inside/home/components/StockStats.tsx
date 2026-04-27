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

/** 52-week range bar: upside to high / downside to low + gradient fill to price. */
function Week52RangeCard({ data }: { data: StockData }) {
  const price = data.price;
  const high = parseNumericField(data.high_52w);
  const low = parseNumericField(data.low_52w);

  if (
    price == null ||
    !Number.isFinite(price) ||
    high == null ||
    low == null ||
    high <= low
  ) {
    return null;
  }

  const position = ((price - low) / (high - low)) * 100;
  /** Same 0–100 value for fill and marker (do not clamp dot separately from fill). */
  const positionPct = Math.min(100, Math.max(0, position));
  const upsidePct = (((high - price) / price) * 100).toFixed(1);
  const downsidePct = (((price - low) / price) * 100).toFixed(1);

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={sectionTitle}>52 Week Range</div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Downside to 52W Low</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f87171" }}>
            -{downsidePct}%
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>${low.toFixed(2)}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Current</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>
            $
            {price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Upside to 52W High</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#34d399" }}>
            +{upsidePct}%
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>${high.toFixed(2)}</div>
        </div>
      </div>

      {/* Horizontal inset so the marker can sit at 0%/100% without clipping */}
      <div style={{ paddingLeft: 8, paddingRight: 8 }}>
        <div
          style={{
            position: "relative",
            height: 6,
            borderRadius: 3,
            background: "rgba(148,163,184,0.15)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${positionPct}%`,
              borderRadius: 3,
              background: "linear-gradient(90deg, #f87171, #34d399)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${positionPct}%`,
              transform: "translate(-50%, -50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#f8fafc",
              border: "2px solid #0e0f1a",
              boxShadow: "0 0 4px rgba(255,255,255,0.4)",
              zIndex: 1,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 10,
          color: "#64748b",
        }}
      >
        <span>52W Low</span>
        <span>52W High</span>
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
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/stock/${encodeURIComponent(symbol)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;

        const json: unknown = await res.json();
        if (cancelled) return;
        if (
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error?: string }).error === "string"
        ) {
          return;
        }

        if (!isStockData(json)) return;

        const hasData = json.price != null;

        if (cancelled) return;

        setData(json);
        setLoading(false);

        if (hasData) {
          stopPolling();
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    setData(null);
    intervalId = setInterval(() => void fetchData(), 3000);
    void fetchData();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [symbol]);

  if (loading && !data) {
    return (
      <div style={{ ...card, textAlign: "center", padding: 32 }}>
        <div style={{ color: "#94a3b8", fontSize: 13 }}>
          Fetching data for {symbol}...
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <Week52RangeCard data={data} />

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
