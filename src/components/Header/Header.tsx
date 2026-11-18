
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { palette, navLinks } from "@/lib/brands";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import styles from "./Header.module.css";

export default function Header() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check whether the authenticated user is an admin.
  useEffect(() => {
    let cancelled = false;

    async function checkAdminStatus() {
      try {
        const response = await fetch("/api/admin/status", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) setIsAdmin(false);
          return;
        }

        const data: { isAdmin?: boolean } = await response.json();

        if (!cancelled) {
          setIsAdmin(data.isAdmin === true);
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }

    checkAdminStatus();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Prevent background scrolling while the menu is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (menuOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Allow the Escape key to close the menu.
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  if (pathname === "/cart") {
    return null;
  }

  const accountHref = isAdmin ? "/admin" : "/account";

  const renderNavigationLinks = () =>
    navLinks.map((link) => {
      const isActive = pathname === link.href;
      const isSoon = "soon" in link && Boolean(link.soon);

      return (
        <Link
          key={link.href}
          href={link.href}
          className={[
            isSoon ? styles.soon : "",
            isActive ? styles.active : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-current={isActive ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          {link.label}
        </Link>
      );
    });

  return (
    <>
      <div className={styles.shipBanner}>
        <span className={styles.shippingMessage}>
          Free standard delivery on orders of R500+
        </span>
        <span className={styles.shippingSeparator}>·</span>
        <span className={styles.shippingMessage}>
          Mix Scoopful &amp; Funkful Originals in one cart
        </span>
        <span className={styles.shippingSeparator}>·</span>
        <span className={styles.shippingMessage}>
          Live Bob Go standard rates below R500
        </span>
      </div>

      <header className={styles.header}>
        <div className={`wrap ${styles.navInner}`}>
          {/* Logo */}
          <Link
            href="/"
            className={styles.logoLink}
            aria-label="Funkful homepage"
          >
            <Image
              src="/assets/funkful-logo.png"
              alt="Funkful"
              width={110}
              height={26}
              className={styles.logoImg}
              draggable={false}
              priority
            />
          </Link>

          {/* Desktop and tablet-landscape navigation */}
          <nav
            className={styles.links}
            aria-label="Main navigation"
          >
            {renderNavigationLinks()}
          </nav>

          {/* Header actions */}
          <div className={styles.navIcons}>
            <Link
              href={accountHref}
              className={styles.desktopAction}
            >
              Account
            </Link>

            <Link
              href="/account/wishlist"
              className={styles.desktopAction}
              aria-label={
                wishlistCount
                  ? `Wishlist, ${wishlistCount} saved`
                  : "Wishlist"
              }
            >
              Wishlist
              {wishlistCount > 0 && (
                <span className={styles.cartDot}>
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className={styles.bagLink}
              aria-label={`Shopping bag, ${itemCount} items`}
            >
              Bag
              <span className={styles.cartDot}>
                {itemCount}
              </span>
            </Link>

            {/* Responsive menu toggle */}
            <button
              type="button"
              className={styles.burger}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="funkful-mobile-menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? (
                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="4" y1="4" x2="20" y2="20" />
                  <line x1="20" y1="4" x2="4" y2="20" />
                </svg>
              ) : (
                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Tablet portrait and mobile navigation */}
        {menuOpen && (
          <nav
            id="funkful-mobile-menu"
            className={styles.mobileMenu}
            aria-label="Mobile navigation"
          >
            <div className={styles.mobileMenuInner}>
              {renderNavigationLinks()}

              {/*<div className={styles.mobileMenuDivider} />*/}

              <Link
                href={accountHref}
                onClick={() => setMenuOpen(false)}
              >
                Account
              </Link>

              <Link
                href="/account/wishlist"
                onClick={() => setMenuOpen(false)}
              >
                Wishlist
                {wishlistCount > 0 && ` (${wishlistCount})`}
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
