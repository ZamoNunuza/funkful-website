'use client';

import { useState, FormEvent } from 'react';
import styles from './ContactSection.module.css';

// TODO: swap placeholders for real business details
const DETAILS = [
  { label: 'Email', value: 'hello@funkful.co.za', href: 'mailto:hello@funkful.co.za' },
  { label: 'Phone', value: '+27 00 000 0000', href: 'tel:+270000000' },
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
    <section className={styles.contact} id="contact">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.copy}>
          <span className={styles.monoLabel}>We&apos;d love to hear from you</span>
          <h2>Contact Us</h2>
          <p className={styles.sub}>
            Order questions, wholesale enquiries, or just want to tell us
            what you scooped — reach out and we&apos;ll get back to you
            within a business day.
          </p>

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

          <button type="submit" className="btn btn-dark" disabled={status === 'submitting'}>
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
