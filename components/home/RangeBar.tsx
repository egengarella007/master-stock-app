"use client";

import type { StockDataRow } from "@/lib/types";
import { parseNumericString } from "@/lib/formatters";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#a855f7",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

export function RangeBar({ stock }: { stock: StockDataRow | null }) {
  const mobile = useMediaQuery("(max-width: 768px)");
  const price = stock?.price ?? null;
  const lo = parseNumericString(stock?.low_52w ?? null);
  const hi = parseNumericString(stock?.high_52w ?? null);
  const pct =
    price != null && hi != null && lo != null && hi > lo
      ? ((price - lo) / (hi - lo)) * 100
      : null;
  const p = pct == null ? 50 : Math.max(0, Math.min(100, pct));

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
      <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 15 }}>52-week range</div>
      <div
        style={{
          marginTop: 12,
          height: 14,
          borderRadius: 999,
          border: `1px solid ${COLORS.border}`,
          background: "rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -6,
            left: `calc(${p}% - 6px)`,
            width: 12,
            height: 26,
            borderRadius: 4,
            background: COLORS.accent,
            border: `1px solid ${COLORS.border}`,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          color: COLORS.muted,
          fontSize: mobile ? 14 : 13,
        }}
      >
        <span>Low: {stock?.low_52w ?? "—"}</span>
        <span>High: {stock?.high_52w ?? "—"}</span>
      </div>
    </div>
  );
}
