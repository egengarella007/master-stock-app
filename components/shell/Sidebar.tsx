"use client";

import { Suspense } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { AddSymbolForm } from "@/components/watchlist/AddSymbolForm";
import { WatchlistList } from "@/components/watchlist/WatchlistList";

const COLORS = {
  sidebar: "#12131f",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";

export function Sidebar() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  if (isMobile) return null;

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        borderRight: `1px solid ${COLORS.border}`,
        background: COLORS.sidebar,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
        minHeight: "100vh",
      }}
    >
      <div style={{ padding: 16, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Watchlist</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>Supabase · 30s refresh</div>
      </div>
      <div style={{ padding: 12 }}>
        <AddSymbolForm />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
        <Suspense
          fallback={<div style={{ padding: 8, color: COLORS.muted, fontSize: 13 }}>Loading…</div>}
        >
          <WatchlistList />
        </Suspense>
      </div>
    </aside>
  );
}
