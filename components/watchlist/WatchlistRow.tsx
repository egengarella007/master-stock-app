"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { WatchlistRecord } from "@/lib/types";
import { formatUsd } from "@/lib/formatters";

const COLORS = {
  text: "#f8fafc",
  green: "#34d399",
  red: "#f87171",
  muted: "#64748b",
};

const FONT = "system-ui, -apple-system, sans-serif";
const LONG_PRESS_MS = 550;

export function WatchlistRow({ item, selected }: { item: WatchlistRecord; selected: boolean }) {
  const router = useRouter();
  const [showRemove, setShowRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cp = item.change_percent ?? null;
  const priceStr = formatUsd(item.price ?? null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onTouchStart = useCallback(() => {
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      setShowRemove(true);
    }, LONG_PRESS_MS);
  }, [clearLongPress]);

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearLongPress();
    }
  }, [clearLongPress]);

  const onRemove = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setRemoving(true);
      try {
        const res = await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: item.symbol }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to remove");
        }
        window.dispatchEvent(new Event("eg-watchlist-refresh"));
        router.refresh();
      } finally {
        setRemoving(false);
        setShowRemove(false);
      }
    },
    [item.symbol, router],
  );

  return (
    <div
      style={{ position: "relative", fontFamily: FONT }}
      onMouseLeave={() => setShowRemove(false)}
    >
      <Link
        href={`/inside/home?symbol=${encodeURIComponent(item.symbol)}`}
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
      >
        <div
          role="row"
          onMouseEnter={() => setShowRemove(true)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={clearLongPress}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 8px",
            height: 36,
            borderBottom: "1px solid rgba(148,163,184,0.08)",
            borderLeft: selected ? "3px solid #a855f7" : "3px solid transparent",
            background: selected ? "rgba(168,85,247,0.06)" : "transparent",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: COLORS.text,
              letterSpacing: "0.02em",
            }}
          >
            {item.symbol}
          </span>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#f8fafc",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {priceStr}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: cp == null ? COLORS.muted : cp >= 0 ? COLORS.green : COLORS.red,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cp == null ? "—" : `${cp >= 0 ? "+" : ""}${cp.toFixed(2)}%`}
            </span>
          </div>
        </div>
      </Link>

      {showRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${item.symbol}`}
          onMouseEnter={() => setShowRemove(true)}
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            width: 22,
            height: 22,
            padding: 0,
            border: "1px solid rgba(148,163,184,0.2)",
            borderRadius: 4,
            background: "rgba(15,17,28,0.95)",
            color: COLORS.text,
            fontSize: 14,
            lineHeight: 1,
            cursor: removing ? "wait" : "pointer",
            display: "grid",
            placeItems: "center",
            zIndex: 2,
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
