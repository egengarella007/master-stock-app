"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";

const WatchlistContext = createContext<ReturnType<typeof useWatchlist> | null>(null);

export function WatchlistProvider({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const value = useWatchlist();
  return (
    <WatchlistContext.Provider value={value}>
      <div style={style} className={className}>
        {children}
      </div>
    </WatchlistContext.Provider>
  );
}

export function useWatchlistContext() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlistContext must be used within WatchlistProvider");
  }
  return ctx;
}
