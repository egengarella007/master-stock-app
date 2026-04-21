"use client";

import type { StockDataRow } from "@/lib/types";
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

function actionColor(action: string | null | undefined): string {
  const a = (action ?? "").toLowerCase();
  if (a.includes("upgrade") || a.includes("initiated") || a.includes("outperform")) return COLORS.green;
  if (a.includes("downgrade") || a.includes("underperform") || a.includes("sell")) return COLORS.red;
  return COLORS.text;
}

export function AnalystPanel({ stock }: { stock: StockDataRow | null }) {
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
      <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 15 }}>Analyst</div>
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>Latest action</div>
          <div style={{ marginTop: 6, fontSize: mobile ? 16 : 15, fontWeight: 900, color: actionColor(stock?.analyst_action) }}>
            {stock?.analyst_action ?? "—"}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Firm</div>
            <div style={{ marginTop: 6, color: COLORS.text, fontWeight: 700 }}>{stock?.analyst_firm ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Date</div>
            <div style={{ marginTop: 6, color: COLORS.text, fontWeight: 700 }}>{stock?.analyst_date ?? "—"}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Rating change</div>
            <div style={{ marginTop: 6, color: COLORS.text, fontWeight: 700 }}>{stock?.analyst_rating_change ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Price target</div>
            <div style={{ marginTop: 6, color: COLORS.text, fontWeight: 700 }}>{stock?.analyst_price_target ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
