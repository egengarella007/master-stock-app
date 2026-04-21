"use client";

import type { NewsItem, StockDataRow } from "@/lib/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  blue: "#3b82f6",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

function normalizeNews(raw: unknown): NewsItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8) as NewsItem[];
}

function titleOf(n: NewsItem): string {
  return (n.title ?? n.headline ?? "Headline").toString();
}

function linkOf(n: NewsItem): string | null {
  const u = (n.link ?? n.url ?? "").toString();
  return u ? u : null;
}

export function NewsPanel({ stock }: { stock: StockDataRow | null }) {
  const mobile = useMediaQuery("(max-width: 768px)");
  const items = normalizeNews(stock?.news);

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
      <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 15 }}>News</div>
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {items.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 14 }}>No headlines yet.</div>
        ) : (
          items.map((n, idx) => {
            const href = linkOf(n);
            const title = titleOf(n);
            const inner = (
              <div
                style={{
                  padding: mobile ? 14 : 12,
                  borderRadius: RADIUS,
                  border: `1px solid ${COLORS.border}`,
                  background: "rgba(255,255,255,0.03)",
                  color: COLORS.text,
                  fontSize: mobile ? 16 : 14,
                  lineHeight: 1.35,
                  fontWeight: 650,
                }}
              >
                {title}
              </div>
            );
            return href ? (
              <a key={`${href}-${idx}`} href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                {inner}
              </a>
            ) : (
              <div key={`${title}-${idx}`}>{inner}</div>
            );
          })
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: COLORS.blue }}>Links open in a new tab.</div>
    </div>
  );
}
