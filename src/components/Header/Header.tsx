'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { palette, navLinks } from "@/lib/brands";
import { useCart } from '@/lib/cart-context';
import styles from './Header.module.css';


export default function Header() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  // Prevent background scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  if (pathname === '/cart') {
    return null;
  }

  return (
    <>
      <div className={styles.shipBanner}>
        Free shipping storewide on orders over R400{' '}
        <span>·</span> Mix Scoopful &amp; Funkful Originals in one cart{' '}
        <span>·</span> Flat R99 otherwise
      </div>

      <header style={{ background: palette.cream, borderBottom: "1px solid rgba(17,17,17,0.08)" }} className="sticky top-0 z-50 bg-[--brand-bg,inherit]">
        <div className={`wrap ${styles.navInner}`}>
          <Link href="/">
            <Image
              src="/assets/funkful-logo.png"
              alt="Funkful"
              width={110}
              height={26}
              className={styles.logoImg}
              draggable={false}
            />
          </Link>

          <nav className={`${styles.links} hidden md:flex gap-9`}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    link.soon ? styles.soon : isActive ? styles.active : palette.black,
                    isActive ? styles.active : "transparent",         
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

           <div className={styles.navIcons}>
            <span className="hidden md:inline">Search</span>
            <Link href="/account" className="hidden md:flex items-center gap-1"><span>Account</span></Link>
            <Link href="/cart">
              Bag <span className={styles.cartDot}>{itemCount}</span>
            </Link>

            <button
              type="button"
              className={styles.burger}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="20" y2="20" />
                  <line x1="20" y1="4" x2="4" y2="20" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className={styles.mobileMenu}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[link.soon ? styles.soon : '', isActive ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link href="/account">Account</Link>
          </nav>
        )}
      </header>
    </>
  );
}
