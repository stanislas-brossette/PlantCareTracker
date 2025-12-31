from playwright.sync_api import sync_playwright

def verify_offline_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a context where we can simulate offline
        context = browser.new_context()
        page = context.new_page()

        # 1. Load the page while online to populate cache
        print("Loading page online...")
        page.goto("http://localhost:2000/index.html")
        page.wait_for_load_state("networkidle")

        # Verify normal state
        assert page.locator("#offline-banner").is_hidden(), "Offline banner should be hidden initially"

        # 2. Go offline
        print("Going offline...")
        context.set_offline(True)
        page.evaluate("window.dispatchEvent(new Event('offline'))") # Dispatch event manually as set_offline might not trigger it immediately in all envs

        # 3. Verify Offline UI
        print("Verifying offline UI...")
        banner = page.locator("#offline-banner")
        banner.wait_for(state="visible")
        assert banner.is_visible(), "Offline banner should be visible"

        # Check buttons are disabled
        # We need to find a button to check. Assuming 'Create Plant' or one of the plant buttons exists.
        create_btn = page.locator("#create-plant")
        if create_btn.is_visible():
            # Check pointer-events: none via computed style or check if click works
            # The CSS sets pointer-events: none. Playwright's is_disabled() checks HTML disabled attribute.
            # My CSS solution uses pointer-events: none, so is_disabled() might return False unless I also added the attribute.
            # Let's check the CSS class on body
            assert "offline-mode" in page.eval_on_selector("body", "e => e.className"), "Body should have offline-mode class"

        page.screenshot(path="verification/offline_mode.png")
        print("Screenshot saved to verification/offline_mode.png")

        browser.close()

if __name__ == "__main__":
    verify_offline_mode()
