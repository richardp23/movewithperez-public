import { useEffect, useState, type SubmitEventHandler } from 'react';

type Status = 'idle' | 'sending' | 'done' | 'error';
const FORM_ENDPOINT = import.meta.env.PUBLIC_FORM_ENDPOINT;
const TURNSTILE_SITEKEY = import.meta.env.PUBLIC_TURNSTILE_SITEKEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: 'var(--color-ink)',
  marginBottom: '0.375rem',
};

const fieldStyle: React.CSSProperties = { marginBottom: '1rem' };

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const tokenInputId = 'contact-turnstile-token';
  const turnstileContainerId = 'contact-turnstile-widget';

  useEffect(() => {
    const container = document.getElementById(turnstileContainerId);
    const tokenInput = document.getElementById(tokenInputId) as HTMLInputElement | null;
    let widgetId: string | undefined;
    let pollTimer: number | undefined;

    const mountTurnstile = () => {
      if (!container || !TURNSTILE_SITEKEY || !window.turnstile?.render) return false;
      container.innerHTML = '';
      widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITEKEY,
        callback: (token: string) => {
          if (tokenInput) tokenInput.value = token;
        },
        'expired-callback': () => {
          if (tokenInput) tokenInput.value = '';
        },
        'error-callback': () => {
          if (tokenInput) tokenInput.value = '';
        },
      });
      return true;
    };

    if (!mountTurnstile()) {
      pollTimer = window.setInterval(() => {
        if (mountTurnstile() && pollTimer) {
          window.clearInterval(pollTimer);
          pollTimer = undefined;
        }
      }, 100);
    }

    return () => {
      if (pollTimer) window.clearInterval(pollTimer);
      if (widgetId && window.turnstile?.remove) {
        window.turnstile.remove(widgetId);
      }
    };
  }, []);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    const form = e.currentTarget;
    const value = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
        .value;
    const turnstileToken = (document.getElementById(tokenInputId) as HTMLInputElement | null)?.value ?? '';
    const payload = {
      intent: 'contact' as const,
      name: value('name'),
      email: value('email'),
      phone: value('phone'),
      contactIntent: value('contactIntent'),
      message: value('message'),
      company: value('company'), // honeypot
      'cf-turnstile-response': turnstileToken,
    };
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok && body.ok) setStatus('done');
      else {
        setStatus('error');
        setError(body.error || 'Please try again.');
      }
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  };

  if (status === 'done') {
    return (
      <div className="card form-state" style={{ padding: '1.5rem' }} role="status">
        <p style={{ margin: 0 }}>
          Thanks — your message is on its way. You'll hear back within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card form-state" style={{ padding: '1.5rem' }} noValidate>
      <div style={fieldStyle}>
        <label htmlFor="contact-name" style={labelStyle}>
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          className="input"
          autoComplete="name"
          required
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="contact-email" style={labelStyle}>
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          required
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="contact-phone" style={labelStyle}>
          Phone <span style={{ color: 'var(--color-mute)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input id="contact-phone" name="phone" type="tel" className="input" autoComplete="tel" />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="contact-intent" style={labelStyle}>
          I'm interested in
        </label>
        <select id="contact-intent" name="contactIntent" className="input" defaultValue="buying" required>
          <option value="buying">Buying a home</option>
          <option value="selling">Selling a home</option>
          <option value="both">Renting</option>
          <option value="both">Site accessibility issue</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="contact-message" style={labelStyle}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          className="input"
          rows={5}
          required
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* honeypot — keep only an offscreen input to avoid hidden text contrast noise */}
      <input
        id="contact-company"
        name="company"
        type="hidden"
        autoComplete="off"
      />
      {TURNSTILE_SITEKEY && (
        <>
          <div id={turnstileContainerId} style={{ marginBottom: '1rem' }} />
          <input id={tokenInputId} type="hidden" />
        </>
      )}

      <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      {error && (
        <p role="alert" style={{ color: 'var(--color-error)', marginTop: '0.75rem', marginBottom: 0 }}>
          {error}
        </p>
      )}
    </form>
  );
}
