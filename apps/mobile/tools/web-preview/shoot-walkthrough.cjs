const { chromium } = require("playwright");
const fs = require("fs");
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    permissions: ["camera"],
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 300)));

  const shot = async (name, full = false) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
    console.log("shot", name);
  };
  const click = async (text, opts = {}) => {
    const loc = page.getByText(text, { exact: true }).first();
    await loc.click({ timeout: 8000, ...opts });
  };
  const tryStep = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      console.log("STEP FAILED", name, String(e).slice(0, 200));
      await page.screenshot({ path: `${OUT}/_fail_${name}.png` }).catch(() => {});
    }
  };

  await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot("01-signin");

  await tryStep("devsignin", async () => {
    await click("Dev sign in (test builds only)");
    await page.waitForTimeout(2500);
  });
  await shot("02-scan-photo");

  await tryStep("barcode", async () => {
    for (let i = 0; i < 4; i++) {
      await click("Barcode");
      await page.waitForTimeout(5000);
      if (await page.getByText("Fit the barcode in the frame").count()) break;
    }
    await shot("03-scan-barcode");
    await click("Type");
    await shot("04-scan-type");
    await click("Photo");
  });

  // Photo scan -> confirm
  await tryStep("photo", async () => {
    await page.getByLabel("Take photo").click({ timeout: 8000 });
    await page.waitForTimeout(3500);
    await shot("05-confirm");
  });

  // Confirm -> answer
  await tryStep("answer", async () => {
    await click("Show what it sold for");
    await page.waitForTimeout(2500);
    await shot("06-answer-waiting");
    const body = await page.locator("body").innerText();
    const m = body.match(/MEDIAN SOLD\s*\n?\s*\$([0-9.]+)/i) || body.match(/\$([0-9]+\.[0-9]{2})/);
    const median = m ? parseFloat(m[1]) : 40;
    console.log("median", median);
    const keep = median * (1 - 0.136) - 0.4 - 7;
    const tag = page.getByLabel("Price on the tag");
    const set = async (v) => {
      await tag.click();
      await tag.fill(String(v));
      await page.waitForTimeout(600);
    };
    await set(Math.max(1, Math.floor(keep - 20)));
    await shot("07-answer-buy");
    await page.screenshot({ path: `${OUT}/07b-answer-buy-full.png`, fullPage: true });
    await set((keep - 3).toFixed(2));
    await shot("08-answer-close");
    await set(Math.ceil(keep + 5));
    await shot("09-answer-pass");
  });

  // Thin data
  await tryStep("thin", async () => {
    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await click("Type");
    await page.getByLabel("Item words").fill("thin rare widget");
    await click("Look it up");
    await page.waitForTimeout(2500);
    await click("Show what it sold for");
    await page.waitForTimeout(2500);
    await shot("10-answer-notenough");
  });

  await tryStep("history", async () => {
    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await click("History");
    await page.waitForTimeout(1500);
    await shot("11-history");
  });

  await tryStep("settings", async () => {
    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await click("Settings");
    await page.waitForTimeout(1200);
    await shot("12-settings");
    await page.screenshot({ path: `${OUT}/12b-settings-full.png`, fullPage: true });
  });

  await tryStep("paywall", async () => {
    await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.getByLabel("Scans left").click();
    await page.waitForTimeout(1200);
    await shot("13-paywall");
    await page.screenshot({ path: `${OUT}/13b-paywall-full.png`, fullPage: true });
  });

  console.log("ERRORS", JSON.stringify(errors.slice(0, 8), null, 1));
  await browser.close();
})();
