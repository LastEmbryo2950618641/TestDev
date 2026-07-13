import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:8000/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
const data = await page.evaluate(() => ({
  title: document.title,
  startedButtons: Array.from(document.querySelectorAll('button')).slice(0, 20).map((btn) => ({ text: btn.innerText, cls: btn.className })),
  hasSkillsIcon: !!document.querySelector('button.desktop-app-icon.skills-icon'),
  bodyText: document.body.innerText.slice(0, 1000),
}));
console.log(JSON.stringify(data, null, 2));
await browser.close();
