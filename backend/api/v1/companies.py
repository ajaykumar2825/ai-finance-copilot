from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

from pydantic import BaseModel


class CompanySearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str | None = None
    asset_type: str | None = None
    region: str | None = None


class CompanySearchResponse(BaseModel):
    results: list[CompanySearchResult]
    total: int


class CompanyOverview(BaseModel):
    ticker: str
    name: str
    sector: str | None = None
    industry: str | None = None
    description: str | None = None
    website: str | None = None
    employees: int | None = None
    market_cap: float | None = None
    enterprise_value: float | None = None
    pe_ratio: float | None = None
    forward_pe: float | None = None
    peg_ratio: float | None = None
    price_to_book: float | None = None
    price_to_sales: float | None = None
    dividend_yield: float | None = None
    beta: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    current_price: float | None = None
    currency: str = "USD"
    country: str | None = None


class FinancialData(BaseModel):
    ticker: str
    revenue: list[dict] = []
    net_income: list[dict] = []
    earnings_per_share: list[dict] = []
    free_cash_flow: list[dict] = []
    operating_margin: list[dict] = []
    debt_to_equity: float | None = None
    return_on_equity: float | None = None
    current_ratio: float | None = None


class EarningsData(BaseModel):
    ticker: str
    earnings_history: list[dict] = []
    earnings_estimate: dict = {}
    revenue_estimate: dict = {}


class PeerData(BaseModel):
    ticker: str
    peers: list[dict] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _safe_float(value) -> float | None:
    """Convert a value to float, returning None for NaN or None."""
    import math

    if value is None:
        return None
    try:
        f = float(value)
        return None if math.isnan(f) or math.isinf(f) else round(f, 4)
    except (TypeError, ValueError):
        return None


def _safe_str(value) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s if s and s != "None" else None


def _safe_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/search",
    response_model=CompanySearchResponse,
    summary="Search for companies by name or ticker",
)
async def search_companies(
    q: str = Query(min_length=1, max_length=100, description="Search query"),
) -> CompanySearchResponse:
    """Search for companies using yfinance's stock ticker lookup.

    Returns matching tickers with company names and exchange information.
    """
    try:
        import yfinance as yf  # type: ignore[import-untyped]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="yfinance is not installed",
        )

    try:
        results_raw = yf.Search(q, max_results=10)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Search failed: {exc}",
        )

    companies: list[CompanySearchResult] = []

    # yfinance Search returns quotes in .quotes
    quotes = getattr(results_raw, "quotes", None) or []
    for q_item in quotes[:10]:
        companies.append(
            CompanySearchResult(
                ticker=q_item.get("symbol", ""),
                name=q_item.get("shortName") or q_item.get("longName", ""),
                exchange=q_item.get("exchange"),
                asset_type=q_item.get("quoteType"),
                region=q_item.get("region"),
            )
        )

    return CompanySearchResponse(results=companies, total=len(companies))


@router.get(
    "/{ticker}/overview",
    response_model=CompanyOverview,
    summary="Get company overview",
)
async def company_overview(ticker: str) -> CompanyOverview:
    """Fetch a comprehensive overview of a company including key financial ratios and metadata."""
    try:
        import yfinance as yf  # type: ignore[import-untyped]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="yfinance is not installed",
        )

    try:
        stock = yf.Ticker(ticker.upper())
        info = stock.info
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{ticker}' not found: {exc}",
        )

    if not info or info.get("trailingPegRatio") is None and info.get("shortName") is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data found for ticker '{ticker}'",
        )

    return CompanyOverview(
        ticker=ticker.upper(),
        name=info.get("shortName") or info.get("longName", ticker.upper()),
        sector=info.get("sector"),
        industry=info.get("industry"),
        description=info.get("longBusinessSummary"),
        website=info.get("website"),
        employees=_safe_int(info.get("fullTimeEmployees")),
        market_cap=_safe_float(info.get("marketCap")),
        enterprise_value=_safe_float(info.get("enterpriseValue")),
        pe_ratio=_safe_float(info.get("trailingPE")),
        forward_pe=_safe_float(info.get("forwardPE")),
        peg_ratio=_safe_float(info.get("pegRatio")),
        price_to_book=_safe_float(info.get("priceToBook")),
        price_to_sales=_safe_float(info.get("priceToSalesTrailing12Months")),
        dividend_yield=_safe_float(info.get("dividendYield")),
        beta=_safe_float(info.get("beta")),
        fifty_two_week_high=_safe_float(info.get("fiftyTwoWeekHigh")),
        fifty_two_week_low=_safe_float(info.get("fiftyTwoWeekLow")),
        current_price=_safe_float(info.get("currentPrice") or info.get("regularMarketPrice")),
        currency=info.get("currency", "USD"),
        country=info.get("country"),
    )


@router.get(
    "/{ticker}/financials",
    response_model=FinancialData,
    summary="Get company financial statements",
)
async def company_financials(ticker: str) -> FinancialData:
    """Fetch key financial data including revenue, net income, EPS, and FCF history."""
    try:
        import yfinance as yf  # type: ignore[import-untyped]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="yfinance is not installed",
        )

    try:
        stock = yf.Ticker(ticker.upper())
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{ticker}' not found: {exc}",
        )

    def _series_to_list(series) -> list[dict]:
        if series is None or series.empty:
            return []
        items = []
        for date, value in series.items():
            items.append(
                {"date": date.strftime("%Y-%m-%d"), "value": _safe_float(value)}
            )
        return items

    try:
        income = stock.financials
        revenue = _series_to_list(income.loc["Total Revenue"]) if income is not None and "Total Revenue" in income.index else []
        net_income = _series_to_list(income.loc["Net Income"]) if income is not None and "Net Income" in income.index else []
    except Exception:
        revenue = []
        net_income = []

    try:
        info = stock.info
    except Exception:
        info = {}

    try:
        cf = stock.cashflow
        fcf = _series_to_list(cf.loc["Free Cash Flow"]) if cf is not None and "Free Cash Flow" in cf.index else []
    except Exception:
        fcf = []

    # EPS from info (trailing) and historical
    try:
        eps_history = stock.earnings_history
        if eps_history is not None and not eps_history.empty:
            eps_list = [
                {"date": str(idx), "value": _safe_float(row.get("Eps"))}
                for idx, row in eps_history.iterrows()
            ]
        else:
            eps_list = []
    except Exception:
        eps_list = []

    return FinancialData(
        ticker=ticker.upper(),
        revenue=revenue,
        net_income=net_income,
        earnings_per_share=eps_list,
        free_cash_flow=fcf,
        operating_margin=[],
        debt_to_equity=_safe_float(info.get("debtToEquity")),
        return_on_equity=_safe_float(info.get("returnOnEquity")),
        current_ratio=_safe_float(info.get("currentRatio")),
    )


@router.get(
    "/{ticker}/earnings",
    response_model=EarningsData,
    summary="Get earnings data and estimates",
)
async def company_earnings(ticker: str) -> EarningsData:
    """Fetch earnings history and analyst estimates for a company."""
    try:
        import yfinance as yf  # type: ignore[import-untyped]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="yfinance is not installed",
        )

    try:
        stock = yf.Ticker(ticker.upper())
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{ticker}' not found: {exc}",
        )

    history: list[dict] = []
    try:
        eh = stock.earnings_history
        if eh is not None and not eh.empty:
            for idx, row in eh.iterrows():
                history.append(
                    {
                        "date": str(idx),
                        "eps_estimate": _safe_float(row.get("EPS Est")),
                        "eps_actual": _safe_float(row.get("EPS Actual")),
                        "surprise": _safe_float(row.get("Surprise(%)")),
                    }
                )
    except Exception:
        pass

    eps_estimate: dict = {}
    rev_estimate: dict = {}
    try:
        ee = stock.earnings_estimate
        if ee is not None and not ee.empty:
            eps_estimate = {
                col: _safe_float(ee.loc["Avg Estimate"].get(col))
                for col in ee.columns
            } if "Avg Estimate" in ee.index else {}
        re_ = stock.revenue_estimate
        if re_ is not None and not re_.empty:
            rev_estimate = {
                col: _safe_float(re_.loc["Avg Estimate"].get(col))
                for col in re_.columns
            } if "Avg Estimate" in re_.index else {}
    except Exception:
        pass

    return EarningsData(
        ticker=ticker.upper(),
        earnings_history=history,
        earnings_estimate=eps_estimate,
        revenue_estimate=rev_estimate,
    )


@router.get(
    "/{ticker}/peers",
    response_model=PeerData,
    summary="Get peer/similar companies",
)
async def company_peers(ticker: str) -> PeerData:
    """Return a list of peer companies in the same sector/industry."""
    try:
        import yfinance as yf  # type: ignore[import-untyped]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="yfinance is not installed",
        )

    try:
        stock = yf.Ticker(ticker.upper())
        info = stock.info
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{ticker}' not found: {exc}",
        )

    # yfinance doesn't have a direct peers endpoint, but some tickers have
    # "companyOfficers" or we can use sector + industry to find peers via Search
    sector = info.get("sector", "")
    industry = info.get("industry", "")
    peers_list: list[dict] = []

    # Try to get peers from the ticker's info if available
    try:
        if sector and industry:
            query = f"{industry} stocks"
            search_results = yf.Search(query, max_results=6)
            for q in getattr(search_results, "quotes", [])[:6]:
                sym = q.get("symbol", "")
                if sym.upper() != ticker.upper():
                    peers_list.append(
                        {
                            "ticker": sym,
                            "name": q.get("shortName") or q.get("longName", ""),
                            "sector": q.get("sector", sector),
                            "market_cap": _safe_float(q.get("marketCap")),
                        }
                    )
    except Exception:
        pass

    return PeerData(ticker=ticker.upper(), peers=peers_list)
