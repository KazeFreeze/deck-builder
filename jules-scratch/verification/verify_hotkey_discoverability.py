
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # --- 1. Verify Multiple Choice Page ---
        mc_deck_path = "theology/multiplechoice/the-trinity.json"
        mc_deck_title = "The Trinity"
        mc_url = f"http://localhost:3000/study.html?decks={mc_deck_path}&deckTitles=%5B%22{mc_deck_title}%22%5D"

        await page.goto(mc_url)
        await page.wait_for_selector('.choice')

        # Screenshot of the new hotkey indicators and adjusted debossing
        await page.screenshot(path="jules-scratch/verification/01_hotkey_badges.png")

        # --- 2. Verify Flashcard Page ---
        fc_deck_path = "general_chemistry/flashcards/atomic-structure.json"
        fc_deck_title = "Atomic Structure"
        fc_url = f"http://localhost:3000/study.html?decks={fc_deck_path}&deckTitles=%5B%22{fc_deck_title}%22%5D"

        await page.goto(fc_url)
        await page.wait_for_selector('.flashcard')

        # Screenshot of the new spacebar indicator on the flashcard
        await page.screenshot(path="jules-scratch/verification/02_flashcard_space_indicator.png")

        await browser.close()

asyncio.run(main())
