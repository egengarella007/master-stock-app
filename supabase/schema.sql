-- Single watchlist table: symbols to track + Finviz data (Python upserts full rows).
CREATE TABLE watchlist (
  symbol TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  price NUMERIC,
  change_percent NUMERIC,
  change TEXT,
  volume TEXT,
  market_cap TEXT,
  high_52w TEXT,
  low_52w TEXT,
  sma20_pct TEXT,
  sma50_pct TEXT,
  sma200_pct TEXT,
  rsi TEXT,
  beta TEXT,
  short_float TEXT,
  inst_own TEXT,
  perf_week TEXT,
  perf_month TEXT,
  perf_quarter TEXT,
  perf_half_year TEXT,
  perf_year TEXT,
  analyst_date TEXT,
  analyst_action TEXT,
  analyst_firm TEXT,
  analyst_rating_change TEXT,
  analyst_price_target TEXT,
  news JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ
);

ALTER TABLE watchlist DISABLE ROW LEVEL SECURITY;

-- Chart capture tracking (optional; FK cascades when watchlist row is deleted)
CREATE TABLE chart_metadata (
  symbol TEXT PRIMARY KEY,
  d_updated_at TIMESTAMPTZ,
  w_updated_at TIMESTAMPTZ,
  m_updated_at TIMESTAMPTZ,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chart_metadata DISABLE ROW LEVEL SECURITY;

DELETE FROM chart_metadata c
WHERE NOT EXISTS (SELECT 1 FROM watchlist w WHERE w.symbol = c.symbol);

ALTER TABLE chart_metadata DROP CONSTRAINT IF EXISTS fk_chart_metadata_symbol;

ALTER TABLE chart_metadata
  ADD CONSTRAINT fk_chart_metadata_symbol
  FOREIGN KEY (symbol)
  REFERENCES watchlist (symbol)
  ON DELETE CASCADE;

-- Single-row market breadth snapshot (Finviz homepage; updated by data_updater.py)
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
