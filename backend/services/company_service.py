from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import yfinance as yf

logger = logging.getLogger(__name__)

# Cache ticker objects to avoid repeated network calls within one request
_ticker_cache: dict[str, Any] = {}
_CACHE_TTL = timedelta(minutes=5)
_cache_timestamps: dict[str, datetime] = {}


def _get_ticker(symbol: str) -> Any:
    """Return a cached ``yf.Ticker`` instance."""
    now = datetime.now(timezone.utc)
    cached_at = _cache_timestamps.get(symbol)
    if cached_at and (now - cached_at) < _CACHE_TTL:
        return _ticker_cache[symbol]

    ticker = yf.Ticker(symbol)
    _ticker_cache[symbol] = ticker
    _cache_timestamps[symbol] = now
    return ticker


class CompanyService:
    """Market data via yfinance."""

    async def search_tickers(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        try:
            results = yf.search(query)
            quotes = results.get("quotes", [])[:limit]
            return [
                {
                    "symbol": q.get("symbol", ""),
                    "name": q.get("shortname") or q.get("longname", ""),
                    "exchange": q.get("exchange", ""),
                    "type": q.get("quoteType", ""),
                }
                for q in quotes
            ]
        except Exception as exc:
            logger.warning("Ticker search failed for '%s': %s", query, exc)
            return []

    async def get_overview(self, symbol: str) -> dict[str, Any]:
        ticker = _get_ticker(symbol)
        try:
            info = ticker.info
        except Exception:
            info = {}

        return {
            "symbol": symbol,
            "name": info.get("shortName") or info.get("longName", symbol),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "pb_ratio": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "52wk_high": info.get("fiftyTwoWeekHigh"),
            "52wk_low": info.get("fiftyTwoWeekLow"),
            "currency": info.get("currency", "USD"),
            "website": info.get("website", ""),
            "summary": info.get("longBusinessSummary", ""),
        }

    async def get_financials(self, symbol: str) -> dict[str, Any]:
        ticker = _get_ticker(symbol)
        result: dict[str, Any] = {"symbol": symbol}

        for attr, key in (
            ("income_stmt", "income_statement"),
            ("balance_sheet", "balance_sheet"),
            ("cashflow", "cash_flow"),
        ):
            try:
                df = getattr(ticker, attr, None)
                if df is not None and not df.empty:
                    result[key] = df.to_dict()
                else:
                    result[key] = {}
            except Exception:
                result[key] = {}

        return result

    async def get_earnings(self, symbol: str) -> dict[str, Any]:
        ticker = _get_ticker(symbol)
        try:
            cal = ticker.calendar
            earnings_data: dict[str, Any] = {}
            if cal is not None:
                if isinstance(cal, dict):
                    earnings_data["calendar"] = cal
                else:
                    earnings_data["calendar"] = str(cal)
        except Exception:
            earnings_data = {"calendar": {}}

        try:
            df = ticker.earnings_history
            if df is not None and not df.empty:
                earnings_data["history"] = df.to_dict(orient="records")
            else:
                earnings_data["history"] = []
        except Exception:
            earnings_data["history"] = []

        return earnings_data

    async def get_peers(self, symbol: str) -> list[dict[str, str]]:
        ticker = _get_ticker(symbol)
        try:
            peers = ticker.recommended_competitors
            if peers is not None and not peers.empty:
                return [
                    {
                        "symbol": str(row.get("Symbol", "")),
                        "name": str(row.get("Name", "")),
                    }
                    for _, row in peers.iterrows()
                ]
        except Exception as exc:
            logger.debug("Could not fetch peers for %s: %s", symbol, exc)

        # Fallback: use sector from info
        try:
            info = ticker.info
            sector = info.get("sector", "")
            if sector:
                sector_tickers = yf.search(sector)
                quotes = sector_tickers.get("quotes", [])[:5]
                return [
                    {
                        "symbol": q.get("symbol", ""),
                        "name": q.get("shortname") or q.get("longname", ""),
                    }
                    for q in quotes
                    if q.get("symbol", "").upper() != symbol.upper()
                ]
        except Exception:
            pass
        return []

    async def get_stock_price(self, symbol: str) -> dict[str, Any]:
        ticker = _get_ticker(symbol)
        try:
            hist = ticker.history(period="1d")
            if hist.empty:
                return {"symbol": symbol, "price": None, "error": "no data"}
            last = hist.iloc[-1]
            return {
                "symbol": symbol,
                "price": float(last["Close"]),
                "open": float(last["Open"]),
                "high": float(last["High"]),
                "low": float(last["Low"]),
                "volume": int(last["Volume"]),
            }
        except Exception as exc:
            logger.warning("Price fetch failed for %s: %s", symbol, exc)
            return {"symbol": symbol, "price": None, "error": str(exc)}

    async def get_historical_data(
        self,
        symbol: str,
        period: str = "1y",
        interval: str = "1d",
    ) -> dict[str, Any]:
        ticker = _get_ticker(symbol)
        try:
            hist = ticker.history(period=period, interval=interval)
            if hist.empty:
                return {"symbol": symbol, "data": [], "error": "no data"}

            records = []
            for date_idx, row in hist.iterrows():
                records.append(
                    {
                        "date": date_idx.strftime("%Y-%m-%d"),
                        "open": round(float(row["Open"]), 4),
                        "high": round(float(row["High"]), 4),
                        "low": round(float(row["Low"]), 4),
                        "close": round(float(row["Close"]), 4),
                        "volume": int(row["Volume"]),
                    }
                )

            return {"symbol": symbol, "data": records}
        except Exception as exc:
            logger.warning("History fetch failed for %s: %s", symbol, exc)
            return {"symbol": symbol, "data": [], "error": str(exc)}
