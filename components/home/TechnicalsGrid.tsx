"use client";

import type { StockDataRow } from "@/lib/types";
import { parseNumericString } from "@/lib/formatters";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  green: "#34d399",
  red: "#f87171",
  yellow: "#fbbf24",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

function Cell({
  label,
  value,
  valueColor,
  mobile,
}: {
  label: string;
  value: string;
  valueColor: string;
  mobile: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS,
        padding: mobile ? 14 : 12,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 12, color: COLORS.muted }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: mobile ? 16 : 15, fontWeight: 800, color: valueColor }}>{value}</div>
    </div>
  );
}

function colorForSignedPct(text: string | null): string {
  const n = parseNumericString(text);
  if (n == null) return COLORS.text;
  return n >= 0 ? COLORS.green : COLORS.red;
}

function rsiColor(text: string | null): string {
  const n = parseNumericString(text);
  if (n == null) return COLORS.text;
  if (n < 35) return COLORS.yellow;
  if (n > 70) return COLORS.red;
  return COLORS.text;
}

export function TechnicalsGrid({ stock }: { stock: StockDataRow | null }) {
  const mobile = useMediaQuery("(max-width: 768px)");

  return (
    <div
      style={{
        borderRadius: RADIUS,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.card,
        padding: mobile ? 16 : 12,
        fontFamily: FONT,
      }}
    >
      <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 15 }}>Technicals</div>
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <Cell
          label="SMA20"
          value={stock?.sma20_pct ?? "—"}
          valueColor={colorForSignedPct(stock?.sma20_pct ?? null)}
          mobile={mobile}
        />
        <Cell
          label="SMA50"
          value={stock?.sma50_pct ?? "—"}
          valueColor={colorForSignedPct(stock?.sma50_pct ?? null)}
          mobile={mobile}
        />
        <Cell
          label="SMA200"
          value={stock?.sma200_pct ?? "—"}
          valueColor={colorForSignedPct(stock?.sma200_pct ?? null)}
          mobile={mobile}
        />
        <Cell label="RSI" value={stock?.rsi ?? "—"} valueColor={rsiColor(stock?.rsi ?? null)} mobile={mobile} />
        <Cell label="Beta" value={stock?.beta ?? "—"} valueColor={COLORS.text} mobile={mobile} />
        <Cell label="Short float" value={stock?.short_float ?? "—"} valueColor={COLORS.text} mobile={mobile} />
        <Cell label="Inst. own" value={stock?.inst_own ?? "—"} valueColor={COLORS.text} mobile={mobile} />
      </div>
    </div>
  );
}
