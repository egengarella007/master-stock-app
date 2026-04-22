-- Run in Supabase SQL Editor (or via migration) if not already applied.
CREATE TABLE IF NOT EXISTS market_breadth (
  id INTEGER PRIMARY KEY DEFAULT 1,
  advancing INTEGER,
  declining INTEGER,
  new_highs INTEGER,
  new_lows INTEGER,
  above_sma50_pct NUMERIC,
  above_sma200_pct NUMERIC,
  advancing_vol TEXT,
  declining_vol TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
ALTER TABLE market_breadth DISABLE ROW LEVEL SECURITY;
INSERT INTO market_breadth (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
