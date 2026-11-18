"use strict";

const express = require("express");

// ─── Ticker symbols (CNBC quote symbols) ──────────────────────────────────────
const SYMBOLS = [
  { symbol: ".NSEI",          label: "NIFTY 50",   market: "IN", type: "index" },
  { symbol: ".NSEBANK",       label: "NIFTY BANK", market: "IN", type: "index" },
  ...["RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "SBIN", "BHARTIARTL", "ITC", "LT",
      "HINDUNILVR", "BAJFINANCE", "KOTAKBANK", "AXISBANK", "MARUTI", "SUNPHARMA"]
    .map(t => ({ symbol: `${t}-IN`, label: t, market: "IN", type: "stock" })),

  { symbol: ".SPX",           label: "S&P 500",    market: "US", type: "index" },
  { symbol: ".IXIC",          label: "NASDAQ",     market: "US", type: "index" },
  { symbol: ".DJI",           label: "DOW",        market: "US", type: "index" },
  ...["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "JPM", "BRK.B", "LLY", "V"]
    .map(t => ({ symbol: t, label: t, market: "US", type: "stock" })),
];

const REFRESH_MS = 60 * 60 * 1000;
const QUOTE_URL = "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol";

// CNBC formats numbers as strings: "1,164.90", "+0.53", "-1.82%", "UNCH"
function toNumber(value) {
  if (value == null || value === "UNCH") return 0;
  const n = parseFloat(String(value).replace(/[,%+]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
module.exports = function createQuotes({ auth, ok, fail }) {
  let cache = { quotes: [], updatedAt: null };

  async function refresh() {
    try {
      const params = new URLSearchParams({
        symbols: SYMBOLS.map(s => s.symbol).join("|"),
        requestMethod: "itv", noform: "1", partnerId: "2", fund: "1", exthrs: "1", output: "json", events: "1",
      });
      const res = await fetch(`${QUOTE_URL}?${params}`, {
        headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const raw = [].concat(body?.FormattedQuoteResult?.FormattedQuote || []);
      const bySymbol = new Map(raw.filter(q => q.code === 0).map(q => [q.symbol, q]));

      const quotes = SYMBOLS.map(s => {
        const q = bySymbol.get(s.symbol);
        const price = q && toNumber(q.last);
        if (!price) return null;
        return {
          ...s,
          price,
          change: toNumber(q.change) || 0,
          changePct: toNumber(q.change_pct) || 0,
          currency: q.currencyCode || (s.market === "IN" ? "INR" : "USD"),
        };
      }).filter(Boolean);

      if (!quotes.length) throw new Error("no quotes returned");
      cache = { quotes, updatedAt: new Date() };
      console.log(`📈  Ticker refresh: ${quotes.length}/${SYMBOLS.length} quotes`);
    } catch (e) {
      // Keep serving the last good quotes
      console.error("Ticker refresh failed:", e.message);
    }
  }

  function start() {
    refresh();
    setInterval(refresh, REFRESH_MS);
  }

  const router = express.Router();

  router.get("/ticker", auth, (req, res) => {
    if (!cache.quotes.length) return fail(res, "Quotes not available yet", 503);
    ok(res, cache);
  });

  return { start, router };
};
