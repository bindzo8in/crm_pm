import { expect, type Locator, type Page } from "@playwright/test";

export class AttendancePage {
  constructor(readonly page: Page) {}

  async open() {
    await this.page.goto("/attendance");
  }

  async selectTab(desktopName: string, mobileName: string, expectedHeading: RegExp) {
    const desktopTab = this.page.getByRole("button", { name: desktopName });
    const tab = (await desktopTab.isVisible())
      ? desktopTab
      : this.page.getByRole("button", { name: mobileName, exact: true });
    const heading = this.page.getByRole("heading", { name: expectedHeading });

    await expect
      .poll(
        async () => {
          await tab.click();
          return heading.isVisible();
        },
        { message: `Expected the ${desktopName} tab to open`, timeout: 10_000 },
      )
      .toBe(true);
  }

  get punchClockTab(): Locator {
    return this.page.getByRole("button", { name: "Punch Clock" });
  }

  get clockAction(): Locator {
    return this.page.locator(
      'button[aria-label="Clock in"], button[aria-label="Clock out"], button[aria-label="Retry location"], button[aria-label="Enable location and retry"]',
    ).first();
  }

  get locationStatus(): Locator {
    return this.page.getByRole("heading", { name: "Location verification" });
  }

  get locationSection(): Locator {
    return this.page.locator("section").filter({ has: this.locationStatus });
  }
}
