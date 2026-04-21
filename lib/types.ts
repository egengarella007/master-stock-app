export type NewsItem = {
  title?: string;
  headline?: string;
  link?: string;
  url?: string;
  date?: string;
};

/** One row from public.watchlist (symbol + Finviz fields). */
export type WatchlistRecord = {
  symbol: string;
  added_at: string | null;
  price: number | null;
  change_percent: number | null;
  change: string | null;
  volume: string | null;
  market_cap: string | null;
  high_52w: string | null;
  low_52w: string | null;
  sma20_pct: string | null;
  sma50_pct: string | null;
  sma200_pct: string | null;
  rsi: string | null;
  beta: string | null;
  short_float: string | null;
  inst_own: string | null;
  perf_week: string | null;
  perf_month: string | null;
  perf_quarter: string | null;
  perf_half_year: string | null;
  perf_year: string | null;
  analyst_date: string | null;
  analyst_action: string | null;
  analyst_firm: string | null;
  analyst_rating_change: string | null;
  analyst_price_target: string | null;
  news: NewsItem[] | null;
  updated_at: string | null;
};
