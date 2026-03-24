from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


FaceShape = Literal["oval", "round", "square", "heart", "diamond"]


class ProductDimensions(BaseModel):
    frame_width_mm: float | None = None
    bridge_width_mm: float | None = None
    temple_length_mm: float | None = None
    lens_height_mm: float | None = None


class ProductAssets(BaseModel):
    image_url: HttpUrl | None = None
    thumbnail_url: HttpUrl | None = None
    model_url: HttpUrl | None = None


class ProductOffer(BaseModel):
    vendor: str
    product_url: HttpUrl
    price_usd: float
    currency: str = "USD"
    in_stock: bool = True


class FitMetadata(BaseModel):
    recommended_shapes: list[FaceShape] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class NormalizedCatalogProduct(BaseModel):
    external_id: str
    slug: str
    brand: str
    name: str
    style: str
    colors: list[str] = Field(default_factory=list)
    description: str | None = None
    dimensions: ProductDimensions = Field(default_factory=ProductDimensions)
    fit_metadata: FitMetadata = Field(default_factory=FitMetadata)
    assets: ProductAssets = Field(default_factory=ProductAssets)
    offers: list[ProductOffer] = Field(default_factory=list)
    source_vendor: str
    source_updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class SyncSummary(BaseModel):
    vendor: str
    product_count: int
    saved_snapshot: bool
    snapshot_path: str | None = None


class SyncResponse(BaseModel):
    summary: SyncSummary
    products: list[NormalizedCatalogProduct]


class FirestoreSyncSummary(BaseModel):
    vendor: str
    collection: str
    product_count: int
    document_ids: list[str] = Field(default_factory=list)
    snapshot_path: str | None = None
