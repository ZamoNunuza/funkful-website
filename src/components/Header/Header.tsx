'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export interface HeaderProps {
  /** Number shown on the cart bubble. Wire this up to real cart state. */
  cartCount?: number;
}

const NAV_LINKS = [
  { label: 'Personalized', href: '/originals' },
  { label: 'Scoopful', href: '/scoopful' },
  { label: 'Anime Boxes ✨', href: '/#anime', soon: true },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Header({ cartCount = 0 }: HeaderProps) {
  const pathname = usePathname();

  return (
    <>
      <div className={styles.shipBanner}>
        Free shipping storewide on orders over R400{' '}
        <span>·</span> Mix Scoopful &amp; Funkful Originals in one cart{' '}
        <span>·</span> Flat R99 otherwise
      </div>

      <header className={styles.header}>
        <div className={`wrap ${styles.navInner}`}>
          <Link href="/">
            <Image
              src="/assets/funkful-logo.png"
              alt="Funkful"
              width={160}
              height={50}
              className={styles.logoImg}
            />
          </Link>

          <nav className={styles.links}>
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    isActive ? styles.active : '',
                    link.soon ? styles.soon : '',
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
            <span>Search</span>
            <span>Account</span>
            <Link href="/cart">
              Bag <span className={styles.cartDot}>{cartCount}</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
