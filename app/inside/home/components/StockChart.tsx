"use client";

import { useEffect, useState } from "react";

type Period = "d" | "w" | "m";

export function StockChart({
  symbol,
  period,
  cacheBust,
}: {
  symbol: string;
  period: Period;
  cacheBust: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const STORAGE_BASE = mounted
    ? (process.env.NEXT_PUBLIC_STORAGE_URL ?? "").replace(/\/$/, "")
    : "";

  const suffix = period === "w" ? "W" : period === "m" ? "M" : "D";
  const storageSrc = STORAGE_BASE
    ? `${STORAGE_BASE}/stocks/${symbol.toUpperCase()}_${suffix}.png?t=${cacheBust}`
    : `/charts/stocks/${symbol.toLowerCase()}.png?t=${cacheBust}`;

  return (
    <img
      src={storageSrc}
      alt={`${symbol.toUpperCase()} ${suffix} chart`}
      style={{
        width: "100%",
        height: "auto",
        borderRadius: 8,
        display: "block",
        background: "#101321",
      }}
    />
  );
}
