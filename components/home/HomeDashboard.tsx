"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useStockData } from "@/hooks/useStockData";
import { IndexCharts } from "@/components/home/IndexCharts";
import { MarketBreadthBar } from "@/components/home/MarketBreadthBar";
import { StockChart } from "@/components/home/StockChart";
import { PriceHeader } from "@/components/home/PriceHeader";
import { RangeBar } from "@/components/home/RangeBar";
import { TechnicalsGrid } from "@/components/home/TechnicalsGrid";
import { PerformanceChart } from "@/components/home/PerformanceChart";
import { AnalystPanel } from "@/components/home/AnalystPanel";
import { NewsPanel } from "@/components/home/NewsPanel";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";

export function HomeDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobile = useMediaQuery("(max-width: 768px)");
  const qSymbol = useMemo(() => (searchParams.get("symbol") ?? "").trim().toUpperCase(), [searchParams]);
  const { items: watchlistItems, loading: wlLoading } = useWatchlist();

  useEffect(() => {
    if (qSymbol) return;
    const first = watchlistItems[0]?.symbol;
    if (!first) return;
    router.replace(`/inside/home?symbol=${encodeURIComponent(first)}`);
  }, [qSymbol, router, watchlistItems]);

  const symbol = qSymbol || null;
  const { stock, loading: stLoading, error: stError } = useStockData(symbol);

  const showSkeleton = (stLoading || wlLoading) && !stock;

  return (
    <div style={{ display: "grid", gap: mobile ? 16 : 14, maxWidth: 1100, fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontSize: mobile ? 18 : 16, fontWeight: 900, color: "#f8fafc" }}>Home</div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>
          {symbol ? `Selected: ${symbol}` : "Pick a symbol from the watchlist"}
        </div>
      </div>

      {stError ? <ErrorBanner message={stError} /> : null}

      <IndexCharts />
      <MarketBreadthBar />
      {showSkeleton ? <SkeletonCard height={320} /> : <StockChart symbol={symbol} />}
      {showSkeleton ? <SkeletonCard height={160} /> : <PriceHeader stock={stock} />}
      {showSkeleton ? <SkeletonCard height={110} /> : <RangeBar stock={stock} />}
      {showSkeleton ? <SkeletonCard height={220} /> : <TechnicalsGrid stock={stock} />}
      {showSkeleton ? <SkeletonCard height={220} /> : <PerformanceChart stock={stock} />}
      {showSkeleton ? <SkeletonCard height={180} /> : <AnalystPanel stock={stock} />}
      {showSkeleton ? <SkeletonCard height={260} /> : <NewsPanel stock={stock} />}
    </div>
  );
}
