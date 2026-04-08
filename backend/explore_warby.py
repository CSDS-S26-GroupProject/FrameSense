"""
Exploration script — uses Playwright to load Warby Parker's eyeglasses page
and dump the HTML structure so we know what to parse.

Usage:
    python explore_warby.py

No API calls, no Firestore writes. Just opens the page and saves the HTML.
"""

from playwright.sync_api import sync_playwright


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headless=False so you can watch
        page = browser.new_page()

        print("Loading Warby Parker eyeglasses page...")
        page.goto("https://www.warbyparker.com/eyeglasses", timeout=30000)

        # Wait for product cards to render
        print("Waiting for product content to load...")
        page.wait_for_timeout(5000)

        # Scroll down to trigger any lazy-loaded content
        page.evaluate("window.scrollBy(0, 2000)")
        page.wait_for_timeout(2000)

        # Save the full rendered HTML for inspection
        html = page.content()
        with open("warby_debug.html", "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Saved full HTML to warby_debug.html ({len(html)} chars)")

        # Try to find product-related elements and print what we see
        print("\n--- Looking for product elements ---")

        # Try common patterns
        selectors_to_try = [
            "a[href*='/eyeglasses/']",
            "[data-testid*='product']",
            "[class*='product']",
            "[class*='Product']",
            "[class*='frame']",
            "[class*='Frame']",
            "[class*='card']",
            "[class*='Card']",
            "article",
        ]

        for selector in selectors_to_try:
            elements = page.query_selector_all(selector)
            if elements:
                print(f"\n'{selector}' → found {len(elements)} elements")
                # Print first element's outer HTML (truncated)
                first_html = elements[0].evaluate("el => el.outerHTML")
                preview = first_html[:500]
                print(f"  First element preview:\n  {preview}")

        # Also check for any JSON data embedded in the page
        print("\n--- Looking for embedded JSON data ---")
        scripts = page.query_selector_all("script[type='application/ld+json']")
        if scripts:
            for i, script in enumerate(scripts):
                content = script.inner_text()
                print(f"\nJSON-LD #{i+1}: {content[:300]}")
        else:
            print("No JSON-LD scripts found.")

        # Check for __NEXT_DATA__ (Next.js apps embed data here)
        next_data = page.query_selector("script#__NEXT_DATA__")
        if next_data:
            content = next_data.inner_text()
            print(f"\n__NEXT_DATA__ found! ({len(content)} chars)")
            print(f"Preview: {content[:500]}")
        else:
            print("No __NEXT_DATA__ found.")

        browser.close()
        print("\nDone! Check warby_debug.html for the full page source.")


if __name__ == "__main__":
    main()
