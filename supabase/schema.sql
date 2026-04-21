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
