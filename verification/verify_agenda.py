import time
from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a large viewport to see the full agenda
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        try:
            # Navigate to the local file directly if possible, or wait for dev server
            # Since we can't easily run the dev server here, I'll try to verify via component code structure
            # but for visual verification, let's try to load the page if it's up
            page.goto("http://localhost:8080/agenda", timeout=60000)
            time.sleep(5)

            # Click "Agendar sessão" to show the dialog
            page.get_by_role("button", name="Agendar sessão").click()
            time.sleep(2)
            page.screenshot(path="verification/agenda_dialog_session.png")

            # Close and click "Outra tarefa"
            page.keyboard.press("Escape")
            time.sleep(1)
            page.get_by_role("button", name="Outra tarefa").click()
            time.sleep(2)
            page.screenshot(path="verification/agenda_dialog_task.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            # Fallback: just take a screenshot of whatever is there
            page.screenshot(path="verification/failed_verification.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
