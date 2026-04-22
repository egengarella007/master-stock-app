"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { WatchlistRecord } from "@/lib/types";

/**
 * Refreshes when:
 * - Supabase Realtime fires on `public.watchlist` (no manual refresh) — enable in Dashboard:
 *   Database → Publications → supabase_realtime → include table `watchlist`
 * - Interval polling (fallback if Realtime is off)
 * - `window` event `eg-watchlist-refresh` (local add/remove)
 */
export function useWatchlist(pollMs = 15_000) {
  const [items, setItems] = useState<WatchlistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Browser `setTimeout` id (number); avoids Node `Timeout` vs DOM mismatch in Next types. */
  const debounceRef = useRef<number | null>(null);

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

  const scheduleLoad = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void load();
    }, 400);
  }, [load]);

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

    const sb = getSupabaseBrowser();
    let channel: RealtimeChannel | null = null;
    if (sb) {
      channel = sb
        .channel("watchlist-ui")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "watchlist" },
          () => {
            scheduleLoad();
          },
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("eg-watchlist-refresh", onRefresh);
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, [load, pollMs, scheduleLoad]);

  return { items, loading, error, refresh: load };
}
