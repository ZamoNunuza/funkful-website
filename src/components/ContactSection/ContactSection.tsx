'use client';

import { useState, FormEvent } from 'react';
import styles from './ContactSection.module.css';

// TODO: swap placeholders for real business details
const DETAILS = [
  { label: 'Email', value: 'hello@funkful.co.za', href: 'mailto:hello@funkful.co.za' },
  { label: 'Phone', value: '+27 82 216 3056', href: 'tel:+27822163056' },
  { label: 'Based in', value: 'Johannesburg, Gauteng, South Africa' },
  { label: 'Hours', value: 'Mon–Fri, 9am–5pm SAST' },
];

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      // TODO: wire up to your actual contact endpoint / form service
      // await fetch('/api/contact', { method: 'POST', body: JSON.stringify(form) });
      await new Promise((resolve) => setTimeout(resolve, 600));
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="mt-4 py-11 md:py-14 overflow-hidden" id="contact">
      <div className={`max-w-[1180px] mx-auto px-8 ${styles.grid}`}>
        <div className={styles.copy}>
          <span className={styles.monoLabel}>We&apos;d love to hear from you</span>
          <h2>Contact Us</h2>
          <p className={styles.sub}>
            Order questions, wholesale enquiries, or just want to tell us
            what you scooped — reach out and we&apos;ll get back to you
            within a business day.
          </p>

          <a
            className={styles.whatsappLink}
            href="https://wa.me/27822163056?text=Hi%20Funkful%21%20I%27d%20like%20to%20make%20an%20enquiry."
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.5 0 .15 5.34.15 11.92c0 2.1.55 4.15 1.6 5.96L.05 24l6.27-1.64a11.9 11.9 0 0 0 5.76 1.47h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.49-8.43ZM12.09 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.85 9.85 0 0 1-1.52-5.27c0-5.46 4.44-9.9 9.9-9.9a9.83 9.83 0 0 1 7 2.9 9.83 9.83 0 0 1 2.9 7c0 5.45-4.44 9.89-9.9 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
            </svg>
            Chat with us on WhatsApp
          </a>

          <dl className={styles.detailsList}>
            {DETAILS.map((d) => (
              <div key={d.label} className={styles.detailRow}>
                <dt>{d.label}</dt>
                <dd>
                  {d.href ? <a href={d.href}>{d.value}</a> : d.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label>
            Message
            <textarea
              rows={5}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>

          <button type="submit" className="btn btn-dark shadow-md" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending…' : 'Send message'}
          </button>

          {status === 'success' && (
            <p className={styles.statusOk}>Thanks — we&apos;ll be in touch soon.</p>
          )}
          {status === 'error' && (
            <p className={styles.statusErr}>
              Something went wrong. Please try again, or email us directly.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
