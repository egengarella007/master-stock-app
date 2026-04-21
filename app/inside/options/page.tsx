const COLORS = {
  text: "#f8fafc",
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";

export default function OptionsPage() {
  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.text }}>Options</div>
      <div style={{ marginTop: 10, color: COLORS.muted, fontSize: 14, lineHeight: 1.5 }}>
        Options chain is not implemented yet. This page is intentionally empty.
      </div>
    </div>
  );
}
