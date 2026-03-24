from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel


BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent

# Load backend-local env first, then allow the repo root env to supplement it.
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(REPO_ROOT / ".env")


class Settings(BaseModel):
    firestore_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID") or os.getenv(
        "VITE_FIREBASE_PROJECT_ID"
    )
    firestore_catalog_collection: str = os.getenv(
        "FIRESTORE_CATALOG_COLLECTION", "glassesFrames"
    )
    firebase_service_account_path: str | None = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH"
    )
    firebase_service_account_json: str | None = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )

    r2_account_id: str | None = os.getenv("R2_ACCOUNT_ID")
    r2_access_key_id: str | None = os.getenv("R2_ACCESS_KEY_ID")
    r2_secret_access_key: str | None = os.getenv("R2_SECRET_ACCESS_KEY")
    r2_bucket_name: str | None = os.getenv("R2_BUCKET_NAME")
    r2_public_base_url: str | None = os.getenv("R2_PUBLIC_BASE_URL")
    r2_signed_url_ttl_seconds: int = int(os.getenv("R2_SIGNED_URL_TTL_SECONDS", "900"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
