"use client";

import { useSearchParams } from "next/navigation";
import { useWatchlist } from "@/hooks/useWatchlist";
import { WatchlistRow } from "@/components/watchlist/WatchlistRow";
import { ErrorBanner } from "@/components/shared/ErrorBanner";

const COLORS = {
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";

function ThinSkeleton() {
  return (
    <div
      className="skeleton-pulse"
      style={{
        height: 36,
        borderBottom: "1px solid rgba(148,163,184,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}
    />
  );
}

export function WatchlistList() {
  const { items, loading, error } = useWatchlist();
  const searchParams = useSearchParams();
  const selected = (searchParams.get("symbol") ?? "").toUpperCase();

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (loading && items.length === 0) {
    return (
      <div>
        <ThinSkeleton />
        <ThinSkeleton />
        <ThinSkeleton />
        <ThinSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: FONT, padding: "8px 8px 10px", lineHeight: 1.35 }}>
        No tickers. Add above.
      </div>
    );
  }

  return (
    <div>
      {items.map((it) => (
        <WatchlistRow key={it.symbol} item={it} selected={selected === it.symbol} />
      ))}
    </div>
  );
}
