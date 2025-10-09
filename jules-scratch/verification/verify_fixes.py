from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Go to homepage and verify initial state (Casual Mode)
        page.goto("http://localhost:3000/index.html")

        # Verify "Pre-configured Sets" is visible
        sets_section = page.locator("#sets-section-container")
        expect(sets_section).to_be_visible()

        # Verify "Microelectronics" topic exists and expand it
        microelectronics_topic = page.get_by_text("Microelectronics")
        expect(microelectronics_topic).to_be_visible()
        microelectronics_topic.click()

        # Verify a deck has the border style
        first_deck = page.locator(".deck-item").first
        expect(first_deck).to_have_class(lambda class_list: "btn-outline" in class_list)

        # 2. Switch to Pro mode and verify UI change
        page.locator("#mode-toggle").click()
        expect(sets_section).to_be_hidden()

        # 3. Switch back, select a deck, and start studying to verify bug fix
        page.locator("#mode-toggle").click() # Back to Casual
        microelectronics_topic.click() # Re-open topic

        # Select the first deck in the topic
        first_deck.click()

        # Start studying
        page.locator("#start-studying-btn").click()

        # 4. Verify the study page loads correctly
        page.wait_for_url("**/study.html**")

        # Check that the title is not an error message
        quiz_title = page.locator("#quiz-title")
        expect(quiz_title).to_have_text("Study Session")

        # Check that the study item container is not empty
        study_item = page.locator("#study-item-container > div")
        expect(study_item).to_be_visible()

        # Take screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

run()
