"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  bg: "#12131f",
  border: "rgba(148,163,184,0.14)",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#a855f7",
};

const FONT = "system-ui, -apple-system, sans-serif";

const tabs = [
  { href: "/inside/home", label: "Home", icon: "H" },
  { href: "/inside/watchlist", label: "Watchlist", icon: "W" },
  { href: "/inside/options", label: "Options", icon: "O" },
  { href: "/inside/settings", label: "Settings", icon: "S" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)");
  if (!isMobile) return null;

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 64,
        display: "flex",
        borderTop: `1px solid ${COLORS.border}`,
        background: COLORS.bg,
        fontFamily: FONT,
        zIndex: 50,
      }}
    >
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              minHeight: 44,
              fontSize: 11,
              fontWeight: active ? 800 : 600,
              color: active ? COLORS.accent : COLORS.muted,
              textDecoration: "none",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                border: `1px solid ${COLORS.border}`,
                background: active ? "rgba(168,85,247,0.18)" : "rgba(255,255,255,0.04)",
                color: active ? COLORS.accent : COLORS.muted,
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {t.icon}
            </span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
