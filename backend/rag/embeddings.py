from __future__ import annotations

import logging

from langchain_core.embeddings import Embeddings

from backend.config import settings

logger = logging.getLogger(__name__)

_embeddings_instance: Embeddings | None = None


def get_embeddings() -> Embeddings:
    """Factory that returns the configured embedding model.

    Controlled by the ``EMBEDDING_PROVIDER`` env var:

    * ``openai``  - OpenAI ``text-embedding-3-small`` (default)
    * ``gemini``  - Google ``text-embedding-004``
    * ``local``   - BAAI ``bge-small-en-v1.5`` via ``sentence-transformers``
    """
    global _embeddings_instance
    if _embeddings_instance is not None:
        return _embeddings_instance

    provider = settings.EMBEDDING_PROVIDER.lower()

    if provider == "openai":
        _embeddings_instance = _create_openai_embeddings()
    elif provider == "gemini":
        _embeddings_instance = _create_gemini_embeddings()
    elif provider == "local":
        _embeddings_instance = _create_local_embeddings()
    else:
        raise ValueError(f"Unknown EMBEDDING_PROVIDER '{provider}'. Supported: openai, gemini, local")

    logger.info("Embedding provider initialised: %s", provider)
    return _embeddings_instance


def reset_embeddings() -> None:
    """Reset cached embeddings (useful in tests)."""
    global _embeddings_instance
    _embeddings_instance = None


# ------------------------------------------------------------------
# Provider implementations
# ------------------------------------------------------------------


def _create_openai_embeddings() -> Embeddings:
    from langchain_openai import OpenAIEmbeddings

    return OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=settings.OPENAI_API_KEY,
        dimensions=1536,
        chunk_size=200,
    )


def _create_gemini_embeddings() -> Embeddings:
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=settings.GEMINI_API_KEY,
    )


def _create_local_embeddings() -> Embeddings:
    from langchain_community.embeddings import HuggingFaceEmbeddings

    return HuggingFaceEmbeddings(
        model_name="BAAI/bge-small-en-v1.5",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True, "batch_size": 32},
    )
