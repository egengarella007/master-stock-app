"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const COLORS = {
  bg: "#0e0f1a",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#a855f7",
};

const RADIUS = 12;
const FONT = "system-ui, -apple-system, sans-serif";

export default function PasswordGatePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => password.length > 0 && !submitting, [password.length, submitting]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: RADIUS,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.card,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.text }}>EG Portfolio</div>
        <div style={{ marginTop: 6, fontSize: 13, color: COLORS.muted }}>EG Portfolio Management</div>

        <form
          style={{ marginTop: 16, display: "grid", gap: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!password) {
              setError("Password is required");
              return;
            }
            setSubmitting(true);
            try {
              const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              const body = (await res.json().catch(() => ({}))) as { error?: string };
              if (!res.ok) {
                throw new Error(body.error ?? "Login failed");
              }
              router.replace("/inside/home");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12, color: COLORS.muted }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                minHeight: 48,
                borderRadius: RADIUS,
                border: `1px solid ${COLORS.border}`,
                background: "rgba(255,255,255,0.04)",
                color: COLORS.text,
                padding: "0 12px",
                outline: "none",
                fontSize: 16,
                fontFamily: FONT,
              }}
            />
          </label>

          {error ? <div style={{ color: "#fecaca", fontSize: 13 }}>{error}</div> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              minHeight: 48,
              borderRadius: RADIUS,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.accent,
              color: "#0b0b12",
              fontWeight: 900,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.55,
              fontSize: 15,
              fontFamily: FONT,
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
