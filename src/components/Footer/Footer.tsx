'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { brands, palette } from "@/lib/brands";
import styles from './Footer.module.css';

const CONTACT = {
  email: 'hello@funkful.co.za',
  phone: '+27 82 216 3056',
  address: 'Johannesburg, Gauteng, South Africa',
};

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/funkful_sa' },
  { label: 'TikTok', href: 'https://tiktok.com/@funkful' },
  { label: 'Facebook', href: 'https://facebook.com/funkful' },
];

const SHOP_LINKS = [
  { label: 'Funkful Originals', href: '/originals' },
  { label: 'Scoopful', href: '/scoopful' },
  { label: 'Anime Box', href: '/#anime' },
];

const SUPPORT_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Shipping & Returns', href: '/shipping' },
  { label: 'FAQ', href: '/faq' },
];

export default function Footer() {
    const funkful = brands.funkful;
    const pathname = usePathname();

    return (
        <footer className={styles.footer}>
            <div className={`max-w-[1180px] ${styles.grid}`}>
                <div className={styles.brandCol}>
                    <Image
                        src={funkful.logo}
                        alt="Funkful"
                        className={styles.logoImg}
                        width={120}
                        height={28}
                    />
                    <p className={styles.blurb}>
                        Personalized gifts, mystery scoops, and everything in between —
                        one cart, every brand.
                    </p>
                    <div className={styles.socials}>
                        {SOCIALS.map((s) => (
                            <Link
                                key={s.label}
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {s.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className={styles.linkCol}>
                    <h5>Shop</h5>
                    {SHOP_LINKS.map((l) =>  {
                            const isActive = pathname === l.href;
                            return (
                            <Link
                                key={l.label}
                                href={l.href}
                                className={isActive ? styles.activeLink : ''}
                            >
                                {l.label}
                            </Link>
                            );
                        })}
                </div>
                <div className={styles.linkCol}>
                    <h5>Support</h5>
                    {SUPPORT_LINKS.map((l) => (
                        <Link key={l.label} href={l.href}>
                            {l.label}
                        </Link>
                    ))}
                </div>

                <div className={styles.linkCol}>
                    <h5>Get in touch</h5>
                    <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                    <a href={`tel:${CONTACT.phone.replace(/\s/g,'')}`}>{CONTACT.phone}</a>
                    <span className={styles.address}>{CONTACT.address}</span>
                </div>
            </div>
            <div className={`max-w-[1180px] ${styles.bottom}`}>
                <span>© {new Date().getFullYear()} Funkful (Pty) Ltd. All rights reserved.</span>
                <span>funkful.co.za</span>
            </div>
        </footer>
    );
}
      