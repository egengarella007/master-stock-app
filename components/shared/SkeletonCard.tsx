"use client";

const COLORS = {
  bg: "#0e0f1a",
  border: "rgba(148,163,184,0.14)",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

export function SkeletonCard({
  height = 120,
  style,
}: {
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        height,
        borderRadius: RADIUS,
        border: `1px solid ${COLORS.border}`,
        background: "rgba(255,255,255,0.06)",
        fontFamily: FONT,
        ...style,
      }}
    />
  );
}
