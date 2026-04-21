"use client";

const COLORS = {
  bg: "rgba(248,113,113,0.12)",
  border: "rgba(248,113,113,0.35)",
  text: "#fecaca",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: RADIUS,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: FONT,
        fontSize: 14,
        lineHeight: 1.4,
      }}
    >
      {message}
    </div>
  );
}
