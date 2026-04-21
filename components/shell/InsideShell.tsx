"use client";

import { Sidebar } from "@/components/shell/Sidebar";
import { TabBar } from "@/components/shell/TabBar";
import { Header } from "@/components/shell/Header";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const COLORS = {
  bg: "#0e0f1a",
};

const FONT = "system-ui, -apple-system, sans-serif";

export function InsideShell({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 768px)");

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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!isMobile ? <Header /> : null}
        <div
          style={{
            flex: 1,
            padding: isMobile ? 16 : 20,
            paddingBottom: isMobile ? 88 : 24,
          }}
        >
          {children}
        </div>
        <TabBar />
      </div>
    </div>
  );
}
