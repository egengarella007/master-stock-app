"use client";

import { useEffect, useState } from "react";

const BG_CARD = "rgba(255,255,255,0.04)";
const BORDER = "1px solid rgba(148,163,184,0.14)";
const BAR_BG = "rgba(148,163,184,0.15)";
const GREEN = "#34d399";
const RED = "#f87171";
const BLUE = "#3b82f6";

type BreadthState = {
  advancing: number | null;
  declining: number | null;
  new_highs: number | null;
  new_lows: number | null;
  above_sma50_pct: number | null;
  above_sma200_pct: number | null;
  updated_at: string | null;
};

const fmt = (n: number) => n.toLocaleString();

function pctLabel(pct: string): string {
  return pct === "—" ? "—" : `${pct}%`;
}

function SplitBarRow({
  leftLabel,
  rightLabel,
  leftVal,
  rightVal,
}: {
  leftLabel: string;
  rightLabel: string;
  leftVal: number;
  rightVal: number;
}) {
  const total = leftVal + rightVal;
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: 12,
          color: "#94a3b8",
        }}
      >
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          background: BAR_BG,
          overflow: "hidden",
        }}
      >
        {total <= 0 ? null : (
          <>
            <div
              style={{
                flex: leftVal,
                minWidth: leftVal > 0 ? 2 : 0,
                background: GREEN,
                transition: "flex 0.2s ease",
              }}
            />
            <div
              style={{
                flex: rightVal,
                minWidth: rightVal > 0 ? 2 : 0,
                background: RED,
                transition: "flex 0.2s ease",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ProgressBarRow({
  label,
  pct,
}: {
  label: string;
  pct: number | null;
}) {
  const width = pct == null || Number.isNaN(pct) ? 0 : Math.min(100, Math.max(0, pct));
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: 12,
          color: "#94a3b8",
        }}
      >
        <span>{label}</span>
        <span>{pct == null || Number.isNaN(pct) ? "—" : `${pct}%`}</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: BAR_BG,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: BLUE,
            borderRadius: 4,
            transition: "width 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}

export function MarketIndexes() {
  const [mounted, setMounted] = useState(false);
  const [cacheBust, setCacheBust] = useState(0);
  const [open, setOpen] = useState(true);
  const [wide, setWide] = useState(false);
  const [breadth, setBreadth] = useState<BreadthState | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCacheBust(Date.now());
    const id = setInterval(() => setCacheBust(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/breadth");
        const json = (await res.json()) as BreadthState & { error?: string };
        if (!res.ok || json.error) {
          setBreadth(null);
          return;
        }
        setBreadth({
          advancing: json.advancing ?? null,
          declining: json.declining ?? null,
          new_highs: json.new_highs ?? null,
          new_lows: json.new_lows ?? null,
          above_sma50_pct: json.above_sma50_pct ?? null,
          above_sma200_pct: json.above_sma200_pct ?? null,
          updated_at: json.updated_at ?? null,
        });
      } catch {
        setBreadth(null);
      }
    };
    void load();
    const interval = setInterval(() => void load(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const STORAGE_URL = mounted ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") : "";

  const charts: Array<{ file: string; alt: string }> = [
    { file: "dow", alt: "Dow Jones index chart" },
    { file: "nasdaq", alt: "NASDAQ index chart" },
    { file: "sp500", alt: "S&P 500 index chart" },
  ];

  const adv = breadth?.advancing;
  const dec = breadth?.declining;
  const advN = adv == null ? 0 : Math.max(0, adv);
  const decN = dec == null ? 0 : Math.max(0, dec);

  const hi = breadth?.new_highs;
  const lo = breadth?.new_lows;
  const hiN = hi == null ? 0 : Math.max(0, hi);
  const loN = lo == null ? 0 : Math.max(0, lo);

  const total = (breadth?.advancing ?? 0) + (breadth?.declining ?? 0);
  const advPct = total > 0 ? ((breadth?.advancing ?? 0) / total * 100).toFixed(1) : "—";
  const decPct = total > 0 ? ((breadth?.declining ?? 0) / total * 100).toFixed(1) : "—";

  const totalHiLo = (breadth?.new_highs ?? 0) + (breadth?.new_lows ?? 0);
  const hiPct = totalHiLo > 0 ? ((breadth?.new_highs ?? 0) / totalHiLo * 100).toFixed(1) : "—";
  const loPct = totalHiLo > 0 ? ((breadth?.new_lows ?? 0) / totalHiLo * 100).toFixed(1) : "—";

  const advDeclLeft = `Advancing ${pctLabel(advPct)} (${adv != null ? fmt(adv) : "—"})`;
  const advDeclRight = `${dec != null ? fmt(dec) : "—"} (${pctLabel(decPct)}) Declining`;

  const hiLoLeft = `New High ${pctLabel(hiPct)} (${hi != null ? fmt(hi) : "—"})`;
  const hiLoRight = `(${lo != null ? fmt(lo) : "—"}) ${pctLabel(loPct)} New Low`;

  let updatedLabel = "—";
  if (breadth?.updated_at) {
    try {
      updatedLabel = new Date(breadth.updated_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      updatedLabel = breadth.updated_at;
    }
  }

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
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: wide ? "grid" : "flex",
              gridTemplateColumns: wide ? "repeat(3, minmax(0, 1fr))" : undefined,
              flexDirection: wide ? undefined : "row",
              flexWrap: "nowrap",
              gap: 12,
              overflowX: wide ? undefined : "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {charts.map(({ file, alt }) => {
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
                  }}
                >
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
                        alt={alt}
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

          <div
            style={{
              borderTop: "1px solid rgba(148,163,184,0.12)",
              paddingTop: 16,
            }}
          >
            <SplitBarRow
              leftLabel={advDeclLeft}
              rightLabel={advDeclRight}
              leftVal={advN}
              rightVal={decN}
            />
            <SplitBarRow
              leftLabel={hiLoLeft}
              rightLabel={hiLoRight}
              leftVal={hiN}
              rightVal={loN}
            />
            <ProgressBarRow label="% above SMA50" pct={breadth?.above_sma50_pct ?? null} />
            <ProgressBarRow label="% above SMA200" pct={breadth?.above_sma200_pct ?? null} />
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Breadth updated: {breadth ? updatedLabel : "—"}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
