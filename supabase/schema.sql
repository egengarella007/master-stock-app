-- Watchlist: just symbols, nothing else
CREATE TABLE watchlist_symbols (
  symbol TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE watchlist_symbols DISABLE ROW LEVEL SECURITY;

-- All stock data fetched by Python
CREATE TABLE stock_data (
  symbol TEXT PRIMARY KEY,
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
  news JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stock_data DISABLE ROW LEVEL SECURITY;

-- Chart capture tracking
CREATE TABLE chart_metadata (
  symbol TEXT PRIMARY KEY,
  d_updated_at TIMESTAMPTZ,
  w_updated_at TIMESTAMPTZ,
  m_updated_at TIMESTAMPTZ,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chart_metadata DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Cascading FKs (existing DBs: if CREATE TABLE already applied, run only
-- from "Orphan cleanup" through the last ALTER in the SQL Editor.)
-- ---------------------------------------------------------------------------

-- Orphan cleanup (safe on empty DB; required before adding FKs if legacy rows exist)
DELETE FROM stock_data s
WHERE NOT EXISTS (SELECT 1 FROM watchlist_symbols w WHERE w.symbol = s.symbol);

DELETE FROM chart_metadata c
WHERE NOT EXISTS (SELECT 1 FROM watchlist_symbols w WHERE w.symbol = c.symbol);

-- Cascading FKs: deleting a watchlist row removes matching stock_data and chart_metadata
ALTER TABLE stock_data DROP CONSTRAINT IF EXISTS fk_stock_data_symbol;
ALTER TABLE chart_metadata DROP CONSTRAINT IF EXISTS fk_chart_metadata_symbol;

ALTER TABLE stock_data
  ADD CONSTRAINT fk_stock_data_symbol
  FOREIGN KEY (symbol)
  REFERENCES watchlist_symbols (symbol)
  ON DELETE CASCADE;

ALTER TABLE chart_metadata
  ADD CONSTRAINT fk_chart_metadata_symbol
  FOREIGN KEY (symbol)
  REFERENCES watchlist_symbols (symbol)
  ON DELETE CASCADE;
