import { chromium, type Page } from "playwright";

const SITE = process.env.SITE_URL || "https://ai4smbhub.com";
const SESSIONS = parseInt(process.env.SESSIONS || "5", 10);

const BUSINESS_TYPES = [
  "cafe", "restaurant", "retail", "salon", "fitness",
  "bakery", "bar", "clinic", "agency", "tutoring", "cleaning", "photography",
];

const GOALS = [
  "Get more customers",
  "Promote a sale or event",
  "Bring back past customers",
  "Launch something new",
  "Not sure — surprise me",
];

const BUDGETS = ["Any budget", "Just this once (<$100)", "A few hundred/mo", "$500+/mo"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDelay(min = 1000, max = 4000): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

async function runCampaignFlow(page: Page) {
  console.log("  → Campaign generator flow");
  await page.goto(`${SITE}/generate`, { waitUntil: "networkidle" });
  await randomDelay(2000, 5000);

  // Pick a business type button
  const bizButtons = page.locator("button").filter({ hasText: new RegExp(BUSINESS_TYPES.join("|"), "i") });
  const count = await bizButtons.count();
  if (count > 0) {
    const idx = Math.floor(Math.random() * count);
    await bizButtons.nth(idx).click();
    console.log("    Picked business type");
    await randomDelay(1000, 3000);
  }

  // Pick a goal
  const goalButtons = page.locator("button").filter({ hasText: new RegExp(GOALS.map(g => g.slice(0, 15)).join("|"), "i") });
  const goalCount = await goalButtons.count();
  if (goalCount > 0) {
    const idx = Math.floor(Math.random() * goalCount);
    await goalButtons.nth(idx).click();
    console.log("    Picked goal");
    await randomDelay(1000, 2000);
  }

  // Pick budget
  const budgetButtons = page.locator("button").filter({ hasText: new RegExp(BUDGETS.map(b => b.slice(0, 10)).join("|"), "i") });
  const budgetCount = await budgetButtons.count();
  if (budgetCount > 0) {
    await budgetButtons.nth(Math.floor(Math.random() * budgetCount)).click();
    console.log("    Picked budget");
    await randomDelay(500, 1500);
  }

  // Submit
  const createBtn = page.locator("button").filter({ hasText: /create|生成/i });
  if (await createBtn.count() > 0) {
    await createBtn.first().click();
    console.log("    Submitted — waiting for AI response...");
    await page.waitForSelector("text=/strategy|策略|Your Campaign/i", { timeout: 60000 }).catch(() => {});
    await randomDelay(3000, 8000);
    console.log("    Campaign generated ✓");
  }
}

async function runSegmentFlow(page: Page) {
  console.log("  → Segmentation flow (benchmark)");
  await page.goto(`${SITE}/segment`, { waitUntil: "networkidle" });
  await randomDelay(2000, 4000);

  // Pick benchmark mode
  const benchmarkBtn = page.locator("button").filter({ hasText: /benchmark|industry|行业/i });
  if (await benchmarkBtn.count() > 0) {
    await benchmarkBtn.first().click();
    await randomDelay(1500, 3000);
    console.log("    Selected benchmark mode");
  }

  // Pick business type
  const bizButtons = page.locator("button").filter({ hasText: new RegExp(BUSINESS_TYPES.join("|"), "i") });
  const count = await bizButtons.count();
  if (count > 0) {
    await bizButtons.nth(Math.floor(Math.random() * count)).click();
    console.log("    Picked business type");
    await randomDelay(1000, 2000);
  }

  // Submit
  const analyzeBtn = page.locator("button").filter({ hasText: /analyze|start|生成|开始/i });
  if (await analyzeBtn.count() > 0) {
    await analyzeBtn.first().click();
    console.log("    Submitted — waiting for AI response...");
    await page.waitForSelector("text=/segment|customer|客户/i", { timeout: 60000 }).catch(() => {});
    await randomDelay(3000, 8000);
    console.log("    Segments generated ✓");
  }
}

async function main() {
  console.log(`\nSimulating ${SESSIONS} sessions on ${SITE}\n`);

  for (let i = 0; i < SESSIONS; i++) {
    console.log(`\n--- Session ${i + 1}/${SESSIONS} ---`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: pick([1280, 1440, 1920]), height: pick([720, 900, 1080]) },
      locale: pick(["en-US", "en-US", "en-US", "zh-CN"]),
      userAgent: pick([
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ]),
    });

    const page = await context.newPage();

    try {
      // Visit homepage first
      await page.goto(SITE, { waitUntil: "networkidle" });
      console.log("  Visited homepage");
      await randomDelay(2000, 6000);

      // Randomly pick a flow
      if (Math.random() < 0.6) {
        await runCampaignFlow(page);
      } else {
        await runSegmentFlow(page);
      }
    } catch (err) {
      console.log(`  Error: ${err instanceof Error ? err.message : err}`);
    }

    await browser.close();
    console.log("  Session closed");

    // Random pause between sessions
    if (i < SESSIONS - 1) {
      const pause = 5000 + Math.random() * 15000;
      console.log(`  Waiting ${Math.round(pause / 1000)}s before next session...`);
      await new Promise((r) => setTimeout(r, pause));
    }
  }

  console.log("\n✓ All sessions complete\n");
}

main().catch(console.error);
