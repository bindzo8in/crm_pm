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

    await tab.click();
    await expect(heading, `Expected the ${desktopName} tab to open`).toBeVisible({
      timeout: 10_000,
    });
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

export async function setAttendanceDateRange(
  page: Page,
  startDate: string,
  endDate: string,
) {
  const filtersToggle = page.getByRole("button", {
    name: /^(Show attendance filters|Show report filters)$/,
  });
  if ((await filtersToggle.count()) > 0 && (await filtersToggle.getAttribute("aria-expanded")) !== "true") {
    await filtersToggle.click();
  }

  const rangePicker = page
    .getByText("Date range", { exact: true })
    .last()
    .locator("..")
    .getByRole("button");
  await rangePicker.click();

  const startButton = page.getByRole("button", {
    name: new RegExp(`${getAccessibleDateLabel(startDate)}$`),
  });
  const startMonth = getMonthIndex(startDate);
  const currentMonth = getMonthIndex(new Date().toISOString().slice(0, 10));
  const monthNavigation =
    startMonth < currentMonth
      ? "Go to the Previous Month"
      : "Go to the Next Month";

  for (let month = 0; month < 24 && (await startButton.count()) === 0; month += 1) {
    await page.getByRole("button", { name: monthNavigation }).click();
  }
  await expect(startButton).toHaveCount(1);
  await startButton.click();

  const endButton = page.getByRole("button", {
    name: new RegExp(`${getAccessibleDateLabel(endDate)}$`),
  });
  for (let month = 0; month < 24 && (await endButton.count()) === 0; month += 1) {
    await page.getByRole("button", { name: "Go to the Next Month" }).click();
  }
  await expect(endButton).toHaveCount(1);
  await endButton.click();
}

export async function getAttendanceDailyRecordCount(page: Page): Promise<number> {
  const dailyRecordsCard = page.getByText("Daily records", { exact: true }).locator("..");
  await expect(dailyRecordsCard).toBeVisible();
  const cardText = await dailyRecordsCard.innerText();
  const recordCount = cardText.match(/Daily records\s+([\d,]+)/i)?.[1];
  if (!recordCount) {
    throw new Error("Could not read the Daily records count from the report summary.");
  }

  return Number(recordCount.replaceAll(",", ""));
}

function getMonthIndex(date: string): number {
  const [year, month] = date.split("-").map(Number);
  return year * 12 + month;
}

function getAccessibleDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(utcDate);
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(utcDate);
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";

  return `${weekday}, ${monthName} ${day}${suffix}, ${year}`;
}
