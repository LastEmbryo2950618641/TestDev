import { chromium } from 'playwright';

const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
const failures = [];

await cdp.send('Network.enable');
cdp.on('Network.responseReceived', ({ response, type }) => {
  if (response.status >= 400) failures.push({ kind: 'response', status: response.status, url: response.url, type });
});
cdp.on('Network.loadingFailed', (event) => {
  failures.push({ kind: 'failed', errorText: event.errorText, type: event.type, blockedReason: event.blockedReason || '' });
});
page.on('console', (msg) => {
  if (msg.type() === 'error') failures.push({ kind: 'console-error', text: msg.text() });
});

await page.goto(`http://127.0.0.1:8000/index.html?netprobe=${Date.now()}`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(4000);
console.log(JSON.stringify({ ok: failures.length === 0, failures }, null, 2));
await browser.close();
if (failures.length) process.exit(1);
