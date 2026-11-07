const { chromium } = require("playwright");
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ["camera"] });
  const page = await ctx.newPage();
  const res = await page.request.post("http://localhost:8082/v1/auth/apple", { data: { identityToken: "dev:barcode-shot" } });
  const { token } = await res.json();
  await page.addInitScript((t) => window.localStorage.setItem("session-token", t), token);
  await page.goto("http://localhost:8082/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.getByText("Barcode", { exact: true }).first().click();
  await page.waitForTimeout(3000);
  console.log("guide label present:", await page.getByText("Fit the barcode in the frame").count());
  await page.screenshot({ path: `${OUT}/03-scan-barcode.png` });
  await browser.close();
})();
