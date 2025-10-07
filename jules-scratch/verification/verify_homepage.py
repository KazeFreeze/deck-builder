from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000/index.html")

        # Wait for decks to load by looking for a deck item
        page.wait_for_selector(".collapse-title")

        # Switch to pro mode
        page.locator("#mode-toggle").click()

        # Wait for pro mode to render by looking for the header
        page.wait_for_selector("h3")

        page.screenshot(path="jules-scratch/verification/verification.png")
        browser.close()

run()
