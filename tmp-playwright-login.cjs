const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const events = [];
  page.on('console', msg => { if (['error','warning'].includes(msg.type())) events.push(`[console:${msg.type()}] ${msg.text()}`); });
  page.on('pageerror', err => events.push(`[pageerror] ${err.message}`));
  await page.goto('http://127.0.0.1:8082', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', 'psi.camilafreitas@gmail.com');
  await page.fill('input[type="password"]', 'Bianco256');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  const payload = {
    url: page.url(),
    title: await page.title(),
    text: (await page.locator('body').innerText()).slice(0, 5000),
    storage: await page.evaluate(() => ({
      webUser: localStorage.getItem('ethos_web_user_v2'),
      webExpiry: localStorage.getItem('ethos_web_user_expiry_v2'),
      webCloud: localStorage.getItem('ethos_web_cloud_auth_v2'),
      legacyUser: localStorage.getItem('ethos_user')
    })),
    events,
  };
  console.log(JSON.stringify(payload, null, 2));
  await browser.close();
})();
