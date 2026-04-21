"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketBreadthResponse } from "@/lib/types";

export function useMarketBreadth(pollMs = 60_000) {
  const [breadth, setBreadth] = useState<MarketBreadthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/breadth", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as MarketBreadthResponse;
      setBreadth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load breadth");
      setBreadth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(id);
  }, [load, pollMs]);

  return { breadth, loading, error, refresh: load };
}
