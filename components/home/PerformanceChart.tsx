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
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

const ROWS: { key: keyof Pick<
  StockDataRow,
  "perf_week" | "perf_month" | "perf_quarter" | "perf_half_year" | "perf_year"
>; label: string }[] = [
  { key: "perf_week", label: "Week" },
  { key: "perf_month", label: "Month" },
  { key: "perf_quarter", label: "Quarter" },
  { key: "perf_half_year", label: "Half-year" },
  { key: "perf_year", label: "Year" },
];

export function PerformanceChart({ stock }: { stock: StockDataRow | null }) {
  const mobile = useMediaQuery("(max-width: 768px)");
  const values = ROWS.map((r) => ({
    label: r.label,
    key: r.key,
    raw: stock?.[r.key] ?? null,
    n: parseNumericString(stock?.[r.key] ?? null),
  }));
  const maxAbs = Math.max(1, ...values.map((v) => (v.n == null ? 0 : Math.abs(v.n))));

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
      <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 15 }}>Performance</div>
      <div style={{ marginTop: 12 }}>
        <svg width="100%" height={ROWS.length * 34} viewBox={`0 0 600 ${ROWS.length * 34}`} role="img">
          {values.map((v, idx) => {
            const y = idx * 34 + 6;
            const n = v.n ?? 0;
            const w = (Math.abs(n) / maxAbs) * 260;
            const pos = n >= 0;
            const fill = n === 0 ? COLORS.muted : pos ? COLORS.green : COLORS.red;
            const barX = pos ? 300 : 300 - w;
            return (
              <g key={v.label}>
                <text x="0" y={y + 16} fill={COLORS.muted} fontSize="14" fontFamily={FONT}>
                  {v.label}
                </text>
                <rect x={260} y={y} width={80} height={18} rx="6" fill="rgba(255,255,255,0.06)" />
                <rect x={barX} y={y} width={w} height={18} rx="6" fill={fill} />
                <text x="590" y={y + 14} fill={COLORS.text} fontSize="14" fontFamily={FONT} textAnchor="end">
                  {v.raw ?? "—"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
