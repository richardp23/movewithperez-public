export interface Env {
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  TO_EMAIL: string;
  FROM_EMAIL: string;
  ALLOWED_ORIGIN?: string;
  ALLOWED_ORIGINS?: string;
  CRM_WEBHOOK_URL?: string;
  RATE_LIMIT_KV?: KVNamespace;
  RATE_LIMIT_MAX_PER_MINUTE?: string;
}

type ContactIntent = 'buying' | 'selling' | 'both' | 'other';
type FormIntent = 'contact' | 'valuation';

interface ContactPayload {
  intent: 'contact';
  name?: string;
  email?: string;
  phone?: string;
  contactIntent?: string;
  message?: string;
  company?: string;
  'cf-turnstile-response'?: string;
}

interface ValuationPayload {
  intent: 'valuation';
  name?: string;
  email?: string;
  address?: string;
  company?: string;
  'cf-turnstile-response'?: string;
}

type FormPayload = ContactPayload | ValuationPayload;

const CONTACT_INTENTS: ContactIntent[] = ['buying', 'selling', 'both', 'other'];

function resolveCorsOrigin(request: Request, env: Env): string | null {
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.get('Origin');
  if (!requestOrigin) return null;
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
}

const jsonHeaders = (allowedOrigin: string | null) => ({
  'Content-Type': 'application/json',
  ...corsHeaders(allowedOrigin),
});

const corsHeaders = (allowedOrigin: string | null) => {
  if (!allowedOrigin) return {};
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
};

const jsonResponse = (allowedOrigin: string | null, body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders(allowedOrigin) });

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp: string | null
): Promise<boolean> {
  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!res.ok) return false;
  const result = (await res.json()) as { success?: boolean };
  return Boolean(result.success);
}

function htmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildContactEmail(payload: Required<Pick<ContactPayload, 'name' | 'email' | 'message'>> &
  Pick<ContactPayload, 'phone'> & { contactIntent: ContactIntent }) {
  const phoneValue = payload.phone?.trim() ? payload.phone.trim() : '—';
  const messageHtml = htmlEscape(payload.message).replaceAll('\n', '<br />');
  return `<p><strong>Name:</strong> ${htmlEscape(payload.name)}</p>
<p><strong>Email:</strong> ${htmlEscape(payload.email)}</p>
<p><strong>Phone:</strong> ${htmlEscape(phoneValue)}</p>
<p><strong>Interested in:</strong> ${htmlEscape(payload.contactIntent)}</p>
<p><strong>Message:</strong></p>
<p>${messageHtml}</p>`;
}

function buildValuationEmail(payload: Required<Pick<ValuationPayload, 'name' | 'email' | 'address'>>) {
  return `<p><strong>Name:</strong> ${htmlEscape(payload.name)}</p>
<p><strong>Email:</strong> ${htmlEscape(payload.email)}</p>
<p><strong>Address:</strong> ${htmlEscape(payload.address)}</p>`;
}

function validate(payload: FormPayload): { ok: true } | { ok: false; error: string } {
  if (payload.intent === 'contact') {
    const name = (payload.name ?? '').trim();
    const email = (payload.email ?? '').trim();
    const message = (payload.message ?? '').trim();
    const contactIntent = (payload.contactIntent ?? '').trim();
    if (!name || !isEmail(email) || !message) {
      return { ok: false, error: 'Please complete your name, email, and message.' };
    }
    if (!CONTACT_INTENTS.includes(contactIntent as ContactIntent)) {
      return { ok: false, error: 'Please choose what you’re interested in.' };
    }
    if (message.length > 5000) {
      return { ok: false, error: 'Message is too long.' };
    }
    return { ok: true };
  }

  const name = (payload.name ?? '').trim();
  const email = (payload.email ?? '').trim();
  const address = (payload.address ?? '').trim();
  if (!name || !isEmail(email) || !address) {
    return { ok: false, error: 'Please complete all fields.' };
  }
  return { ok: true };
}

async function sendResend(payload: FormPayload, env: Env) {
  const subject = `New buyer/seller enquiry — ${payload.intent}`;
  const submitterEmail = (payload.email ?? '').trim();

  const html =
    payload.intent === 'contact'
      ? buildContactEmail({
          name: (payload.name ?? '').trim(),
          email: (payload.email ?? '').trim(),
          phone: payload.phone,
          message: (payload.message ?? '').trim(),
          contactIntent: (payload.contactIntent ?? '').trim() as ContactIntent,
        })
      : buildValuationEmail({
          name: (payload.name ?? '').trim(),
          email: (payload.email ?? '').trim(),
          address: (payload.address ?? '').trim(),
        });

  const resendPayload = {
    from: env.FROM_EMAIL,
    to: env.TO_EMAIL,
    reply_to: submitterEmail,
    subject,
    html,
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify(resendPayload),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${details}`);
  }
}

async function isRateLimited(request: Request, env: Env): Promise<boolean> {
  if (!env.RATE_LIMIT_KV) return false;

  const remoteIp = request.headers.get('CF-Connecting-IP')?.trim();
  if (!remoteIp) return false;

  const limitValue = Number.parseInt(env.RATE_LIMIT_MAX_PER_MINUTE ?? '', 10);
  const maxPerMinute = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 20;

  const key = `rate:${remoteIp}`;
  const currentRaw = await env.RATE_LIMIT_KV.get(key);
  const current = Number.parseInt(currentRaw ?? '0', 10);
  const nextCount = Number.isFinite(current) ? current + 1 : 1;

  await env.RATE_LIMIT_KV.put(key, String(nextCount), { expirationTtl: 60 });

  return nextCount > maxPerMinute;
}

async function pushToCRM(payload: FormPayload, env: Env) {
  if (!env.CRM_WEBHOOK_URL) return;
  try {
    await fetch(env.CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: payload.intent === 'contact' ? 'website-contact' : 'website-valuation',
        ...payload,
      }),
    });
  } catch (error) {
    console.error('crm webhook failed', error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigin = resolveCorsOrigin(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }
    if (request.method !== 'POST') {
      return jsonResponse(allowedOrigin, { ok: false, error: 'Method not allowed' }, 405);
    }

    try {
      let payload: FormPayload;
      try {
        payload = (await request.json()) as FormPayload;
      } catch {
        return jsonResponse(allowedOrigin, { ok: false, error: 'Invalid request' }, 400);
      }
      if (payload.company && payload.company.trim()) {
        return jsonResponse(allowedOrigin, { ok: true }, 200);
      }

      const token = (payload['cf-turnstile-response'] ?? '').trim();
      if (!token) {
        return jsonResponse(allowedOrigin, { ok: false, error: 'Turnstile verification failed' }, 403);
      }
      const remoteIp = request.headers.get('CF-Connecting-IP');
      const turnstileOk = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, remoteIp);
      if (!turnstileOk) {
        return jsonResponse(allowedOrigin, { ok: false, error: 'Turnstile verification failed' }, 403);
      }
      if (await isRateLimited(request, env)) {
        return jsonResponse(allowedOrigin, { ok: false, error: 'Too many requests. Please try again soon.' }, 429);
      }

      if (payload.intent !== 'contact' && payload.intent !== 'valuation') {
        return jsonResponse(allowedOrigin, { ok: false, error: 'Invalid intent' }, 422);
      }

      const validation = validate(payload);
      if (!validation.ok) {
        return jsonResponse(allowedOrigin, { ok: false, error: validation.error }, 422);
      }

      await sendResend(payload, env);
      await pushToCRM(payload, env);
      return jsonResponse(allowedOrigin, { ok: true }, 200);
    } catch (error) {
      console.error('worker failure', error);
      return jsonResponse(allowedOrigin, { ok: false, error: 'Something went wrong. Please try again.' }, 500);
    }
  },
};
