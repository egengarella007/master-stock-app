"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { StockDataRow, WatchlistSymbolRow } from "@/lib/types";

export type WatchlistMergedRow = {
  symbol: string;
  added_at: string | null;
  stock: StockDataRow | null;
};

function sortByChangeDesc(items: WatchlistMergedRow[]): WatchlistMergedRow[] {
  return [...items].sort((a, b) => {
    const ca = a.stock?.change_percent ?? null;
    const cb = b.stock?.change_percent ?? null;
    if (ca == null && cb == null) return 0;
    if (ca == null) return 1;
    if (cb == null) return -1;
    return cb - ca;
  });
}

export function useWatchlist(pollMs = 30_000) {
  const [items, setItems] = useState<WatchlistMergedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Supabase is not configured");
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data: wl, error: wlErr } = await sb
      .from("watchlist_symbols")
      .select("symbol, added_at")
      .order("added_at", { ascending: false });
    if (wlErr) {
      setError(wlErr.message);
      setLoading(false);
      return;
    }
    const symbols = ((wl ?? []) as WatchlistSymbolRow[]).map((r) => r.symbol);
    if (symbols.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: stocks, error: stErr } = await sb.from("stock_data").select("*").in("symbol", symbols);
    if (stErr) {
      setError(stErr.message);
      setLoading(false);
      return;
    }
    const map = new Map<string, StockDataRow>();
    for (const row of stocks ?? []) {
      map.set((row as StockDataRow).symbol, row as StockDataRow);
    }
    const merged: WatchlistMergedRow[] = symbols.map((symbol) => ({
      symbol,
      added_at: (wl ?? []).find((w) => w.symbol === symbol)?.added_at ?? null,
      stock: map.get(symbol) ?? null,
    }));
    setItems(sortByChangeDesc(merged));
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (cancelled) return;
    })();
    const id = window.setInterval(() => {
      void load();
    }, pollMs);
    const onRefresh = () => void load();
    window.addEventListener("eg-watchlist-refresh", onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("eg-watchlist-refresh", onRefresh);
    };
  }, [load, pollMs]);

  const sorted = useMemo(() => sortByChangeDesc(items), [items]);

  return { items: sorted, loading, error, refresh: load };
}
