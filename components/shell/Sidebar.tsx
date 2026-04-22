"use client";

import { Suspense, useCallback, useState } from "react";
import { AddSymbolForm } from "@/components/watchlist/AddSymbolForm";
import { WatchlistList } from "@/components/watchlist/WatchlistList";

const COLORS = {
  sidebar: "#12131f",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";
const EXPANDED_W = 160;
const COLLAPSED_W = 40;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const expand = useCallback(() => setCollapsed(false), []);
  const collapse = useCallback(() => setCollapsed(true), []);

  return (
    <aside
      style={{
        width: collapsed ? COLLAPSED_W : EXPANDED_W,
        flexShrink: 0,
        borderRight: `1px solid ${COLORS.border}`,
        background: COLORS.sidebar,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
        minHeight: "100vh",
        transition: "width 0.15s ease",
        overflow: "hidden",
      }}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={expand}
          aria-label="Expand watchlist"
          style={{
            flex: 1,
            width: "100%",
            minHeight: 0,
            border: "none",
            background: "transparent",
            color: COLORS.muted,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            fontSize: 16,
            padding: 0,
          }}
        >
          ▶
        </button>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              padding: "6px 8px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <button
              type="button"
              onClick={collapse}
              aria-label="Collapse watchlist"
              style={{
                width: 28,
                height: 32,
                flexShrink: 0,
                borderRadius: 4,
                border: `1px solid ${COLORS.border}`,
                background: "rgba(255,255,255,0.04)",
                color: COLORS.text,
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              ◀
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <AddSymbolForm />
            </div>
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
        </>
      )}
    </aside>
  );
}
