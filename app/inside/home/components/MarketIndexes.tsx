"use client";

import { useEffect, useState } from "react";

const BG_CARD = "rgba(255,255,255,0.04)";
const BORDER = "1px solid rgba(148,163,184,0.14)";

export function MarketIndexes() {
  const [mounted, setMounted] = useState(false);
  const [cacheBust, setCacheBust] = useState(0);
  const [open, setOpen] = useState(true);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCacheBust(Date.now());
    const id = setInterval(() => setCacheBust(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const STORAGE_URL = mounted ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") : "";

  const charts: Array<{ label: string; file: string }> = [
    { label: "DOW", file: "dow" },
    { label: "NASDAQ", file: "nasdaq" },
    { label: "S&P 500", file: "sp500" },
  ];

  return (
    <div
      style={{
        marginBottom: 20,
        border: BORDER,
        borderRadius: 10,
        background: BG_CARD,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#e2e8f0",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textAlign: "left",
        }}
      >
        <span>MARKET INDEXES</span>
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          ▼
        </span>
      </button>

      {open ? (
        <div
          style={{
            padding: "0 16px 16px",
            display: wide ? "grid" : "flex",
            gridTemplateColumns: wide ? "repeat(3, minmax(0, 1fr))" : undefined,
            flexDirection: wide ? undefined : "row",
            flexWrap: "nowrap",
            gap: 12,
            overflowX: wide ? undefined : "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {charts.map(({ label, file }) => {
            const base = STORAGE_URL
              ? `${STORAGE_URL}/storage/v1/object/public/charts/index/${file}.png`
              : "";
            const src = base ? `${base}?t=${cacheBust}` : "";

            return (
              <div
                key={file}
                style={{
                  flex: wide ? undefined : "0 0 auto",
                  width: wide ? undefined : "min(280px, 85vw)",
                  minWidth: wide ? 0 : undefined,
                  border: BORDER,
                  borderRadius: 10,
                  background: BG_CARD,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 13 }}>{label}</div>
                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    minHeight: 140,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!src ? (
                    <span style={{ color: "#64748b", fontSize: 13 }}>Loading chart...</span>
                  ) : (
                    <img
                      src={src}
                      alt={`${label} index chart`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
