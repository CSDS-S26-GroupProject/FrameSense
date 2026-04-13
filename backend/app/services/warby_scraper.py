from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from app.models.catalog import (
    NormalizedCatalogProduct,
    ProductAssets,
    ProductOffer,
)

logger = logging.getLogger(__name__)

WARBY_BASE_URL = "https://www.warbyparker.com"
EYEGLASSES_URL = f"{WARBY_BASE_URL}/eyeglasses"


def _slugify(parts: list[str]) -> str:
    return "-".join(
        "".join(ch.lower() if ch.isalnum() else "-" for ch in part).strip("-")
        for part in parts
        if part
    )


def _extract_best_image(img_tag) -> str | None:
    """Extract the best-quality image URL from an <img> tag's srcset."""
    srcset = img_tag.get("srcset", "")
    if not srcset:
        return img_tag.get("src")

    # srcset looks like: "url1 32w, url2 640w, url3 1080w"
    # Pick the largest width variant.
    best_url = None
    best_width = 0
    for entry in srcset.split(","):
        entry = entry.strip()
        parts = entry.rsplit(" ", 1)
        if len(parts) == 2:
            url, width_str = parts
            width_match = re.match(r"(\d+)w", width_str)
            if width_match:
                width = int(width_match.group(1))
                if width > best_width and width <= 1200:
                    best_width = width
                    best_url = url.strip()

    return best_url


def _parse_price(price_text: str) -> float:
    """Parse '$95' or '$145' into a float."""
    cleaned = re.sub(r"[^\d.]", "", price_text)
    return float(cleaned) if cleaned else 0.0


def _guess_frame_style(frame_name: str, product_id: str) -> str:
    """Guess frame style from the frame name and product ID.

    Warby Parker doesn't label frame styles on the listing page,
    so we use a keyword heuristic. This can be refined later or
    overridden manually.
    """
    combined = f"{frame_name} {product_id}".lower()

    style_keywords = {
        "aviator": ["aviator"],
        "round": ["round", "circle"],
        "rectangle": ["rectangle", "rectangular"],
        "square": ["square"],
        "cat_eye": ["cat-eye", "cat eye", "cateye"],
        "browline": ["browline", "brow-line"],
        "oval": ["oval"],
        "wayfarer": ["wayfarer"],
        "geometric": ["geometric", "hexagon", "octagon"],
    }

    for style, keywords in style_keywords.items():
        for keyword in keywords:
            if keyword in combined:
                return style

    # Default — most Warby Parker frames are rectangle-ish.
    return "rectangle"


def scrape_warby_parker(max_products: int | None = None) -> list[NormalizedCatalogProduct]:
    """Scrape Warby Parker's eyeglasses listing page.

    Args:
        max_products: Optional cap on how many products to return.

    Returns a list of NormalizedCatalogProduct ready for Firestore sync.
    """
    logger.info("Starting Warby Parker scrape...")

    with sync_playwright() as p:
        # headless=False avoids bot detection — Warby Parker blocks headless browsers.
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        page.goto(EYEGLASSES_URL, timeout=30000)

        # Give the page time to fully render (JS-heavy React app).
        page.wait_for_timeout(5000)

        # Scroll to load more products (Warby Parker lazy-loads).
        for _ in range(5):
            page.evaluate("window.scrollBy(0, 2000)")
            page.wait_for_timeout(1500)

        html = page.content()
        browser.close()

    logger.info("Page loaded, parsing HTML with BeautifulSoup...")
    soup = BeautifulSoup(html, "lxml")

    # Each product card is a div with a data-product-id attribute.
    product_wrappers = soup.find_all(attrs={"data-product-id": True})
    logger.info("Found %d product cards on the page", len(product_wrappers))

    products: list[NormalizedCatalogProduct] = []
    seen_ids: set[str] = set()

    for wrapper in product_wrappers:
        product_id = wrapper.get("data-product-id", "")
        if not product_id or product_id in seen_ids:
            continue
        seen_ids.add(product_id)

        # --- Name ---
        name_link = wrapper.find(attrs={"data-testid": "frames-lockup-link-name"})
        if not name_link:
            continue
        h2 = name_link.find("h2")
        frame_name = h2.get_text(strip=True) if h2 else "Unknown"

        # --- URL + color ---
        href = name_link.get("href", "")
        product_url = f"{WARBY_BASE_URL}{href}"
        # href = /eyeglasses/elias/laguna-crystal-matte?w=medium
        path_parts = href.split("?")[0].strip("/").split("/")
        color = path_parts[-1].replace("-", " ").title() if len(path_parts) >= 3 else ""

        # --- Width ---
        width_param = ""
        if "w=" in href:
            width_param = href.split("w=")[-1]

        # --- Price ---
        price_wrapper = wrapper.find(class_=re.compile(r"priceTagWrapper"))
        price = 95.0  # Warby Parker default starting price
        if price_wrapper:
            price_div = price_wrapper.find("div")
            if price_div:
                price = _parse_price(price_div.get_text(strip=True))

        # --- Image ---
        image_link = wrapper.find(attrs={"data-testid": "frames-lockup-link-image"})
        image_url = None
        if image_link:
            img_tag = image_link.find("img")
            if img_tag:
                image_url = _extract_best_image(img_tag)

        # --- Style ---
        style = _guess_frame_style(frame_name, product_id)

        product = NormalizedCatalogProduct(
            external_id=product_id,
            slug=_slugify(["warby-parker", frame_name, color[:20], product_id[:8]]),
            brand="Warby Parker",
            name=f"{frame_name} - {color}" if color else frame_name,
            style=style,
            colors=[color] if color else [],
            assets=ProductAssets(
                image_url=image_url,
            ),
            offers=[
                ProductOffer(
                    vendor="warbyparker.com",
                    product_url=product_url,
                    price_usd=price,
                    currency="USD",
                    in_stock=True,
                )
            ],
            source_vendor="warby_parker_playwright",
            source_updated_at=datetime.now(timezone.utc),
        )

        products.append(product)

        if max_products and len(products) >= max_products:
            break

    logger.info("Scraped %d unique products from Warby Parker", len(products))
    return products
