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
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: FONT,
        display: "flex",
      }}
    >
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div style={{ flex: 1, padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
