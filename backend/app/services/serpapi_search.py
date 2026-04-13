from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from serpapi import GoogleSearch

from app.config import get_settings
from app.models.catalog import (
    NormalizedCatalogProduct,
    ProductAssets,
    ProductOffer,
)

logger = logging.getLogger(__name__)

# Brands we search for via SerpAPI Google Shopping.
SERPAPI_BRANDS = ["Oakley", "Ray-Ban", "Prada", "Tom Ford"]

# Frame styles that match keys in frame_style_mappings.json.
FRAME_STYLES = [
    "aviator",
    "round",
    "rectangle",
    "wayfarer",
    "cat_eye",
    "browline",
    "square",
    "oval",
    "geometric",
]

# Seconds to wait between SerpAPI requests to stay within rate limits.
REQUEST_DELAY_SECONDS = 1.5


def _slugify(parts: list[str]) -> str:
    return "-".join(
        "".join(ch.lower() if ch.isalnum() else "-" for ch in part).strip("-")
        for part in parts
        if part
    )


def _search_google_shopping(query: str, api_key: str) -> list[dict]:
    """Run a single Google Shopping search via SerpAPI and return the
    shopping_results list.  Returns an empty list on any error so one
    failed query doesn't break the whole pipeline.
    """
    params = {
        "engine": "google_shopping",
        "q": query,
        "api_key": api_key,
        "hl": "en",
        "gl": "us",
        "num": 10,
    }

    try:
        search = GoogleSearch(params)
        results = search.get_dict()

        if "error" in results:
            logger.warning("SerpAPI error for query '%s': %s", query, results["error"])
            return []

        return results.get("shopping_results", [])
    except Exception:
        logger.exception("SerpAPI request failed for query '%s'", query)
        return []


def _normalize_shopping_result(
    item: dict,
    brand: str,
    style: str,
) -> NormalizedCatalogProduct | None:
    """Convert a single SerpAPI shopping result into a NormalizedCatalogProduct.
    Returns None if the result is missing required fields.
    """
    title = item.get("title")
    link = item.get("link") or item.get("product_link")
    price = item.get("extracted_price")

    if not title or not link:
        return None

    # Build a unique ID from the position and title.
    product_id = item.get("product_id") or _slugify([brand, title])

    return NormalizedCatalogProduct(
        external_id=product_id,
        slug=_slugify([brand, title, product_id[:8]]),
        brand=brand,
        name=title,
        style=style,
        description=item.get("snippet"),
        assets=ProductAssets(
            image_url=item.get("thumbnail"),
        ),
        offers=[
            ProductOffer(
                vendor=item.get("source", "google_shopping"),
                product_url=link,
                price_usd=price if price else 0.0,
                currency="USD",
                in_stock=True,
            )
        ],
        source_vendor="serpapi",
        source_updated_at=datetime.now(timezone.utc),
    )


def search_brand_catalog(
    brand: str,
    styles: list[str] | None = None,
) -> list[NormalizedCatalogProduct]:
    """Search Google Shopping for a single brand across all frame styles.

    Args:
        brand:  e.g. "Oakley", "Ray-Ban"
        styles: frame styles to search for. Defaults to all FRAME_STYLES.

    Returns a list of NormalizedCatalogProduct ready to sync to Firestore.
    """
    settings = get_settings()
    if not settings.serpapi_api_key:
        raise RuntimeError("SERPAPI_API_KEY is not set in environment")

    styles = styles or FRAME_STYLES
    products: list[NormalizedCatalogProduct] = []
    seen_ids: set[str] = set()

    for style in styles:
        # e.g. "Ray-Ban aviator prescription eyeglasses"
        query = f"{brand} {style.replace('_', ' ')} prescription eyeglasses"
        logger.info("SerpAPI query: '%s'", query)

        results = _search_google_shopping(query, settings.serpapi_api_key)

        for item in results:
            product = _normalize_shopping_result(item, brand, style)
            if product and product.external_id not in seen_ids:
                seen_ids.add(product.external_id)
                products.append(product)

        # Rate-limit between queries.
        time.sleep(REQUEST_DELAY_SECONDS)

    logger.info("Fetched %d products for brand '%s'", len(products), brand)
    return products


def search_all_brands(
    brands: list[str] | None = None,
    styles: list[str] | None = None,
) -> dict[str, list[NormalizedCatalogProduct]]:
    """Search Google Shopping for all configured brands.

    Returns a dict mapping brand name to its list of products.
    """
    brands = brands or SERPAPI_BRANDS

    results: dict[str, list[NormalizedCatalogProduct]] = {}
    for brand in brands:
        results[brand] = search_brand_catalog(brand, styles=styles)

    return results
