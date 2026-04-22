"use client";

import { Suspense, useCallback, useState } from "react";
import { AddSymbolForm } from "@/components/watchlist/AddSymbolForm";
import { WatchlistList } from "@/components/watchlist/WatchlistList";
import { MarketSidebar } from "@/components/shell/MarketSidebar";

const COLORS = {
  sidebar: "#12131f",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";
/** Total rail width when expanded (list + vertical collapse handle). */
const EXPANDED_W = 200;
/** Narrow strip for ▶ / ◀, aligned with collapsed rail width. */
const HANDLE_W = 40;
const COLLAPSED_W = HANDLE_W;

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
          </div>
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
              fontSize: 16,
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
