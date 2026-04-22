"use client";

import { Sidebar } from "@/components/shell/Sidebar";

const COLORS = {
  bg: "#0e0f1a",
};

const FONT = "system-ui, -apple-system, sans-serif";

export function InsideShell({ children }: { children: React.ReactNode }) {
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
          overflow: "auto",
        }}
      >
        <div style={{ flex: 1, minHeight: 0, padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
