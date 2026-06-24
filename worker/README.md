# Cloudflare Worker form handler

This Worker receives form submissions from the static Astro site and sends notification email through Resend.

## Required secrets

Set these with `wrangler secret put` in `worker/`:

- `RESEND_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `TO_EMAIL`
- `FROM_EMAIL`
- `ALLOWED_ORIGIN`

Optional:

- `CRM_WEBHOOK_URL`

Example:

```bash
cd worker
wrangler secret put RESEND_API_KEY
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put TO_EMAIL
wrangler secret put FROM_EMAIL
wrangler secret put ALLOWED_ORIGIN
# optional
wrangler secret put CRM_WEBHOOK_URL
```

`ALLOWED_ORIGIN` must exactly match the deployed GitHub Pages origin (scheme + host, no mismatch).

## Runtime behavior

- Handles CORS preflight (`OPTIONS`) with `204`.
- Accepts only `POST`.
- Requires `intent` (`contact` or `valuation`), honeypot field `company`, and `cf-turnstile-response`.
- Silently accepts bot submissions when `company` is set (returns `200`).
- Verifies Turnstile token with `TURNSTILE_SECRET_KEY` and `CF-Connecting-IP`.
- Validates required fields:
  - `contact`: `name`, valid `email`, `message`, valid `contactIntent` (`buying|selling|both|other`), message length <= 5000
  - `valuation`: `name`, valid `email`, `address`
- Sends a Resend email to `TO_EMAIL` from `FROM_EMAIL`.
- Optionally forwards the payload to `CRM_WEBHOOK_URL` (best effort; non-blocking).

## Local dev

```bash
cd worker
pnpm install
pnpm dev
```

## Tests

```bash
cd worker
pnpm test
```

Tests cover pre-send guard branches (honeypot, Turnstile fail, validation fail) and do not call real Resend.
