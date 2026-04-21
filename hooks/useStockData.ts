"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { StockDataRow } from "@/lib/types";

export function useStockData(symbol: string | null, pollMs = 30_000) {
  const [stock, setStock] = useState<StockDataRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!symbol) {
      setStock(null);
      setLoading(false);
      return;
    }
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Supabase is not configured");
      setStock(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: qErr } = await sb.from("stock_data").select("*").eq("symbol", symbol).maybeSingle();
    if (qErr) {
      setError(qErr.message);
      setStock(null);
    } else {
      setStock((data as StockDataRow) ?? null);
    }
    setLoading(false);
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    const id = window.setInterval(() => {
      void load();
    }, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [load, pollMs]);

  return { stock, loading, error, refresh: load };
}
