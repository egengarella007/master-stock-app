"use client";

import { Suspense, useCallback, useState } from "react";
import { AddSymbolForm } from "@/components/watchlist/AddSymbolForm";
import { WatchlistProvider } from "@/components/watchlist/WatchlistContext";
import { WatchlistList } from "@/components/watchlist/WatchlistList";
import { MarketSidebar } from "@/components/shell/MarketSidebar";

const COLORS = {
  sidebar: "#12131f",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";
/** Total rail width when expanded (watchlist column + thin collapse strip). */
const EXPANDED_W = 252;
/** Collapse control when expanded — kept narrow; chevron stays readable. */
const HANDLE_W = 18;
/** Collapsed rail: slightly wider than handle for tap target. */
const COLLAPSED_W = 24;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const expand = useCallback(() => setCollapsed(false), []);
  const collapse = useCallback(() => setCollapsed(true), []);

  return (
    <aside
      style={{
        width: collapsed ? COLLAPSED_W : EXPANDED_W,
        flexShrink: 0,
        minHeight: 0,
        alignSelf: "stretch",
        borderRight: `1px solid ${COLORS.border}`,
        background: COLORS.sidebar,
        display: "flex",
        flexDirection: collapsed ? "column" : "row",
        fontFamily: FONT,
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
            fontSize: 12,
            padding: 0,
          }}
        >
          ▶
        </button>
      ) : (
        <>
          <WatchlistProvider
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{ padding: "8px 8px 6px" }}>
                <MarketSidebar />
              </div>
              <div style={{ padding: "6px 8px 8px" }}>
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
          </WatchlistProvider>
          <button
            type="button"
            onClick={collapse}
            aria-label="Collapse watchlist"
            style={{
              width: HANDLE_W,
              flexShrink: 0,
              alignSelf: "stretch",
              minHeight: 0,
              border: "none",
              borderLeft: `1px solid ${COLORS.border}`,
              background: "transparent",
              color: COLORS.muted,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              padding: 0,
            }}
          >
            ◀
          </button>
        </>
      )}
    </aside>
  );
}
