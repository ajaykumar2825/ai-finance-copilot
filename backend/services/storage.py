from __future__ import annotations

import logging
from io import BytesIO
from typing import Any

from backend.config import settings
from backend.services.supabase_client import get_service_client

logger = logging.getLogger(__name__)


async def upload_file(
    bucket: str | None = None,
    path: str = "",
    file_data: bytes | BytesIO | Any = b"",
    content_type: str = "application/octet-stream",
    upsert: bool = True,
) -> dict[str, Any]:
    """Upload a file to Supabase Storage.

    Args:
        bucket: Storage bucket name. Defaults to ``settings.STORAGE_BUCKET``.
        path: The object key inside the bucket.
        file_data: Raw bytes or a ``BytesIO`` buffer to upload.
        content_type: MIME type of the file.
        upsert: If ``True``, overwrite an existing object at *path*.

    Returns:
        The Supabase storage upload response dict.
    """
    bucket = bucket or settings.STORAGE_BUCKET
    client = get_service_client()

    if isinstance(file_data, BytesIO):
        file_data = file_data.getvalue()

    logger.info("Uploading file to %s/%s (%d bytes)", bucket, path, len(file_data))

    response = (
        client.storage.from_(bucket)
        .upload(path, file_data, {"contentType": content_type, "upsert": upsert})
    )
    return response  # type: ignore[no-any-return]


async def download_file(
    bucket: str | None = None,
    path: str = "",
) -> bytes:
    """Download a file from Supabase Storage.

    Args:
        bucket: Storage bucket name. Defaults to ``settings.STORAGE_BUCKET``.
        path: The object key inside the bucket.

    Returns:
        The raw file bytes.
    """
    bucket = bucket or settings.STORAGE_BUCKET
    client = get_service_client()

    logger.info("Downloading file from %s/%s", bucket, path)

    response = client.storage.from_(bucket).download(path)
    return response  # type: ignore[no-any-return]


async def delete_file(
    bucket: str | None = None,
    paths: list[str] | None = None,
) -> dict[str, Any]:
    """Delete one or more files from Supabase Storage.

    Args:
        bucket: Storage bucket name. Defaults to ``settings.STORAGE_BUCKET``.
        paths: List of object keys to delete.

    Returns:
        The Supabase storage delete response dict.
    """
    bucket = bucket or settings.STORAGE_BUCKET
    paths = paths or []
    client = get_service_client()

    logger.info("Deleting %d file(s) from %s: %s", len(paths), bucket, paths)

    response = client.storage.from_(bucket).remove(paths)
    return response  # type: ignore[no-any-return]


async def get_signed_url(
    bucket: str | None = None,
    path: str = "",
    expires_in: int = 3600,
) -> str:
    """Generate a temporary signed URL for a stored file.

    Args:
        bucket: Storage bucket name. Defaults to ``settings.STORAGE_BUCKET``.
        path: The object key inside the bucket.
        expires_in: URL validity period in seconds (default 1 hour).

    Returns:
        A signed URL string.
    """
    bucket = bucket or settings.STORAGE_BUCKET
    client = get_service_client()

    response = client.storage.from_(bucket).create_signed_url(path, expires_in)
    return response["signedURL"]  # type: ignore[no-any-return]


async def list_files(
    bucket: str | None = None,
    path: str = "",
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List files in a Supabase Storage bucket/prefix.

    Args:
        bucket: Storage bucket name. Defaults to ``settings.STORAGE_BUCKET``.
        path: Prefix to filter by.
        limit: Maximum number of results.
        offset: Offset for pagination.

    Returns:
        List of file metadata dicts.
    """
    bucket = bucket or settings.STORAGE_BUCKET
    client = get_service_client()

    response = client.storage.from_(bucket).list(path, {
        "limit": limit,
        "offset": offset,
    })
    return response  # type: ignore[no-any-return]
