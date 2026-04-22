"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WatchlistRecord } from "@/lib/types";
import { formatUsd } from "@/lib/formatters";

const COLORS = {
  text: "#f8fafc",
  green: "#34d399",
  red: "#f87171",
  muted: "#64748b",
};

const FONT = "system-ui, -apple-system, sans-serif";

/** How far left (px) before we delete on release. */
const SWIPE_COMMIT_PX = 52;
/** Max drag left reveal. */
const SWIPE_MAX_PX = 88;
/** Movement before we decide horizontal vs vertical intent. */
const SWIPE_LOCK_PX = 10;

export function WatchlistRow({ item, selected }: { item: WatchlistRecord; selected: boolean }) {
  const router = useRouter();
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const dragXRef = useRef(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<"none" | "h" | "v">("none");
  const pointerIdRef = useRef<number | null>(null);
  const blockNextClickRef = useRef(false);

  const cp = item.change_percent ?? null;
  const priceStr = formatUsd(item.price ?? null);

  const setDrag = useCallback((x: number) => {
    dragXRef.current = x;
    setDragX(x);
  }, []);

  const removeRow = useCallback(async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: item.symbol }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to remove");
      }
      window.dispatchEvent(new Event("eg-watchlist-refresh"));
      router.refresh();
    } finally {
      setRemoving(false);
      setDrag(0);
    }
  }, [item.symbol, router, setDrag]);

  const endDrag = useCallback(
    (commit: boolean) => {
      setIsDragging(false);
      pointerIdRef.current = null;
      startRef.current = null;
      axisRef.current = "none";
      if (commit) {
        blockNextClickRef.current = true;
        void removeRow();
      } else {
        setDrag(0);
      }
    },
    [removeRow, setDrag],
  );

  const onPointerDownCapture = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startRef.current = { x: e.clientX, y: e.clientY };
    axisRef.current = "none";
    setIsDragging(true);
    rowRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerUpCapture = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;
      try {
        rowRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const x = dragXRef.current;
      if (axisRef.current === "h" && x <= -SWIPE_COMMIT_PX) {
        endDrag(true);
        return;
      }
      if (axisRef.current === "h" && Math.abs(x) > SWIPE_LOCK_PX) {
        blockNextClickRef.current = true;
      }
      endDrag(false);
    },
    [endDrag],
  );

  const onPointerCancelCapture = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;
      try {
        rowRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      endDrag(false);
    },
    [endDrag],
  );

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current || !startRef.current) return;

      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;

      if (axisRef.current === "none") {
        if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }

      if (axisRef.current === "h") {
        e.preventDefault();
        const clamped = Math.max(-SWIPE_MAX_PX, Math.min(0, dx));
        setDrag(clamped);
      }
    };
    el.addEventListener("pointermove", move, { passive: false });
    return () => el.removeEventListener("pointermove", move);
  }, [setDrag]);

  const onLinkClick = useCallback((e: React.MouseEvent) => {
    if (blockNextClickRef.current) {
      e.preventDefault();
      blockNextClickRef.current = false;
    }
  }, []);

  return (
    <div
      ref={rowRef}
      onPointerDownCapture={onPointerDownCapture}
      onPointerUpCapture={onPointerUpCapture}
      onPointerCancelCapture={onPointerCancelCapture}
      style={{
        position: "relative",
        fontFamily: FONT,
        overflow: "hidden",
        touchAction: "pan-y",
        opacity: removing ? 0.45 : 1,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: SWIPE_MAX_PX,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(90deg, transparent, rgba(248,113,113,0.35))",
          color: COLORS.red,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        Remove
      </div>

      <Link
        href={`/inside/home?symbol=${encodeURIComponent(item.symbol)}`}
        scroll={false}
        onClick={onLinkClick}
        aria-busy={removing}
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
          touchAction: "pan-y",
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 0.18s ease-out",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          role="row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 8px",
            height: 36,
            borderBottom: "1px solid rgba(148,163,184,0.08)",
            borderLeft: selected ? "3px solid #a855f7" : "3px solid transparent",
            background: selected ? "rgba(168,85,247,0.06)" : "rgba(18,19,31,0.98)",
            cursor: removing ? "wait" : "pointer",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: COLORS.text,
              letterSpacing: "0.02em",
            }}
          >
            {item.symbol}
          </span>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#f8fafc",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {priceStr}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: cp == null ? COLORS.muted : cp >= 0 ? COLORS.green : COLORS.red,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cp == null ? "—" : `${cp >= 0 ? "+" : ""}${cp.toFixed(2)}%`}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
