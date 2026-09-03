from __future__ import annotations

import re
from typing import Any

ALLOWED_FILE_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/csv": ".csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
    "application/json": ".json",
}

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def validate_file_type(
    content_type: str,
    allowed_types: set[str] | None = None,
) -> None:
    """Raise ``ValueError`` if the MIME type is not allowed."""
    allowed = allowed_types or set(ALLOWED_FILE_TYPES.keys())
    if content_type not in allowed:
        raise ValueError(
            f"Unsupported file type '{content_type}'. "
            f"Allowed: {', '.join(sorted(allowed))}"
        )


def validate_file_size(
    size_bytes: int,
    max_bytes: int | None = None,
) -> None:
    """Raise ``ValueError`` if the file exceeds the maximum size."""
    limit = max_bytes or MAX_FILE_SIZE_BYTES
    if size_bytes <= 0:
        raise ValueError("File is empty.")
    if size_bytes > limit:
        raise ValueError(
            f"File too large: {size_bytes} bytes. Max allowed: {limit} bytes "
            f"({limit // (1024 * 1024)} MB)."
        )


def sanitize_input(value: Any, max_length: int = 5000) -> str:
    """Sanitize a user-supplied value for safe storage/display.

    - Coerces to string.
    - Strips control characters.
    - Caps the length.
    - Removes potentially harmful character sequences.
    """
    if value is None:
        return ""

    text = str(value)

    # Remove control characters (but keep newlines/tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Strip null bytes and dangerous path traversal sequences
    text = text.replace("\x00", "").replace("..\\", "..").replace("../", "..")

    # Remove leading/trailing whitespace
    text = text.strip()

    # Also trim excessive internal whitespace for display consistency
    text = re.sub(r" {4,}", "  ", text)

    # Enforce length cap
    if len(text) > max_length:
        text = text[:max_length]

    return text


def sanitize_filename(filename: str) -> str:
    """Return a filesystem-safe filename from user input."""
    filename = sanitize_input(filename, max_length=255)
    # Remove path separators and dangerous chars
    filename = re.sub(r"[\\/:*?\"<>|]", "_", filename)
    if filename in {".", ".."}:
        raise ValueError("Invalid filename.")
    return filename or "file"