"""
Test the Warby Parker Playwright + BeautifulSoup scraper.

Usage:
    python test_warby.py                # scrape 5 products, print results (no Firestore)
    python test_warby.py --firestore    # scrape 5 products + write to Firestore
    python test_warby.py --all          # scrape ALL products (no Firestore)

Cost: 0 API calls. Just opens warbyparker.com in a headless browser.
"""

import argparse
import sys

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env.local")
load_dotenv(Path(__file__).parent / ".env")

from app.services.warby_scraper import scrape_warby_parker


def test_scrape(max_products: int | None = 5):
    print(f"Scraping Warby Parker (max {max_products or 'ALL'} products)...")
    print("Opening headless browser...\n")

    products = scrape_warby_parker(max_products=max_products)

    if not products:
        print("ERROR: No products scraped. The page structure may have changed.")
        sys.exit(1)

    print(f"Scraped {len(products)} products.\n")
    print("--- SCRAPED PRODUCTS ---")

    for i, product in enumerate(products):
        print(f"\n#{i+1}: {product.name}")
        print(f"    product_id: {product.external_id}")
        print(f"    style:      {product.style}")
        print(f"    price:      ${product.offers[0].price_usd}")
        print(f"    color:      {product.colors}")
        print(f"    url:        {product.offers[0].product_url}")
        print(f"    image:      {product.assets.image_url}")
        print(f"    slug:       {product.slug}")

    return products


def test_firestore_write(products):
    from app.services.firestore_admin import sync_catalog_products_to_firestore

    print("\n" + "=" * 60)
    print("Writing to Firestore...")

    summary = sync_catalog_products_to_firestore(
        vendor="warby_parker",
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test the Warby Parker scraper")
    parser.add_argument("--firestore", action="store_true", help="Write results to Firestore")
    parser.add_argument("--all", action="store_true", help="Scrape all products (no limit)")
    args = parser.parse_args()

    max_products = None if args.all else 5
    products = test_scrape(max_products=max_products)

    if args.firestore and products:
        test_firestore_write(products)
    elif not args.firestore:
        print("\n" + "=" * 60)
        print("DRY RUN — nothing was written to Firestore.")
        print("Run again with --firestore to write these to your database.")
