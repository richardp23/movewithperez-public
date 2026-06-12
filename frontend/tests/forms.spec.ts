import { test, expect } from '@playwright/test';

const formEndpointPattern = '**://worker.example.com/**';
const alwaysPassTurnstileToken = 'test-turnstile-token';
test.setTimeout(10_000);

async function setTurnstileToken(
  page: import('@playwright/test').Page,
  tokenInputId: string,
  token: string
) {
  await page.locator(`#${tokenInputId}`).evaluate((element, value) => {
    (element as HTMLInputElement).value = value;
  }, token);
}

async function stubFormEndpoint(
  page: import('@playwright/test').Page,
  responseStatus: number,
  responseBody: Record<string, unknown>
) {
  let capturedPayload: any;
  await page.route(formEndpointPattern, async (route) => {
    const method = route.request().method();
      const url = route.request().url();
      if (!url.includes('/')) {
        await route.continue();
        return;
      }
      if (url.includes('/cdn-cgi/challenge-platform/')) {
        await route.continue();
        return;
      }
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
      return;
    }
    if (method === 'POST') {
      capturedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: responseStatus,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      });
      return;
    }
    await route.abort();
  });
  return () => capturedPayload;
}

// -- Layer 1: UI states, network stubbed (browser POST never reaches the server) --
test.describe('valuation form (UI)', () => {
  test('happy path shows success and sends the right payload', async ({ page }) => {
    await page.goto('/sellers');
    const getPayload = await stubFormEndpoint(page, 200, { ok: true });
    await page.locator('#valuation-name').fill('Jane Buyer');
    await page.locator('#valuation-email').fill('jane@example.com');
    await page.locator('#valuation-address').fill('123 Liberty Ave, Richmond Hill, NY');
    await setTurnstileToken(page, 'valuation-turnstile-token', alwaysPassTurnstileToken);
    await Promise.all([
      page.waitForRequest((request) => request.url().includes('worker.example.com')),
      page.getByRole('button', { name: 'Get my estimate' }).click(),
    ]);
    await expect(page.getByText('Thanks — your request is in')).toBeVisible();
    await expect(page.locator('#valuation-name')).toHaveCount(0); // form gone
    expect(getPayload()).toMatchObject({
      name: 'Jane Buyer',
      email: 'jane@example.com',
      address: '123 Liberty Ave, Richmond Hill, NY',
      company: '',
      intent: 'valuation',
      'cf-turnstile-response': alwaysPassTurnstileToken,
    });
  });

  test('server error surfaces an alert and keeps the form', async ({ page }) => {
    await page.goto('/sellers');
    await stubFormEndpoint(page, 500, { ok: false, error: 'Something went wrong. Please try again.' });
    await page.locator('#valuation-name').fill('Jane');
    await page.locator('#valuation-email').fill('jane@example.com');
    await page.locator('#valuation-address').fill('123 Liberty Ave');
    await setTurnstileToken(page, 'valuation-turnstile-token', alwaysPassTurnstileToken);
    await page.getByRole('button', { name: 'Get my estimate' }).click();
    await expect(page.getByRole('alert')).toContainText('Something went wrong');
    await expect(page.getByRole('button', { name: 'Get my estimate' })).toBeEnabled();
  });

  test('network failure shows the network message', async ({ page }) => {
    await page.goto('/sellers');
    await page.route(formEndpointPattern, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
        return;
      }
      await route.abort();
    });
    await page.locator('#valuation-name').fill('Jane');
    await page.locator('#valuation-email').fill('jane@example.com');
    await page.locator('#valuation-address').fill('123 Liberty Ave');
    await setTurnstileToken(page, 'valuation-turnstile-token', alwaysPassTurnstileToken);
    await page.getByRole('button', { name: 'Get my estimate' }).click();
    await expect(page.getByRole('alert')).toContainText('Network error');
  });
});

test.describe('contact form (UI)', () => {
  test('happy path shows success and sends the right payload', async ({ page }) => {
    await page.goto('/contact');
    await page.unroute(formEndpointPattern);
    const getPayload = await stubFormEndpoint(page, 200, { ok: true });
    await page.locator('#contact-name').fill('Sam Seller');
    await page.locator('#contact-email').fill('sam@example.com');
    await page.locator('#contact-phone').fill('347-555-0100');
    await page.locator('#contact-intent').selectOption('selling');
    await page.locator('#contact-message').fill('What is my home in Howard Beach worth?');
    await setTurnstileToken(page, 'contact-turnstile-token', alwaysPassTurnstileToken);
    await Promise.all([
      page.waitForRequest((request) => request.url().includes('worker.example.com')),
      page.getByRole('button', { name: 'Send message' }).click(),
    ]);
    await expect(page.getByText('Thanks — your message is on its way')).toBeVisible();
    expect(getPayload()).toMatchObject({
      name: 'Sam Seller',
      email: 'sam@example.com',
      phone: '347-555-0100',
      intent: 'contact',
      contactIntent: 'selling',
      company: '',
      'cf-turnstile-response': alwaysPassTurnstileToken,
    });
  });

  test('server error surfaces an alert and keeps the form', async ({ page }) => {
    await page.goto('/contact');
    await page.unroute(formEndpointPattern);
    await stubFormEndpoint(page, 500, { ok: false, error: 'Something went wrong. Please try again.' });
    await page.locator('#contact-name').fill('Sam');
    await page.locator('#contact-email').fill('sam@example.com');
    await page.locator('#contact-message').fill('Hello');
    await setTurnstileToken(page, 'contact-turnstile-token', alwaysPassTurnstileToken);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('alert')).toContainText('Something went wrong');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });
});
