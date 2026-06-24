import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { extname } from 'node:path';

const neighborhoodContentDir = `${process.cwd()}/src/content/neighborhoods`;
const neighborhoodRoutes = readdirSync(neighborhoodContentDir)
  .filter((file) => extname(file) === '.mdx')
  .map((file) => file.replace(/\.mdx$/, ''))
  .sort((a, b) => a.localeCompare(b))
  .map((slug) => `/neighborhoods/${slug}`);

const routes = ['/', '/neighborhoods', ...neighborhoodRoutes];

for (const route of routes) {
  test(`images render: ${route}`, async ({ page }) => {
    await page.goto(route);
    // force lazy images to load by scrolling to the bottom
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let y = 0;
        const step = () => {
          window.scrollBy(0, window.innerHeight);
          y += window.innerHeight;
          if (y < document.body.scrollHeight) requestAnimationFrame(step);
          else resolve();
        };
        step();
      });
    });
    const imgs = page.locator('main img'); // scope to content; skips chrome/icons
    const count = await imgs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const img = imgs.nth(i);
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveJSProperty('complete', true);
      const w = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(w, `image ${i} on ${route} has naturalWidth 0`).toBeGreaterThan(0);
    }
  });
}
