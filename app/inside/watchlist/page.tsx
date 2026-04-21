import { Suspense } from "react";
import { AddSymbolForm } from "@/components/watchlist/AddSymbolForm";
import { WatchlistList } from "@/components/watchlist/WatchlistList";

const COLORS = {
  text: "#f8fafc",
  muted: "#94a3b8",
};

const FONT = "system-ui, -apple-system, sans-serif";

export default function WatchlistPage() {
  return (
    <div style={{ maxWidth: 720, fontFamily: FONT }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.text }}>Watchlist</div>
      <div style={{ marginTop: 6, fontSize: 13, color: COLORS.muted }}>
        Full-page watchlist for mobile. Desktop also has the sidebar list.
      </div>
      <div style={{ marginTop: 14 }}>
        <AddSymbolForm />
      </div>
      <div style={{ marginTop: 14 }}>
        <Suspense
          fallback={
            <div style={{ color: COLORS.muted, fontFamily: FONT }}>Loading…</div>
          }
        >
          <WatchlistList />
        </Suspense>
      </div>
    </div>
  );
}
