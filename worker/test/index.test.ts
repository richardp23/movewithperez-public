import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';

const env = {
  RESEND_API_KEY: 'test',
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  TO_EMAIL: 'to@example.com',
  FROM_EMAIL: 'from@example.com',
  ALLOWED_ORIGIN: 'https://example.github.io',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('worker pre-send guards', () => {
  it('honeypot returns 200 and skips downstream calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const req = new Request('https://worker.example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'valuation',
        name: 'Bot',
        email: 'bot@example.com',
        address: '123 Bot St',
        company: 'spam',
        'cf-turnstile-response': 'ignored-token',
      }),
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('turnstile fail returns 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const req = new Request('https://worker.example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'contact',
        name: 'Sam',
        email: 'sam@example.com',
        contactIntent: 'selling',
        message: 'Hello',
        company: '',
        'cf-turnstile-response': '2x00000000000000000000AB',
      }),
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('Turnstile');
  });

  it('validation failure returns 422 after successful turnstile', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const req = new Request('https://worker.example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'valuation',
        name: '',
        email: 'not-an-email',
        address: '',
        company: '',
        'cf-turnstile-response': '1x00000000000000000000AA',
      }),
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('complete all fields');
  });
});

describe('worker delivery payload', () => {
  it('sends reply_to as the submitter email', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'email_123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const req = new Request('https://worker.example.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '198.51.100.7',
      },
      body: JSON.stringify({
        intent: 'contact',
        name: 'Lead Example',
        email: 'lead@example.com',
        phone: '555-0100',
        contactIntent: 'buying',
        message: 'I want to view a listing.',
        company: '',
        'cf-turnstile-response': '2x00000000000000000000AB',
      }),
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const resendCall = fetchSpy.mock.calls[1];
    expect(resendCall?.[0]).toBe('https://api.resend.com/emails');
    const resendInit = resendCall?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(resendInit?.body)) as {
      from: string;
      to: string;
      reply_to: string;
      subject: string;
      html: string;
    };
    expect(body.from).toBe(env.FROM_EMAIL);
    expect(body.to).toBe(env.TO_EMAIL);
    expect(body.reply_to).toBe('lead@example.com');
  });
});
