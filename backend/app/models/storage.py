from __future__ import annotations

from pydantic import BaseModel, Field


class PresignedUploadRequest(BaseModel):
    filename: str
    content_type: str
    folder: str = "catalog"


class PresignedUploadResponse(BaseModel):
    bucket: str
    object_key: str
    upload_url: str
    public_url: str
    method: str = "PUT"
    headers: dict[str, str] = Field(default_factory=dict)
    expires_in_seconds: int


class R2StatusResponse(BaseModel):
    configured: bool
    bucket: str | None = None
    public_base_url: str | None = None
