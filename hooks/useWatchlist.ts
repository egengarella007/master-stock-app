"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { WatchlistRecord } from "@/lib/types";

/**
 * Rare re-fetch if Realtime misses (background tab, reconnect, publication off).
 * Primary updates come from Supabase Realtime on `public.watchlist`.
 */
const FALLBACK_POLL_MS = 30_000;

/**
 * Loads watchlist from Supabase.
 *
 * Updates:
 * - **Realtime** `postgres_changes` on `public.watchlist` → immediate `refresh()`.
 *   Enable: Supabase → Database → Publications → `supabase_realtime` → table `watchlist`.
 * - **`eg-watchlist-refresh`** window event (optional; same-tab code can `await refresh()` instead).
 * - **Fallback interval** every {@link FALLBACK_POLL_MS} ms.
 */
export function useWatchlist() {
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

    const onRefresh = () => {
      void load();
    };
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
            void load();
          },
        )
        .subscribe();
    }

    const pollId = window.setInterval(() => {
      void load();
    }, FALLBACK_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.removeEventListener("eg-watchlist-refresh", onRefresh);
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, [load]);

  return { items, loading, error, refresh: load };
}
