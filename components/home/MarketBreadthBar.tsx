"use client";

import { useMarketBreadth } from "@/hooks/useMarketBreadth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { ErrorBanner } from "@/components/shared/ErrorBanner";

const COLORS = {
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  green: "#34d399",
  red: "#f87171",
  blue: "#3b82f6",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

function SplitBar({
  leftLabel,
  rightLabel,
  leftPct,
  leftColor,
  rightColor,
}: {
  leftLabel: string;
  rightLabel: string;
  leftPct: number;
  leftColor: string;
  rightColor: string;
}) {
  const lp = Math.max(0, Math.min(100, leftPct));
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: COLORS.muted, fontSize: 12 }}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div
        style={{
          marginTop: 6,
          height: 12,
          borderRadius: 999,
          overflow: "hidden",
          border: `1px solid ${COLORS.border}`,
          display: "flex",
        }}
      >
        <div style={{ width: `${lp}%`, background: leftColor }} />
        <div style={{ flex: 1, background: rightColor }} />
      </div>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number | null }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: COLORS.muted, fontSize: 12 }}>
        <span>{label}</span>
        <span style={{ color: COLORS.text }}>{value == null ? "—" : `${Math.round(v)}%`}</span>
      </div>
      <div
        style={{
          marginTop: 6,
          height: 12,
          borderRadius: 999,
          overflow: "hidden",
          border: `1px solid ${COLORS.border}`,
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ width: `${v}%`, height: "100%", background: COLORS.blue }} />
      </div>
    </div>
  );
}

export function MarketBreadthBar() {
  const mobile = useMediaQuery("(max-width: 768px)");
  const { breadth, loading, error } = useMarketBreadth();

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
      <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 15 }}>Market breadth</div>
      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
        Computed from stock_data (server cache 5 minutes)
      </div>
      {error ? (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner message={error} />
        </div>
      ) : null}
      {loading && !breadth ? (
        <div style={{ marginTop: 12 }}>
          <SkeletonCard height={120} />
        </div>
      ) : null}
      {breadth ? (
        <div style={{ marginTop: 12 }}>
          <SplitBar
            leftLabel={`Advancing (${breadth.advancing})`}
            rightLabel={`Declining (${breadth.declining})`}
            leftPct={
              breadth.advancing + breadth.declining === 0
                ? 50
                : (breadth.advancing / (breadth.advancing + breadth.declining)) * 100
            }
            leftColor={COLORS.green}
            rightColor={COLORS.red}
          />
          <SplitBar
            leftLabel={`New highs (${breadth.newHighs})`}
            rightLabel={`New lows (${breadth.newLows})`}
            leftPct={
              breadth.newHighs + breadth.newLows === 0
                ? 50
                : (breadth.newHighs / (breadth.newHighs + breadth.newLows)) * 100
            }
            leftColor={COLORS.green}
            rightColor={COLORS.red}
          />
          <ProgressBar label="% above SMA50 (approx.)" value={breadth.pctAboveSma50} />
          <ProgressBar label="% above SMA200 (approx.)" value={breadth.pctAboveSma200} />
          <div style={{ marginTop: 10, fontSize: 12, color: COLORS.muted }}>
            Sample size: {breadth.sampleSize} symbols
          </div>
        </div>
      ) : null}
    </div>
  );
}
