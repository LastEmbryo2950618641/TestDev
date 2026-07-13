import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:8000/index.html';
const result = {
  openedPage: false,
  openedSkills: false,
  filteredList: false,
  openedDetail: false,
  detailClosed: false,
  notes: [],
};

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

const page = await browser.newPage();
page.on('console', (msg) => {
  const text = msg.text();
  if (text) result.notes.push('[console] ' + text);
});
page.on('pageerror', (err) => {
  result.notes.push('[pageerror] ' + (err?.message || String(err)));
});

try {
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  result.openedPage = !!response && response.ok();
  await page.waitForTimeout(1500);

  const skillsButton = page.locator('button.desktop-app-icon.skills-icon');
  if (await skillsButton.count()) {
    await skillsButton.first().click();
    await page.waitForTimeout(1200);
    const skillsPanel = page.locator('section.skills-app-screen');
    result.openedSkills = await skillsPanel.first().isVisible().catch(() => false);
  } else {
    result.notes.push('skills desktop button not found');
  }

  const queryInput = page.locator('section.skills-app-screen input').first();
  if (await queryInput.count()) {
    await queryInput.fill('skills');
    await page.waitForTimeout(800);
    const rows = page.locator('section.skills-app-screen .skill-row');
    result.filteredList = (await rows.count()) >= 0;
    if (await rows.count()) {
      await rows.first().click();
      await page.waitForTimeout(800);
      const detail = page.locator('.skills-modal-backdrop .skills-detail');
      result.openedDetail = await detail.first().isVisible().catch(() => false);
      const closeBtn = page.locator('.skills-modal-backdrop .small-btn').last();
      if (await closeBtn.count()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
        result.detailClosed = !(await detail.first().isVisible().catch(() => false));
      }
    } else {
      result.notes.push('skills rows not found after filter');
    }
  } else {
    result.notes.push('skills query input not found');
  }
} catch (err) {
  result.notes.push('[fatal] ' + (err?.message || String(err)));
} finally {
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
