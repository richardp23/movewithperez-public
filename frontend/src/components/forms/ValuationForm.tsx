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

export default function ValuationForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const tokenInputId = 'valuation-turnstile-token';
  const turnstileContainerId = 'valuation-turnstile-widget';

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
    const turnstileToken = (document.getElementById(tokenInputId) as HTMLInputElement | null)?.value ?? '';
    const payload = {
      intent: 'valuation' as const,
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      address: (form.elements.namedItem('address') as HTMLInputElement).value,
      company: (form.elements.namedItem('company') as HTMLInputElement).value, // honeypot
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
          Thanks — your request is in. You'll hear back within one business day.
        </p>
      </div>
    );
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-ink)',
    marginBottom: '0.375rem',
  };
  const fieldStyle: React.CSSProperties = { marginBottom: '1rem' };

  return (
    <form onSubmit={handleSubmit} className="card form-state" style={{ padding: '1.5rem' }} noValidate>
      <div style={fieldStyle}>
        <label htmlFor="valuation-name" style={labelStyle}>
          Name
        </label>
        <input
          id="valuation-name"
          name="name"
          type="text"
          className="input"
          autoComplete="name"
          required
        />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="valuation-email" style={labelStyle}>
          Email
        </label>
        <input
          id="valuation-email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          required
        />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="valuation-address" style={labelStyle}>
          Property address
        </label>
        <input
          id="valuation-address"
          name="address"
          type="text"
          className="input"
          autoComplete="street-address"
          required
        />
      </div>
      {/* honeypot — keep only an offscreen input to avoid hidden text contrast noise */}
      <input
        id="valuation-company"
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
        {status === 'sending' ? 'Sending…' : 'Get my estimate'}
      </button>
      {error && (
        <p role="alert" style={{ color: 'var(--color-error)', marginTop: '0.75rem', marginBottom: 0 }}>
          {error}
        </p>
      )}
    </form>
  );
}
