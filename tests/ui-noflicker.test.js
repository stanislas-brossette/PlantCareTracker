const puppeteer = require('puppeteer');
const app = require('../server');

let server, browser, page;

beforeAll(async () => {
  server = app.listen(4001);
  browser = await puppeteer.launch({args:['--no-sandbox']});
  page = await browser.newPage();
});

afterAll(async () => {
  await browser.close();
  server.close();
});

test('images stay populated when going online', async () => {
  await page.goto('http://localhost:4001/index.html', {waitUntil:'networkidle0'});
  const beforeEmpty = await page.evaluate(() => Array.from(document.querySelectorAll('img')).some(img => !img.getAttribute('src')));
  expect(beforeEmpty).toBe(false);

  await page.setOfflineMode(true);
  await page.setOfflineMode(false);
  await page.waitForTimeout(500); // allow online sync

  const afterEmpty = await page.evaluate(() => Array.from(document.querySelectorAll('img')).some(img => !img.getAttribute('src')));
  expect(afterEmpty).toBe(false);
});
