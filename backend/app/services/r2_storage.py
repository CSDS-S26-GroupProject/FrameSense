from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import boto3
from botocore.client import Config

from app.config import get_settings
from app.models.storage import (
    PresignedUploadRequest,
    PresignedUploadResponse,
    R2StatusResponse,
)


class R2ConfigurationError(ValueError):
    pass


def _sanitize_path_part(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() or ch in ("-", "_", ".") else "-" for ch in value)


def _get_r2_endpoint_url() -> str:
    settings = get_settings()

    if not settings.r2_account_id:
        raise R2ConfigurationError("R2_ACCOUNT_ID is not configured.")

    return f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"


def _get_s3_client():
    settings = get_settings()

    missing = [
        key
        for key, value in {
            "R2_ACCOUNT_ID": settings.r2_account_id,
            "R2_ACCESS_KEY_ID": settings.r2_access_key_id,
            "R2_SECRET_ACCESS_KEY": settings.r2_secret_access_key,
            "R2_BUCKET_NAME": settings.r2_bucket_name,
            "R2_PUBLIC_BASE_URL": settings.r2_public_base_url,
        }.items()
        if not value
    ]

    if missing:
        raise R2ConfigurationError(
            f"Missing required R2 configuration: {', '.join(missing)}"
        )

    return boto3.client(
        "s3",
        endpoint_url=_get_r2_endpoint_url(),
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def get_r2_status() -> R2StatusResponse:
    settings = get_settings()
    configured = all(
        [
            settings.r2_account_id,
            settings.r2_access_key_id,
            settings.r2_secret_access_key,
            settings.r2_bucket_name,
            settings.r2_public_base_url,
        ]
    )

    return R2StatusResponse(
        configured=configured,
        bucket=settings.r2_bucket_name,
        public_base_url=settings.r2_public_base_url,
    )


def _build_object_key(folder: str, filename: str) -> str:
    safe_folder = _sanitize_path_part(folder).strip("-") or "catalog"
    extension = Path(filename).suffix.lower()
    return f"{safe_folder}/{uuid4().hex}{extension}"


def create_presigned_upload(
    request: PresignedUploadRequest,
) -> PresignedUploadResponse:
    settings = get_settings()
    client = _get_s3_client()
    object_key = _build_object_key(request.folder, request.filename)
    expires_in = settings.r2_signed_url_ttl_seconds

    upload_url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.r2_bucket_name,
            "Key": object_key,
            "ContentType": request.content_type,
        },
        ExpiresIn=expires_in,
    )

    public_base_url = settings.r2_public_base_url.rstrip("/")
    public_url = f"{public_base_url}/{object_key}"

    return PresignedUploadResponse(
        bucket=settings.r2_bucket_name or "",
        object_key=object_key,
        upload_url=upload_url,
        public_url=public_url,
        headers={"Content-Type": request.content_type},
        expires_in_seconds=expires_in,
    )
