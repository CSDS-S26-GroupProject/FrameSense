from __future__ import annotations

import json
from datetime import datetime, timezone
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore

from app.config import get_settings
from app.models.catalog import FirestoreSyncSummary, NormalizedCatalogProduct


def _build_credential():
    settings = get_settings()

    if settings.firebase_service_account_json:
        return credentials.Certificate(json.loads(settings.firebase_service_account_json))

    if settings.firebase_service_account_path:
        return credentials.Certificate(settings.firebase_service_account_path)

    return None


@lru_cache
def get_firebase_app():
    settings = get_settings()
    options = {}

    if settings.firestore_project_id:
        options["projectId"] = settings.firestore_project_id

    credential = _build_credential()

    if firebase_admin._apps:
        return firebase_admin.get_app()

    return firebase_admin.initialize_app(credential=credential, options=options or None)


@lru_cache
def get_firestore_client():
    get_firebase_app()
    return firestore.client()


def _serialize_catalog_product(
    product: NormalizedCatalogProduct, synced_at: datetime
) -> tuple[str, dict]:
    document_id = product.slug

    payload = {
        "id": document_id,
        "externalId": product.external_id,
        "slug": product.slug,
        "brand": product.brand,
        "name": product.name,
        "style": product.style,
        "colors": product.colors,
        "description": product.description,
        "dimensions": product.dimensions.model_dump(mode="json"),
        "fitMetadata": product.fit_metadata.model_dump(mode="json"),
        "assets": product.assets.model_dump(mode="json"),
        "offers": [offer.model_dump(mode="json") for offer in product.offers],
        "sourceVendor": product.source_vendor,
        "sourceUpdatedAt": product.source_updated_at.isoformat(),
        "syncedAt": synced_at.isoformat(),
        # Frontend-compatible top-level fields for the current app shape.
        "frameWidthMm": product.dimensions.frame_width_mm,
        "bridgeWidthMm": product.dimensions.bridge_width_mm,
        "templeLengthMm": product.dimensions.temple_length_mm,
        "recommendedShapes": product.fit_metadata.recommended_shapes,
        "thumbnailPath": str(
            product.assets.thumbnail_url or product.assets.image_url or ""
        ),
        "modelPath": str(product.assets.model_url or ""),
        "productUrl": str(product.offers[0].product_url) if product.offers else None,
        "priceUsd": product.offers[0].price_usd if product.offers else None,
        "inStock": product.offers[0].in_stock if product.offers else None,
    }

    return document_id, payload


def sync_catalog_products_to_firestore(
    vendor: str,
    products: list[NormalizedCatalogProduct],
    snapshot_path: str | None = None,
) -> FirestoreSyncSummary:
    settings = get_settings()
    db = get_firestore_client()
    batch = db.batch()
    synced_at = datetime.now(timezone.utc)
    document_ids: list[str] = []

    for product in products:
        document_id, payload = _serialize_catalog_product(product, synced_at)
        document_ids.append(document_id)
        doc_ref = db.collection(settings.firestore_catalog_collection).document(document_id)
        batch.set(doc_ref, payload, merge=True)

    batch.commit()

    return FirestoreSyncSummary(
        vendor=vendor,
        collection=settings.firestore_catalog_collection,
        product_count=len(products),
        document_ids=document_ids,
        snapshot_path=snapshot_path,
    )
