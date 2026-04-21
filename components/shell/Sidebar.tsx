"use client";

import { Suspense } from "react";
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
  return (
    <aside
      style={{
        width: 160,
        flexShrink: 0,
        borderRight: `1px solid ${COLORS.border}`,
        background: COLORS.sidebar,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          padding: "6px 8px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: COLORS.text, letterSpacing: "0.06em" }}>
          WATCHLIST
        </div>
        <div style={{ fontSize: 9, color: COLORS.muted, marginTop: 2 }}>30s</div>
      </div>
      <div style={{ padding: "6px 8px", borderBottom: `1px solid ${COLORS.border}` }}>
        <AddSymbolForm />
      </div>
      <div
        className="watchlist-sidebar-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        <Suspense
          fallback={<div style={{ padding: 8, color: COLORS.muted, fontSize: 11 }}>Loading…</div>}
        >
          <WatchlistList />
        </Suspense>
      </div>
    </aside>
  );
}
