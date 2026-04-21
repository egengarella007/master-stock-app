import { Suspense } from "react";
import { HomeDashboard } from "@/components/home/HomeDashboard";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div style={{ color: "#94a3b8", fontFamily: "system-ui, -apple-system, sans-serif" }}>Loading…</div>
      }
    >
      <HomeDashboard />
    </Suspense>
  );
}
