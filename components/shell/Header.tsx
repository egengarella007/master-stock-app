"use client";

const COLORS = {
  bg: "#12131f",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";

export function Header() {
  return (
    <header
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.bg,
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>EG Portfolio Management</div>
      <div style={{ marginLeft: 12, fontSize: 13, color: COLORS.muted }}>Dashboard</div>
    </header>
  );
}
