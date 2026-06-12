import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function extractLocs(xml: string): string[] {
  const locRegex = /<loc>([^<]+)<\/loc>/g;
  const matches = [...xml.matchAll(locRegex)];
  return matches.map((match) => match[1].trim());
}

function normalizePathname(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

function getRoutesFromSitemap(): string[] {
  const distRoots = [join(process.cwd(), 'dist'), join(process.cwd(), 'dist', 'client')];
  const distDir = distRoots.find((root) => existsSync(join(root, 'sitemap-index.xml')));

  if (!distDir) {
    throw new Error(
      `Expected sitemap index in ${distRoots.join(' or ')}. Run via the Playwright webServer (pnpm a11y) so build output exists.`
    );
  }

  const sitemapIndexPath = join(distDir, 'sitemap-index.xml');
  const indexXml = readFileSync(sitemapIndexPath, 'utf8');
  const sitemapUrls = extractLocs(indexXml);
  const routeSet = new Set<string>();

  for (const sitemapUrl of sitemapUrls) {
    const sitemapPathname = new URL(sitemapUrl).pathname.replace(/^\/+/, '');
    const sitemapFilePath = join(distDir, sitemapPathname);

    if (!existsSync(sitemapFilePath)) {
      continue;
    }

    const sitemapXml = readFileSync(sitemapFilePath, 'utf8');
    const pageUrls = extractLocs(sitemapXml);

    for (const pageUrl of pageUrls) {
      const routePath = normalizePathname(new URL(pageUrl).pathname);
      routeSet.add(routePath);
    }
  }

  return [...routeSet];
}

const routes = getRoutesFromSitemap();

for (const path of routes) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    // Readable failure output: lists failing rule ids + node counts.
    expect(violations.map((v) => `${v.id} (${v.nodes.length} node(s))`)).toEqual([]);
  });
}
