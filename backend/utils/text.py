from __future__ import annotations

import re

import tiktoken

_ENC_NAME = "cl100k_base"
_tokenizer_encoding_cached = None


def clean_text(
    text: str,
    collapse_whitespace: bool = True,
    strip_special_chars: bool = False,
) -> str:
    """Normalize input text.

    Args:
        text: Raw input string.
        collapse_whitespace: Collapse multiple spaces/newlines.
        strip_special_chars: Remove non-alphanumeric characters.
    """
    if not text:
        return ""

    if collapse_whitespace:
        text = re.sub(r"[^\S\n]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

    if strip_special_chars:
        text = re.sub(r"[^\w\s.,!?;:\-()'\"$/@%&+=#]", "", text)

    return text.strip()


def count_tokens(text: str) -> int:
    """Return an accurate token count using OpenAI's tiktoken.

    Falls back to a character-based heuristic if tiktoken is unavailable.
    """
    global _tokenizer_encoding_cached
    try:
        if _tokenizer_encoding_cached is None:
            _tokenizer_encoding_cached = tiktoken.get_encoding(_ENC_NAME)
        return len(_tokenizer_encoding_cached.encode(text))
    except Exception:
        # Rough heuristic: ~4 chars per token
        return max(1, len(text) // 4)


def truncate_text(
    text: str,
    max_tokens: int,
    from_end: bool = False,
) -> str:
    """Truncate *text* to fit within *max_tokens*.

    Args:
        text: Input string.
        max_tokens: Maximum token budget.
        from_end: If ``True`` keep the tail of the text instead of the head.
    """
    if count_tokens(text) <= max_tokens:
        return text

    try:
        enc = tiktoken.get_encoding(_ENC_NAME)
        tokens = enc.encode(text)
        kept = tokens[:max_tokens] if not from_end else tokens[-max_tokens:]
        return enc.decode(kept)
    except Exception:
        approx_chars = max_tokens * 4
        if from_end:
            return text[-approx_chars:]
        return text[:approx_chars]


_TICKER_PATTERN = re.compile(r"\b[A-Z]{1,5}(?:\.[A-Z]{1,2})?\b")


def extract_tickers(text: str) -> list[str]:
    """Extract potential stock tickers from text.

    Heuristic: uppercase tokens of 1-5 letters (with optional exchange suffix),
    filtered against common false positives.
    """
    # Words that commonly appear in ALL CAPS in financial text
    false_positive = {
        "USA", "US", "EU", "AI", "CEO", "CFO", "COO", "CTO", "IPO", "GDP",
        "ETF", "SEC", "FDA", "EPS", "P/E", "PE", "ROE", "ROA", "ROI",
        "YOY", "FCF", "EBITDA", "NASDAQ", "NYSE", "TSX", "LSE", "HK",
        "THIS", "THAT", "AND", "THE", "FOR", "WITH", "NOT", "ARE", "YOUR",
        "EVERY", "WHEN", "FROM", "THAN", "THEN", "THEY", "WHAT", "WILL",
    }

    matches = _TICKER_PATTERN.findall(text)
    tickers = sorted(
        {m for m in matches if m not in false_positive and len(m) >= 2}
    )
    return tickers