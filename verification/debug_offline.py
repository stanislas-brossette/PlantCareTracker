from playwright.sync_api import sync_playwright

def verify_offline_mode_debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Loading page online...")
        page.goto("http://localhost:2000/index.html")
        page.wait_for_load_state("networkidle")

        # Take screenshot of initial state
        page.screenshot(path="verification/debug_initial.png")

        # Check navigator.onLine status
        is_online = page.evaluate("navigator.onLine")
        print(f"navigator.onLine: {is_online}")

        # Check banner visibility
        banner = page.locator("#offline-banner")
        print(f"Banner visible: {banner.is_visible()}")

        browser.close()

if __name__ == "__main__":
    verify_offline_mode_debug()
