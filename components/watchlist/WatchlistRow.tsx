"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { WatchlistMergedRow } from "@/hooks/useWatchlist";
import { formatPctFromNumber, formatUsd } from "@/lib/formatters";

const COLORS = {
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  green: "#34d399",
  red: "#f87171",
  accent: "#a855f7",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

export function WatchlistRow({
  item,
  selected,
  mobile,
}: {
  item: WatchlistMergedRow;
  selected: boolean;
  mobile: boolean;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const cp = item.stock?.change_percent ?? null;
  const changeColor = cp == null ? COLORS.muted : cp >= 0 ? COLORS.green : COLORS.red;

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
      }
    },
    [item.symbol, router],
  );

  const padding = mobile ? 14 : 10;
  const minHeight = mobile ? 44 : 40;

  return (
    <Link
      href={`/inside/home?symbol=${encodeURIComponent(item.symbol)}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          borderRadius: RADIUS,
          borderTop: `1px solid ${COLORS.border}`,
          borderRight: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
          borderLeft: selected ? `4px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
          background: COLORS.card,
          padding,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight,
          fontFamily: FONT,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 14 }}>
            {item.symbol}
          </div>
          <div style={{ fontSize: mobile ? 13 : 12, color: COLORS.muted, marginTop: 2 }}>
            {item.stock?.market_cap ? `Mkt cap ${item.stock.market_cap}` : "—"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 14 }}>
            {formatUsd(item.stock?.price ?? null)}
          </div>
          <div style={{ fontSize: mobile ? 14 : 13, color: changeColor, marginTop: 2 }}>
            {cp == null ? "—" : formatPctFromNumber(cp)}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${item.symbol}`}
          style={{
            width: mobile ? 44 : 36,
            height: mobile ? 44 : 36,
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            background: "rgba(255,255,255,0.06)",
            color: COLORS.text,
            cursor: removing ? "wait" : "pointer",
            fontSize: 18,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </Link>
  );
}
