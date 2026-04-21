"use client";

import { useCallback, useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

type IndexUrls = { dow: string; nasdaq: string; sp500: string };

export function IndexCharts() {
  const mobile = useMediaQuery("(max-width: 768px)");
  const [urls, setUrls] = useState<IndexUrls | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/charts?kind=index", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load index charts");
      }
      const data = (await res.json()) as { urls: IndexUrls };
      setUrls(data.urls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setUrls(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontWeight: 800, color: COLORS.text, fontSize: mobile ? 16 : 15 }}>Indices</div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>60s refresh</div>
      </div>
      {error ? (
        <div style={{ color: "#fecaca", fontSize: 13 }}>{error}</div>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: mobile ? "auto" : "visible",
          paddingBottom: mobile ? 6 : 0,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { label: "DOW", src: urls?.dow },
          { label: "NASDAQ", src: urls?.nasdaq },
          { label: "S&P 500", src: urls?.sp500 },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              minWidth: mobile ? "78%" : "32%",
              flex: mobile ? "0 0 auto" : "1 1 0",
              borderRadius: RADIUS,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.card,
              padding: mobile ? 16 : 12,
            }}
          >
            <div style={{ fontSize: mobile ? 14 : 13, color: COLORS.muted, marginBottom: 8 }}>{c.label}</div>
            {!c.src ? (
              <div style={{ height: 160, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.src}
                alt={`${c.label} chart`}
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
