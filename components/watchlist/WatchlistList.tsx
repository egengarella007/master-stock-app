"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useWatchlistContext } from "@/components/watchlist/WatchlistContext";
import { WatchlistRow } from "@/components/watchlist/WatchlistRow";
import { ErrorBanner } from "@/components/shared/ErrorBanner";

const COLORS = {
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";

function ThinSkeleton() {
  return (
    <div
      className="skeleton-pulse"
      style={{
        height: 36,
        borderBottom: "1px solid rgba(148,163,184,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}
    />
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable=true], [role='textbox']"),
  );
}

export function WatchlistList() {
  const router = useRouter();
  const { items, loading, error, refresh } = useWatchlistContext();
  const searchParams = useSearchParams();
  const selected = (searchParams.get("symbol") ?? "").toUpperCase();
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const deleteInFlight = useRef(false);

  const removeSelected = useCallback(async () => {
    const sym = selected;
    if (!sym || deleteInFlight.current) return;
    if (!itemsRef.current.some((i) => i.symbol.toUpperCase() === sym)) return;
    deleteInFlight.current = true;
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to remove");
      }
      await refresh();
      router.push("/inside/home");
      router.refresh();
    } catch {
      /* ignore — could toast later */
    } finally {
      deleteInFlight.current = false;
    }
  }, [refresh, router, selected]);

  useEffect(() => {
    if (!selected) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      void removeSelected();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [removeSelected, selected]);

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (loading && items.length === 0) {
    return (
      <div>
        <ThinSkeleton />
        <ThinSkeleton />
        <ThinSkeleton />
        <ThinSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: FONT, padding: "8px 8px 10px", lineHeight: 1.35 }}>
        No tickers. Add above.
      </div>
    );
  }

  return (
    <div>
      {items.map((it) => (
        <WatchlistRow key={it.symbol} item={it} selected={selected === it.symbol} />
      ))}
    </div>
  );
}
