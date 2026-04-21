"use client";

import type { StockDataRow } from "@/lib/types";
import { formatPctFromNumber, formatUsd } from "@/lib/formatters";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  green: "#34d399",
  red: "#f87171",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

export function PriceHeader({ stock }: { stock: StockDataRow | null }) {
  const mobile = useMediaQuery("(max-width: 768px)");
  const cp = stock?.change_percent ?? null;
  const changeColor = cp == null ? COLORS.muted : cp >= 0 ? COLORS.green : COLORS.red;

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
      <div style={{ fontSize: mobile ? 14 : 13, color: COLORS.muted }}>{stock?.symbol ?? "—"}</div>
      <div style={{ marginTop: 8, fontSize: mobile ? 40 : 34, fontWeight: 900, color: COLORS.text }}>
        {formatUsd(stock?.price ?? null)}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div style={{ fontSize: mobile ? 16 : 15, color: changeColor, fontWeight: 800 }}>
          {stock?.change ?? "—"} {cp == null ? "" : `(${formatPctFromNumber(cp)})`}
        </div>
      </div>
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
          gap: 10,
          color: COLORS.muted,
          fontSize: mobile ? 15 : 13,
        }}
      >
        <div>
          <div style={{ color: COLORS.muted }}>Volume</div>
          <div style={{ color: COLORS.text, fontWeight: 700, marginTop: 4 }}>{stock?.volume ?? "—"}</div>
        </div>
        <div>
          <div style={{ color: COLORS.muted }}>Market cap</div>
          <div style={{ color: COLORS.text, fontWeight: 700, marginTop: 4 }}>{stock?.market_cap ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
