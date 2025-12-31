from playwright.sync_api import sync_playwright, expect

def test_plants_load(page):
    # Capture console messages
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    # Navigate to the app
    page.goto("http://localhost:2000")

    # Wait for the plant table to be populated
    # We look for ANY button created in the loop.
    # Or just wait a bit to see what happens in console.
    try:
        page.wait_for_selector("button:has-text('Arrosage')", timeout=5000)
        print("Arrosage button found!")
    except Exception as e:
        print(f"Wait failed: {e}")

    # Take a screenshot
    page.screenshot(path="verification/console_debug.png")
    print("Screenshot taken")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            test_plants_load(page)
        except Exception as e:
            print(f"Test script error: {e}")
        finally:
            browser.close()
