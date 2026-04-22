"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { WatchlistRecord } from "@/lib/types";

/**
 * Rare re-fetch if Realtime misses (background tab, reconnect, publication off).
 * Primary updates come from Supabase Realtime on `public.watchlist`.
 */
const FALLBACK_POLL_MS = 30_000;

function toMillis(ts: string | null | undefined): number {
  if (!ts) return 0;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? 0 : ms;
}

function isPending(row: WatchlistRecord): boolean {
  return row.price == null || row.change_percent == null;
}

function sortWatchlist(rows: WatchlistRecord[]): WatchlistRecord[] {
  return [...rows].sort((a, b) => {
    const aPending = isPending(a);
    const bPending = isPending(b);
    if (aPending !== bPending) return aPending ? -1 : 1;

    // Pending rows stay at the top, newest first, until populated.
    if (aPending && bPending) {
      const byAdded = toMillis(b.added_at) - toMillis(a.added_at);
      if (byAdded !== 0) return byAdded;
    } else {
      // Populated rows continue to rank by strongest percentage change first.
      const aCp = a.change_percent ?? Number.NEGATIVE_INFINITY;
      const bCp = b.change_percent ?? Number.NEGATIVE_INFINITY;
      const byCp = bCp - aCp;
      if (byCp !== 0) return byCp;
    }

    return a.symbol.localeCompare(b.symbol);
  });
}

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
    setItems(sortWatchlist((data ?? []) as WatchlistRecord[]));
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
