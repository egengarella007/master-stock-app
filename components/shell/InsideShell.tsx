"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/shell/Sidebar";

const COLORS = {
  bg: "#0e0f1a",
};

const FONT = "system-ui, -apple-system, sans-serif";

const TABS = [
  { label: "HOME", href: "/inside/home" },
  { label: "GEM", href: "/inside/gem" },
  { label: "EG", href: "/inside/eg" },
  { label: "OPTIONS", href: "/inside/options" },
] as const;

export function InsideShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        maxHeight: "100dvh",
        background: COLORS.bg,
        fontFamily: FONT,
        display: "flex",
        overflow: "hidden",
      }}
    >
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            flexShrink: 0,
            height: 48,
            background: COLORS.bg,
            borderBottom: "1px solid rgba(148,163,184,0.12)",
            display: "flex",
            alignItems: "stretch",
            paddingLeft: 8,
            paddingRight: 8,
          }}
        >
          <nav style={{ display: "flex", alignItems: "stretch", gap: 4 }}>
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 16px",
                    height: 48,
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: "none",
                    color: active ? "#f1f5f9" : "#64748b",
                    borderBottom: active ? "3px solid #a855f7" : "3px solid transparent",
                    boxSizing: "border-box",
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: 20,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
