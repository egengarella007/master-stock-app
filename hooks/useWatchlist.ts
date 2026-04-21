"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { WatchlistRecord } from "@/lib/types";

export function useWatchlist(pollMs = 30_000) {
  const [items, setItems] = useState<WatchlistRecord[]>([]);
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
    const { data, error: qErr } = await sb
      .from("watchlist")
      .select("*")
      .order("change_percent", { ascending: false, nullsFirst: false });
    if (qErr) {
      setError(qErr.message);
      setLoading(false);
      return;
    }
    setItems((data ?? []) as WatchlistRecord[]);
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

  return { items, loading, error, refresh: load };
}
