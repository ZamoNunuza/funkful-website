'use client';

import { useState } from 'react';
import styles from './faq.module.css';

type FaqItem = {
    id: string;
    question: string;
    answer: React.ReactNode;
};

type FaqCategory = {
    id: string;
    title: string;
    items: FaqItem[];
};

const faqData: FaqCategory[] = [
  {
    id: 'general',
    title: 'General',
    items: [
      {
        id: 'what-is-funkful',
        question: 'What is Funkful?',
        answer: (
          <p>
            Funkful is a personalised gifting brand — think custom mugs, tumblers, and apparel
            you can make your own. Funkful is also home to our sibling brands, so you can shop
            everything from one place.
          </p>
        ),
      },
      {
        id: 'what-is-scoopful',
        question: 'What is Scoopful by Funkful?',
        answer: (
          <p>
            Scoopful is our mystery scoop gift brand — a fun, surprise-style capsule filled with
            curated goodies. It&apos;s part of the Funkful family, built for anyone who loves a good
            surprise as much as a good gift.
          </p>
        ),
      },
      {
        id: 'one-cart',
        question: 'Can I order from Funkful and Scoopful in the same order?',
        answer: (
          <p>
            Yes! You can mix Scoopful and Funkful Originals in one cart and check out once — no
            need to place separate orders.
          </p>
        ),
      },
    ],
  },
  {
    id: 'ordering',
    title: 'Ordering & Products',
    items: [
      {
        id: 'place-order',
        question: 'How do I place an order?',
        answer: (
          <p>
            Add your items to your cart, personalise anything that&apos;s customisable, and check out
            securely — you&apos;ll get a confirmation email once your order is placed.
          </p>
        ),
      },
      {
        id: 'customize',
        question: 'Can I personalise my mug, tumbler, or apparel?',
        answer: (
          <p>
            Most Funkful items are customisable — names, photos, or messages, depending on the
            product. Look for the personalisation options on the product page before adding it
            to your cart.
          </p>
        ),
      },
      {
        id: 'change-order',
        question: 'Can I change or cancel my order after placing it?',
        answer: (
          <p>
            We start working on orders quickly, especially personalised items, so reach out{' '}
            <span className={styles.placeholder}>as soon as possible, within [24 hours]</span> of
            ordering and we&apos;ll do our best to help. Once an order has moved into production we
            may not be able to change it.
          </p>
        ),
      },
      {
        id: 'bulk-orders',
        question: 'Do you offer bulk or corporate orders?',
        answer: (
          <p>
            <span className={styles.placeholder}>Yes — get in touch with us directly</span> for
            bulk pricing on personalised gifts for teams, events, or corporate gifting.
          </p>
        ),
      },
    ],
  },
  {
    id: 'scoopful',
    title: 'Scoopful Mystery Scoops',
    items: [
      {
        id: 'whats-in-a-scoop',
        question: "What exactly is in a mystery scoop?",
        answer: (
          <p>
            Each scoop is a curated surprise — the fun is in not knowing exactly what you&apos;ll get!
            We list the theme, value range, and item category on each listing so you know roughly
            what to expect.
          </p>
        ),
      },
      {
        id: 'choose-contents',
        question: "Can I choose what's inside my scoop?",
        answer: (
          <p>
            No — that&apos;s the mystery part. You can choose the theme or collection, but the exact
            contents are a surprise until it arrives.
          </p>
        ),
      },
      {
        id: 'dont-like-scoop',
        question: "What if I don't like what I get?",
        answer: (
          <p>
            Because mystery scoops are surprise items, they&apos;re{' '}
            <span className={styles.placeholder}>final sale / not eligible for returns based on preference</span>{' '}
            — see our Returns section below. If your scoop arrives damaged or faulty, that&apos;s a
            different story — we&apos;ll sort that out.
          </p>
        ),
      },
      {
        id: 'scoop-gifting',
        question: 'Are scoops good for gifting?',
        answer: (
          <p>
            Definitely — they&apos;re one of our most popular gifts for exactly that reason. You can
            add a gift note at checkout.
          </p>
        ),
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping & Delivery',
    items: [
      {
        id: 'shipping-cost',
        question: 'How much does shipping cost?',
        answer: (
          <p>
            Shipping is free storewide on orders over R400. Below that, it&apos;s a flat R99 — no
            matter how many items or which brands are in your cart.
          </p>
        ),
      },
      {
        id: 'where-ship',
        question: 'Where do you deliver to?',
        answer: (
          <p>
            We currently deliver across{' '}
            <span className={styles.placeholder}>[Gauteng, with national delivery expanding soon]</span>
            . Delivery availability is confirmed at checkout based on your address.
          </p>
        ),
      },
      {
        id: 'delivery-time',
        question: 'How long does delivery take?',
        answer: (
          <p> Made-to-order and personalized products are typically prepared within <span className={styles.placeholder}>3–5 business days</span> before being dispatched. Delivery usually takes a further <span className={styles.placeholder}>2–5 business days</span>, depending on your location and courier service.
            For ready-to-ship items, orders may be dispatched sooner.
            Once your order has been shipped, you&apos;ll receive **tracking details** so you can follow your delivery.
            Please note that <span className={styles.placeholder}>custom designs, large orders, busy seasons, and supplier availability</span> may occasionally affect processing times. If there is a significant delay with your order, we&apos;ll keep you updated.
          </p>
        ),
      },
      {
        id: 'track-order',
        question: 'How do I track my order?',
        answer: (
          <p>
            Once your order ships, you&apos;ll get an email with tracking information so you can
            follow it right to your door.
          </p>
        ),
      },
    ],
  },
  {
    id: 'payment',
    title: 'Payment',
    items: [
      {
        id: 'payment-methods',
        question: 'What payment methods do you accept?',
        answer: (
          <p>
            We accept major debit and credit cards, as well as Instant EFT, processed securely
            through Yoco.
          </p>
        ),
      },
      {
        id: 'payment-secure',
        question: 'Is my payment information secure?',
        answer: (
          <p>
            Yes — all payments are processed through Yoco&apos;s secure, encrypted checkout. We never
            see or store your full card details.
          </p>
        ),
      },
      {
        id: 'payment-plans',
        question: 'Do you offer payment plans?',
        answer: (
          <p>
            <span className={styles.placeholder}>Not currently — check back soon</span>, or use
            your card&apos;s own instalment options if available.
          </p>
        ),
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns, Exchanges & Refunds',
    items: [
      {
        id: 'return-personalised',
        question: 'Can I return a personalised item?',
        answer: (
          <p>
            Because personalised items are made specifically for you, they&apos;re{' '}
            <span className={styles.placeholder}>not eligible for return or exchange unless faulty or damaged</span>.
          </p>
        ),
      },
      {
        id: 'damaged-order',
        question: 'What if my order arrives damaged or incorrect?',
        answer: (
          <p>
            Please contact us within <span className={styles.placeholder}>7 days of receiving your order</span> if your item arrives damaged, faulty, or is different from what you ordered.
            Send us <span className={styles.placeholder}>a clear photo of the item and its packaging</span>, along with your order details, so we can assess the issue and help resolve it.
            Where the issue is confirmed to be our error or damage that occurred during delivery, we&apos;ll arrange a <span className={styles.placeholder}>replacement or refund</span>, depending on the circumstances. {' '}<br />
            For personalized or made-to-order products, please contact us as soon as possible so we can resolve the issue promptly.
          </p>
        ),
      },
      {
        id: 'refund-time',
        question: 'How long do refunds take?',
        answer: (
          <p>
            Approved refunds are processed within{' '}
            <span className={styles.placeholder}>[X business days]</span> back to your original
            payment method.
          </p>
        ),
      },
    ],
  },
  {
    id: 'support',
    title: 'Contact & Support',
    items: [
      {
        id: 'contact-us',
        question: 'How can I get in touch?',
        answer: (
          <p>
            Reach us at{' '}
            <span className={styles.placeholder}>[support email]</span> or via{' '}
            <span className={styles.placeholder}>[social/WhatsApp handle]</span> — we usually
            reply within{' '}
            <span className={styles.placeholder}>[X hours]</span>.
          </p>
        ),
      },
      {
        id: 'physical-store',
        question: 'Do you have a physical store?',
        answer: (
          <p>
            <span className={styles.placeholder}>
              We&apos;re online-only — no physical storefront.
            </span>
          </p>
        ),
      },
    ],
  },
];

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Frequently Asked Questions</h1>
      <p className={styles.subheading}>
        Everything you need to know about Funkful, Scoopful, shipping, payment, and returns.
      </p>

      <nav className={styles.jumpLinks} aria-label="FAQ categories">
        {faqData.map((category) => (
          <a key={category.id} href={`#${category.id}`} className={styles.jumpLink}>
            {category.title}
          </a>
        ))}
      </nav>

      {faqData.map((category) => (
        <section key={category.id} id={category.id} className={styles.category}>
          <h2 className={styles.categoryTitle}>{category.title}</h2>

          {category.items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className={styles.item}>
                <button
                  type="button"
                  className={styles.question}
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <svg
                    className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="4" x2="12" y2="20" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                  </svg>
                </button>
                <div className={`${styles.answer} ${isOpen ? styles.answerOpen : ''}`}>
                  <div className={styles.answerInner}>{item.answer}</div>
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <section className={styles.contactBlock}>
        <p>Still have a question we haven&apos;t answered here?</p>
        <a href="/contact" className={styles.contactLink}>
          Contact us
        </a>
      </section>
    </div>
  );
}