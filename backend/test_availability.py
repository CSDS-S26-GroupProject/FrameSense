"""
Minimal test for the availability pipeline.

Usage:
    python test_availability.py              # search only, print results (1 API call)
    python test_availability.py --firestore  # search + write to Firestore (1 API call)
    python test_availability.py --mappings   # sync frame_style_mappings.json to Firestore (0 API calls)

Cost: 1 SerpAPI search (out of your 250).
"""

import argparse
import json
import sys

# Load environment variables before importing app modules.
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env.local")
load_dotenv(Path(__file__).parent / ".env")


def test_serpapi_search():
    """Run a single SerpAPI query and print the raw + normalized results."""
    from app.services.serpapi_search import _search_google_shopping, _normalize_shopping_result
    from app.config import get_settings

    settings = get_settings()

    if not settings.serpapi_api_key:
        print("ERROR: SERPAPI_API_KEY is not set. Check your .env.local file.")
        sys.exit(1)

    print(f"API key loaded: {settings.serpapi_api_key[:8]}...{settings.serpapi_api_key[-4:]}")
    print()

    # ONE query — costs 1 search.
    query = "Oakley aviator prescription eyeglasses"
    print(f"Searching Google Shopping for: '{query}'")
    print("=" * 60)

    raw_results = _search_google_shopping(query, settings.serpapi_api_key)

    if not raw_results:
        print("No results returned. Check your API key and internet connection.")
        sys.exit(1)

    print(f"Got {len(raw_results)} raw results from SerpAPI.\n")

    # Show first 2 raw results so you can see what SerpAPI returns.
    print("--- RAW SERPAPI RESULTS (first 2) ---")
    for i, item in enumerate(raw_results[:2]):
        print(f"\nResult #{i+1}:")
        print(json.dumps(item, indent=2, default=str))

    print("\n" + "=" * 60)

    # Normalize into our catalog format — cap at 5 products.
    products = []
    for item in raw_results[:5]:
        product = _normalize_shopping_result(item, brand="Oakley", style="aviator")
        if product:
            products.append(product)

    print(f"\nNormalized {len(products)} products into NormalizedCatalogProduct format:\n")

    print("--- NORMALIZED PRODUCTS ---")
    for i, product in enumerate(products):
        print(f"\n#{i+1}: {product.name}")
        print(f"    brand:    {product.brand}")
        print(f"    style:    {product.style}")
        print(f"    price:    ${product.offers[0].price_usd}")
        print(f"    vendor:   {product.offers[0].vendor}")
        print(f"    url:      {product.offers[0].product_url}")
        print(f"    image:    {product.assets.image_url}")
        print(f"    slug:     {product.slug}")

    return products


def test_firestore_write(products):
    """Write the products to Firestore and print confirmation."""
    from app.services.firestore_admin import sync_catalog_products_to_firestore

    print("\n" + "=" * 60)
    print("Writing to Firestore...")

    summary = sync_catalog_products_to_firestore(
        vendor="serpapi_oakley",
        products=products,
    )

    print(f"\nFirestore sync complete!")
    print(f"  Collection: {summary.collection}")
    print(f"  Documents written: {summary.product_count}")
    print(f"  Document IDs:")
    for doc_id in summary.document_ids:
        print(f"    - {doc_id}")

    print(f"\nGo check Firebase Console:")
    print(f"  https://console.firebase.google.com/project/framesense-cwru2026/firestore")
    print(f"  Look in the '{summary.collection}' collection for the document IDs above.")


def test_mappings_sync():
    """Sync frame_style_mappings.json to Firestore (no API calls)."""
    from app.services.firestore_admin import sync_frame_style_mappings_to_firestore

    print("Syncing frame_style_mappings.json to Firestore...")
    result = sync_frame_style_mappings_to_firestore()

    print(f"\nSync complete!")
    print(f"  Collection: {result['collection']}")
    print(f"  Styles synced: {result['stylesCount']}")
    for style in result['styles']:
        print(f"    - {style}")

    print(f"\nGo check Firebase Console:")
    print(f"  https://console.firebase.google.com/project/framesense-cwru2026/firestore")
    print(f"  Look in the '{result['collection']}' collection.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test the availability pipeline")
    parser.add_argument("--firestore", action="store_true", help="Also write results to Firestore")
    parser.add_argument("--mappings", action="store_true", help="Sync frame style mappings to Firestore (no API calls)")
    args = parser.parse_args()

    if args.mappings:
        test_mappings_sync()
    else:
        products = test_serpapi_search()
        if args.firestore and products:
            test_firestore_write(products)
        elif not args.firestore:
            print("\n" + "=" * 60)
            print("DRY RUN — nothing was written to Firestore.")
            print("Run again with --firestore to write these to your database.")
