'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { palette, navLinks } from "@/lib/brands";
import { useCart } from '@/lib/cart-context';
import styles from './Header.module.css';


export default function Header() {
  const pathname = usePathname();
  const { itemCount } = useCart();

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
            <span>Search</span>
            <Link href="/account" className="flex items-center gap-1"><span>Account</span></Link>
            <Link href="/cart">
              Bag <span className={styles.cartDot}>{itemCount}</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
