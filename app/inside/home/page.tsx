"use client"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { MarketIndexes } from "./components/MarketIndexes"
import { StockChartCard } from "./components/StockChartCard"

function HomeContent() {
  const searchParams = useSearchParams()
  const selectedSymbol = searchParams.get("symbol")

  return (
    <div style={{ background: "#0e0f1a", minHeight: "100%", paddingBottom: 32 }}>
      <MarketIndexes />
      {selectedSymbol ? (
        <StockChartCard symbol={selectedSymbol} />
      ) : (
        <div style={{
          color: "#94a3b8",
          textAlign: "center",
          padding: "60px 32px",
          fontSize: 14,
        }}>
          Select a stock from the watchlist to view its chart
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
