"use client"
import { useState, useEffect } from "react"

type Props = { symbol: string }

export function StockChartCard({ symbol }: Props) {
  const [period, setPeriod] = useState<"D" | "W" | "M">("D")
  const [mounted, setMounted] = useState(false)
  const [cacheBust, setCacheBust] = useState(0)

  useEffect(() => {
    setMounted(true)
    setCacheBust(Date.now())
    const id = setInterval(() => setCacheBust(Date.now()), 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const STORAGE_URL = mounted
    ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    : ""

  const src = STORAGE_URL
    ? `${STORAGE_URL}/storage/v1/object/public/charts/stocks/${symbol.toUpperCase()}_${period}.png?t=${cacheBust}`
    : ""

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(148,163,184,0.14)",
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
          {symbol}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["D", "W", "M"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "none",
                background: period === p ? "#a855f7" : "rgba(148,163,184,0.15)",
                color: period === p ? "#fff" : "#94a3b8",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {src ? (
        <img
          src={src}
          alt={`${symbol} ${period} chart`}
          style={{ width: "100%", borderRadius: 8, display: "block" }}
        />
      ) : (
        <div style={{ color: "#94a3b8", textAlign: "center", padding: 40, fontSize: 13 }}>
          Chart loading...
        </div>
      )}
    </div>
  )
}
