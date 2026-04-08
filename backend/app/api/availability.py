from fastapi import APIRouter, HTTPException, Query

from app.services.serpapi_search import (
    SERPAPI_BRANDS,
    search_all_brands,
    search_brand_catalog,
)
from app.services.firestore_admin import sync_catalog_products_to_firestore
from app.services.warby_scraper import scrape_warby_parker

router = APIRouter(prefix="/availability", tags=["availability"])


@router.post("/search/{brand}")
def search_brand(brand: str) -> dict:
    """Search Google Shopping for a single brand and sync results to Firestore.

    Example: POST /availability/search/Oakley
    """
    if brand not in SERPAPI_BRANDS:
        raise HTTPException(
            status_code=400,
            detail=f"Brand '{brand}' is not configured. Supported: {SERPAPI_BRANDS}",
        )

    products = search_brand_catalog(brand)

    if not products:
        return {"brand": brand, "productsFound": 0, "firestore": None}

    sync_summary = sync_catalog_products_to_firestore(
        vendor=f"serpapi_{brand.lower().replace('-', '_')}",
        products=products,
    )

    return {
        "brand": brand,
        "productsFound": len(products),
        "firestore": sync_summary.model_dump(),
    }


@router.post("/search-all")
def search_all(
    brands: list[str] | None = Query(default=None),
) -> dict:
    """Search Google Shopping for all configured brands and sync to Firestore.

    Optionally pass ?brands=Oakley&brands=Ray-Ban to limit which brands.
    Defaults to all: Oakley, Ray-Ban, Prada, Tom Ford.
    """
    target_brands = brands or SERPAPI_BRANDS

    for b in target_brands:
        if b not in SERPAPI_BRANDS:
            raise HTTPException(
                status_code=400,
                detail=f"Brand '{b}' is not configured. Supported: {SERPAPI_BRANDS}",
            )

    all_results = search_all_brands(brands=target_brands)

    summaries = {}
    for brand, products in all_results.items():
        if products:
            sync_summary = sync_catalog_products_to_firestore(
                vendor=f"serpapi_{brand.lower().replace('-', '_')}",
                products=products,
            )
            summaries[brand] = {
                "productsFound": len(products),
                "firestore": sync_summary.model_dump(),
            }
        else:
            summaries[brand] = {"productsFound": 0, "firestore": None}

    return summaries


@router.post("/scrape/warby-parker")
def scrape_warby(max_products: int | None = None, write_to_firestore: bool = True) -> dict:
    """Scrape Warby Parker's eyeglasses page using Playwright + BeautifulSoup.

    Args:
        max_products: Optional cap on products to scrape (default: all).
        write_to_firestore: Whether to sync results to Firestore (default: True).
    """
    products = scrape_warby_parker(max_products=max_products)

    if not products:
        return {"brand": "Warby Parker", "productsFound": 0, "firestore": None}

    result = {
        "brand": "Warby Parker",
        "productsFound": len(products),
    }

    if write_to_firestore:
        sync_summary = sync_catalog_products_to_firestore(
            vendor="warby_parker",
            products=products,
        )
        result["firestore"] = sync_summary.model_dump()
    else:
        result["firestore"] = None
        result["products"] = [p.model_dump(mode="json") for p in products]

    return result
