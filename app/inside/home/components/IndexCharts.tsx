"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

const REFRESH_MS = 60_000;

function cardStyle(): CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: 10,
  };
}

export function IndexCharts() {
  const [mounted, setMounted] = useState(false);
  const [cacheBust, setCacheBust] = useState(() => Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setCacheBust(Date.now()), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const STORAGE_URL = mounted ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") : "";

  const getIndexSrc = useMemo(
    () => (name: string) =>
      `${STORAGE_URL}/storage/v1/object/public/charts/index/${name}.png?t=${cacheBust}`,
    [STORAGE_URL, cacheBust],
  );

  const cards: Array<{ label: string; keyName: string }> = [
    { label: "DOW", keyName: "dow" },
    { label: "NASDAQ", keyName: "nasdaq" },
    { label: "S&P 500", keyName: "sp500" },
  ];

  if (!STORAGE_URL) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
        marginBottom: 18,
      }}
    >
      {cards.map((card) => (
        <div key={card.keyName} style={cardStyle()}>
          <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            {card.label}
          </div>
          <img
            src={getIndexSrc(card.keyName)}
            alt={`${card.label} index chart`}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 8,
              display: "block",
              background: "#101321",
            }}
          />
        </div>
      ))}
    </div>
  );
}
