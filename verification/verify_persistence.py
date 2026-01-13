from playwright.sync_api import sync_playwright, expect
import time

def test_offline_persistence(page):
    # 1. Online: Load the app and wait for sync
    print("Step 1: Loading app online...")
    page.goto("http://localhost:2000")

    # Wait for rows to appear (indicating sync happened and rendered)
    page.wait_for_selector("#plantsTable button", timeout=10000)
    print("Online: Plants loaded.")

    # Wait for Service Worker to install/activate
    print("Waiting for SW activation...")
    time.sleep(3)

    # Take screenshot of online state
    page.screenshot(path="verification/step1_online.png")

    # 2. Simulate Offline:
    print("Step 2: Simulating offline mode...")
    context = page.context
    context.set_offline(True)

    # Reload the page
    print("Step 3: Reloading page while offline...")
    try:
        page.reload()
    except Exception as e:
        print(f"Reload warning (expected if SW not ready): {e}")

    # Verify plants load from cache
    try:
        page.wait_for_selector("#plantsTable button", timeout=10000)
        print("Offline: Plants loaded from cache!")
    except Exception as e:
        print(f"Offline: Failed to load plants. {e}")
        page.screenshot(path="verification/step3_offline_failed.png")
        raise e

    # Take screenshot of offline state
    page.screenshot(path="verification/step3_offline_success.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        try:
            test_offline_persistence(page)
        except Exception as e:
            print(f"Test failed: {e}")
            exit(1)
        finally:
            browser.close()
