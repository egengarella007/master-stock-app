"use client";

import { useSearchParams } from "next/navigation";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { WatchlistRow } from "@/components/watchlist/WatchlistRow";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { SkeletonCard } from "@/components/shared/SkeletonCard";

const COLORS = {
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";

export function WatchlistList() {
  const { items, loading, error } = useWatchlist();
  const searchParams = useSearchParams();
  const selected = (searchParams.get("symbol") ?? "").toUpperCase();
  const mobile = useMediaQuery("(max-width: 768px)");

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (loading && items.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SkeletonCard height={64} />
        <SkeletonCard height={64} />
        <SkeletonCard height={64} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ fontSize: 14, color: COLORS.muted, fontFamily: FONT, padding: 8 }}>
        No symbols yet. Add one above.
      </div>
    );
  }

  return (
    <div>
      {items.map((it) => (
        <WatchlistRow
          key={it.symbol}
          item={it}
          selected={selected === it.symbol}
          mobile={mobile}
        />
      ))}
    </div>
  );
}
