"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = {
  bg: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#a855f7",
};

const RADIUS = 10;
const FONT = "system-ui, -apple-system, sans-serif";

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

function isValidSymbol(sym: string): boolean {
  return /^[A-Z0-9.\-]{1,15}$/.test(sym);
}

export function AddSymbolForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const sym = normalizeSymbol(value);
      if (!sym) {
        setError("Enter a symbol");
        return;
      }
      if (!isValidSymbol(sym)) {
        setError("Invalid symbol format");
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: sym }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Failed to add symbol");
        }
        setValue("");
        window.dispatchEvent(new Event("eg-watchlist-refresh"));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add symbol");
      } finally {
        setSubmitting(false);
      }
    },
    [router, value],
  );

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add symbol"
          autoCapitalize="characters"
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: RADIUS,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
            color: COLORS.text,
            padding: "0 12px",
            fontSize: 14,
            outline: "none",
            fontFamily: FONT,
          }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            minHeight: 44,
            minWidth: 72,
            borderRadius: RADIUS,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.accent,
            color: "#0b0b12",
            fontWeight: 700,
            cursor: submitting ? "wait" : "pointer",
            fontFamily: FONT,
          }}
        >
          Add
        </button>
      </div>
      {error ? <div style={{ fontSize: 12, color: "#fecaca" }}>{error}</div> : null}
    </form>
  );
}
