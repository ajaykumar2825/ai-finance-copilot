from __future__ import annotations

import logging

from langchain_core.language_models import BaseChatModel

from backend.config import settings

logger = logging.getLogger(__name__)

_llm_instance: BaseChatModel | None = None


def get_llm() -> BaseChatModel:
    """Factory that returns the configured chat model.

    Controlled by ``LLM_PROVIDER`` and ``LLM_MODEL`` env vars.

    Supported providers / models:
    * ``openai``     - ``gpt-4o``, ``gpt-4.1``, ``gpt-5``
    * ``gemini``     - ``gemini-2.0-flash``, ``gemini-2.5-flash``, etc.
    * ``anthropic``  - ``claude-sonnet-4-20250514``, ``claude-opus-4-20250514``, etc.
    """
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    provider = settings.LLM_PROVIDER.lower()
    model = settings.LLM_MODEL

    if provider == "openai":
        _llm_instance = _create_openai_llm(model)
    elif provider == "gemini":
        _llm_instance = _create_gemini_llm(model)
    elif provider == "anthropic":
        _llm_instance = _create_anthropic_llm(model)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER '{provider}'. Supported: openai, gemini, anthropic")

    logger.info("LLM initialised: provider=%s model=%s", provider, model)
    return _llm_instance


def reset_llm() -> None:
    """Reset cached LLM (useful in tests)."""
    global _llm_instance
    _llm_instance = None


# ------------------------------------------------------------------
# Provider implementations
# ------------------------------------------------------------------


def _create_openai_llm(model: str) -> BaseChatModel:
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=model,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,
        max_tokens=4096,
        streaming=True,
    )


def _create_gemini_llm(model: str) -> BaseChatModel:
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.3,
        max_output_tokens=4096,
    )


def _create_anthropic_llm(model: str) -> BaseChatModel:
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(
        model=model,
        api_key=settings.ANTHROPIC_API_KEY,
        temperature=0.3,
        max_tokens=4096,
    )
