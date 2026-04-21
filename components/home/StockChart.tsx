"use client";

import { useCallback, useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#a855f7",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

type Period = "D" | "W" | "M";

export function StockChart({ symbol }: { symbol: string | null }) {
  const mobile = useMediaQuery("(max-width: 768px)");
  const [period, setPeriod] = useState<Period>("D");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!symbol) {
      setImageUrl(null);
      setUpdatedAt(null);
      return;
    }
    setError(null);
    try {
      const res = await fetch(
        `/api/charts?symbol=${encodeURIComponent(symbol)}&period=${period}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load chart metadata");
      }
      const data = (await res.json()) as { imageUrl: string; updatedAt: string | null };
      setImageUrl(data.imageUrl);
      setUpdatedAt(data.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chart");
      setImageUrl(null);
      setUpdatedAt(null);
    }
  }, [period, symbol]);

  useEffect(() => {
    void load();
  }, [load]);

  const periods: Period[] = ["D", "W", "M"];

  return (
    <div
      style={{
        borderRadius: RADIUS,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.card,
        padding: mobile ? 16 : 12,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 15 }}>Chart</div>
        <div style={{ display: "flex", gap: 8 }}>
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: p === period ? COLORS.accent : "rgba(255,255,255,0.06)",
                color: p === period ? "#0b0b12" : COLORS.text,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {!symbol ? (
        <div style={{ marginTop: 12, color: COLORS.muted }}>Select a symbol from your watchlist.</div>
      ) : null}
      {error ? <div style={{ marginTop: 12, color: "#fecaca", fontSize: 13 }}>{error}</div> : null}
      {symbol ? (
        <div style={{ marginTop: 12 }}>
          {!updatedAt ? (
            <div style={{ color: COLORS.muted, fontSize: 14, padding: "10px 0" }}>Fetching chart…</div>
          ) : null}
          {updatedAt && imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`${symbol} chart ${period}`}
              style={{ width: "100%", height: "auto", display: "block", borderRadius: 10 }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
