from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from app.models.catalog import (
    FitMetadata,
    NormalizedCatalogProduct,
    ProductAssets,
    ProductDimensions,
    ProductOffer,
    SyncResponse,
    SyncSummary,
)


BASE_DIR = Path(__file__).resolve().parents[2]
VENDOR_DATA_DIR = BASE_DIR / "vendors"
SNAPSHOT_DIR = BASE_DIR / "data" / "catalog_snapshots"


class UnsupportedVendorError(ValueError):
    pass


def list_supported_vendors() -> list[str]:
    return ["mock_vendor"]


def _load_mock_vendor_payload() -> list[dict]:
    payload_path = VENDOR_DATA_DIR / "mock_vendor_catalog.json"
    with payload_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _slugify(parts: list[str]) -> str:
    return "-".join(
        "".join(ch.lower() if ch.isalnum() else "-" for ch in part).strip("-")
        for part in parts
        if part
    )


def _normalize_mock_vendor_product(raw: dict) -> NormalizedCatalogProduct:
    price = float(raw["pricing"]["listPriceUsd"])
    colors = raw.get("colors", [])

    return NormalizedCatalogProduct(
        external_id=raw["sku"],
        slug=_slugify([raw["brand"], raw["name"], raw["sku"]]),
        brand=raw["brand"],
        name=raw["name"],
        style=raw["style"],
        colors=colors,
        description=raw.get("description"),
        dimensions=ProductDimensions(
            frame_width_mm=raw.get("dimensionsMm", {}).get("frameWidth"),
            bridge_width_mm=raw.get("dimensionsMm", {}).get("bridgeWidth"),
            temple_length_mm=raw.get("dimensionsMm", {}).get("templeLength"),
            lens_height_mm=raw.get("dimensionsMm", {}).get("lensHeight"),
        ),
        fit_metadata=FitMetadata(
            recommended_shapes=raw.get("recommendedShapes", []),
            tags=raw.get("tags", []),
        ),
        assets=ProductAssets(
            image_url=raw.get("media", {}).get("heroImageUrl"),
            thumbnail_url=raw.get("media", {}).get("thumbnailUrl"),
            model_url=raw.get("media", {}).get("modelUrl"),
        ),
        offers=[
            ProductOffer(
                vendor="mock_vendor",
                product_url=raw["productUrl"],
                price_usd=price,
                currency="USD",
                in_stock=raw.get("availability", "in_stock") == "in_stock",
            )
        ],
        source_vendor="mock_vendor",
        source_updated_at=datetime.now(timezone.utc),
    )


def _normalize_vendor_catalog(vendor: str, payload: list[dict]) -> list[NormalizedCatalogProduct]:
    if vendor != "mock_vendor":
        raise UnsupportedVendorError(f"Unsupported vendor: {vendor}")

    return [_normalize_mock_vendor_product(item) for item in payload]


def _save_snapshot(vendor: str, products: list[NormalizedCatalogProduct]) -> str:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_path = SNAPSHOT_DIR / f"{vendor}.json"
    serialized = [product.model_dump(mode="json") for product in products]
    snapshot_path.write_text(json.dumps(serialized, indent=2), encoding="utf-8")
    return str(snapshot_path.relative_to(BASE_DIR))


def sync_vendor_catalog(vendor: str, save_snapshot: bool = True) -> SyncResponse:
    if vendor != "mock_vendor":
        raise UnsupportedVendorError(f"Unsupported vendor: {vendor}")

    payload = _load_mock_vendor_payload()
    products = _normalize_vendor_catalog(vendor, payload)

    snapshot_path = _save_snapshot(vendor, products) if save_snapshot else None

    return SyncResponse(
        summary=SyncSummary(
            vendor=vendor,
            product_count=len(products),
            saved_snapshot=save_snapshot,
            snapshot_path=snapshot_path,
        ),
        products=products,
    )
