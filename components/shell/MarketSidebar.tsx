"use client";

import { useEffect, useState } from "react";
import { MARKETS, marketClockDisplay } from "./marketStatus";

const cardBg = "rgba(255, 255, 255, 0.04)";
const cardBorder = "rgba(148, 163, 184, 0.14)";
const muted = "#94a3b8";
const text = "#f8fafc";
const green = "#34d399";
const red = "#f87171";

export function MarketSidebar() {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      data-market-tick={tick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {!mounted ? (
        <div style={{ height: 108 }} />
      ) : (
        MARKETS.map((m) => {
          const clock = marketClockDisplay(m);
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 8px",
                borderRadius: 8,
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: clock.dot === "green" ? green : red,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: text,
                  flexShrink: 0,
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  textAlign: "right",
                  color: muted,
                  fontSize: 11,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {clock.line}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
