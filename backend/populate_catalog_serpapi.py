"""
Populate the FrameSense catalog from SerpAPI Google Shopping searches.

Default behavior is a dry run:
    python populate_catalog_serpapi.py

Write the snapshot results to Firestore only when explicitly requested:
    python populate_catalog_serpapi.py --firestore
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env.local")
load_dotenv(Path(__file__).parent / ".env")

from app.config import get_settings
from app.models.catalog import FitMetadata, NormalizedCatalogProduct
from app.services.serpapi_search import (
    REQUEST_DELAY_SECONDS,
    _normalize_shopping_result,
    _search_google_shopping,
)


SNAPSHOT_DIR = Path(__file__).parent / "data" / "catalog_snapshots"
DEFAULT_STYLES = ["rectangle", "round", "square", "cat_eye", "aviator"]


@dataclass(frozen=True)
class SiteTarget:
    name: str
    domain: str
    tier: str
    styles: tuple[str, ...] = tuple(DEFAULT_STYLES)


SITE_TARGETS = [
    SiteTarget("Lowercase", "lowercasenyc.com", "small"),
    SiteTarget("American Optical", "aoeyewear.com", "small"),
    SiteTarget("LensCrafters", "lenscrafters.com", "big"),
    SiteTarget("GlassesUSA", "glassesusa.com", "big"),
    SiteTarget("Zenni", "zennioptical.com", "big"),
    SiteTarget("EyeBuyDirect", "eyebuydirect.com", "big"),
    SiteTarget("Ray-Ban", "ray-ban.com", "big"),
    SiteTarget("Oakley", "oakley.com", "big"),
]


def _slugify(parts: list[str]) -> str:
    return "-".join(
        "".join(ch.lower() if ch.isalnum() else "-" for ch in part).strip("-")
        for part in parts
        if part
    )


def _host_matches_domain(url: str | None, domain: str) -> bool:
    if not url:
        return False

    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]

    return host == domain or host.endswith(f".{domain}")


def _build_site_query(site: SiteTarget, style: str, use_site_operator: bool) -> str:
    style_text = style.replace("_", " ")
    if use_site_operator:
        return f"site:{site.domain} {style_text} prescription eyeglasses"
    return f"{site.name} {style_text} prescription eyeglasses"


def _normalize_site_result(
    item: dict,
    site: SiteTarget,
    style: str,
) -> NormalizedCatalogProduct | None:
    product = _normalize_shopping_result(item, brand=site.name, style=style)
    if not product:
        return None

    product.slug = _slugify([site.name, style, product.name, product.external_id[:8]])
    product.source_vendor = f"serpapi_{site.domain}"
    product.fit_metadata = FitMetadata(
        recommended_shapes=product.fit_metadata.recommended_shapes,
        tags=[
            f"site:{site.domain}",
            f"brand_tier:{site.tier}",
            f"source:serpapi",
        ],
    )
    product.source_updated_at = datetime.now(timezone.utc)
    return product


def _dedupe_key(product: NormalizedCatalogProduct) -> str:
    offer_url = str(product.offers[0].product_url) if product.offers else ""
    return offer_url or product.external_id or product.slug


def collect_products(
    sites: list[SiteTarget],
    max_results_per_query: int,
    strict_domain: bool,
    use_site_operator: bool,
) -> tuple[list[NormalizedCatalogProduct], dict]:
    settings = get_settings()
    if not settings.serpapi_api_key:
        raise RuntimeError("SERPAPI_API_KEY is not set in backend/.env.local or backend/.env")

    products: list[NormalizedCatalogProduct] = []
    seen: set[str] = set()
    summary = {
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "queryCount": 0,
        "maxResultsPerQuery": max_results_per_query,
        "strictDomain": strict_domain,
        "useSiteOperator": use_site_operator,
        "sites": {},
    }

    for site in sites:
        site_summary = {
            "tier": site.tier,
            "domain": site.domain,
            "styles": {},
            "productsFound": 0,
        }

        for style in site.styles:
            query = _build_site_query(site, style, use_site_operator)
            print(f"[query] {site.name} / {style}: {query}")
            summary["queryCount"] += 1

            raw_results = _search_google_shopping(query, settings.serpapi_api_key)
            accepted = 0
            rejected_domain = 0
            rejected_duplicate = 0

            for item in raw_results[:max_results_per_query]:
                link = item.get("link") or item.get("product_link")
                if strict_domain and not _host_matches_domain(link, site.domain):
                    rejected_domain += 1
                    continue

                product = _normalize_site_result(item, site, style)
                if not product:
                    continue

                key = _dedupe_key(product)
                if key in seen:
                    rejected_duplicate += 1
                    continue

                seen.add(key)
                products.append(product)
                accepted += 1

            site_summary["styles"][style] = {
                "query": query,
                "rawResults": len(raw_results),
                "accepted": accepted,
                "rejectedDomain": rejected_domain,
                "rejectedDuplicate": rejected_duplicate,
            }
            site_summary["productsFound"] += accepted

            time.sleep(REQUEST_DELAY_SECONDS)

        summary["sites"][site.name] = site_summary

    summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
    summary["productsFound"] = len(products)
    return products, summary


def save_snapshot(products: list[NormalizedCatalogProduct], summary: dict) -> Path:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = SNAPSHOT_DIR / f"serpapi_site_catalog_{timestamp}.json"

    payload = {
        "summary": summary,
        "products": [product.model_dump(mode="json") for product in products],
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Populate FrameSense catalog entries from SerpAPI site searches."
    )
    parser.add_argument(
        "--firestore",
        action="store_true",
        help="Write products to Firestore after saving the local snapshot.",
    )
    parser.add_argument(
        "--strict-domain",
        action="store_true",
        help="Only keep results whose link host matches the configured site domain.",
    )
    parser.add_argument(
        "--site-operator",
        action="store_true",
        help="Use site:<domain> in Google Shopping queries. This can return zero results.",
    )
    parser.add_argument(
        "--max-results-per-query",
        type=int,
        default=10,
        help="Maximum SerpAPI shopping results to normalize from each query.",
    )
    parser.add_argument(
        "--sites",
        nargs="+",
        default=None,
        help="Optional site names to run, e.g. --sites Zenni Oakley.",
    )
    parser.add_argument(
        "--styles",
        nargs="+",
        default=None,
        help="Optional style override for every selected site.",
    )
    return parser.parse_args()


def select_sites(args: argparse.Namespace) -> list[SiteTarget]:
    selected = SITE_TARGETS

    if args.sites:
        requested = {name.lower() for name in args.sites}
        selected = [site for site in selected if site.name.lower() in requested]
        missing = requested - {site.name.lower() for site in selected}
        if missing:
            valid = ", ".join(site.name for site in SITE_TARGETS)
            raise ValueError(f"Unknown site(s): {', '.join(sorted(missing))}. Valid: {valid}")

    if args.styles:
        selected = [
            SiteTarget(site.name, site.domain, site.tier, tuple(args.styles))
            for site in selected
        ]

    return selected


def main() -> int:
    args = parse_args()
    sites = select_sites(args)
    query_count = sum(len(site.styles) for site in sites)

    print("FrameSense SerpAPI catalog population")
    print(f"Sites: {', '.join(f'{site.name} ({site.tier})' for site in sites)}")
    print(f"Styles per site: {', '.join(sites[0].styles) if sites else 'none'}")
    print(f"Planned SerpAPI queries: {query_count}")
    print(f"Firestore writes: {'enabled' if args.firestore else 'disabled'}")
    print()

    products, summary = collect_products(
        sites=sites,
        max_results_per_query=args.max_results_per_query,
        strict_domain=args.strict_domain,
        use_site_operator=args.site_operator,
    )
    snapshot_path = save_snapshot(products, summary)

    print()
    print(f"Snapshot saved: {snapshot_path}")
    print(f"Products accepted after dedupe: {len(products)}")

    if args.firestore:
        from app.services.firestore_admin import sync_catalog_products_to_firestore

        sync_summary = sync_catalog_products_to_firestore(
            vendor="serpapi_site_catalog",
            products=products,
            snapshot_path=str(snapshot_path.relative_to(Path(__file__).parent)),
        )
        print(f"Firestore collection: {sync_summary.collection}")
        print(f"Documents written: {sync_summary.product_count}")
    else:
        print("Dry run complete. Re-run with --firestore to write these products.")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
