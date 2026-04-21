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

  const submit = useCallback(async () => {
    setError(null);
    const sym = normalizeSymbol(value);
    if (!sym) {
      setError("Ticker required");
      return;
    }
    if (!isValidSymbol(sym)) {
      setError("Invalid format");
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
        throw new Error(body.error ?? "Failed to add");
      }
      setValue("");
      window.dispatchEvent(new Event("eg-watchlist-refresh"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSubmitting(false);
    }
  }, [router, value]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void submit();
    },
    [submit],
  );

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: FONT }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center", height: 32 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add ticker..."
          autoCapitalize="characters"
          style={{
            flex: 1,
            minWidth: 0,
            height: 32,
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.bg,
            color: COLORS.text,
            padding: "0 8px",
            fontSize: 12,
            outline: "none",
            fontFamily: FONT,
          }}
        />
        <button
          type="submit"
          disabled={submitting}
          aria-label="Add ticker"
          style={{
            width: 28,
            height: 32,
            flexShrink: 0,
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.accent,
            color: "#0b0b12",
            fontWeight: 800,
            fontSize: 16,
            lineHeight: 1,
            cursor: submitting ? "wait" : "pointer",
            fontFamily: FONT,
            padding: 0,
          }}
        >
          +
        </button>
      </div>
      {error ? <div style={{ fontSize: 10, color: "#fecaca", lineHeight: 1.2 }}>{error}</div> : null}
    </form>
  );
}
