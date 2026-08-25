"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { FiSearch, FiUser, FiShoppingCart, FiMenu, FiX } from "react-icons/fi";
import { useCart } from "@/lib/contexts/CartContext";
import SearchPanel from "@/components/SearchPanel";
import UserAccountDropdown from "@/components/UserAccountDropdown";
import styles from "@/styles/components/_navbar.module.scss";

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const pathname = usePathname();
  const { openCart, getTotalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(70);
  const navbarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  const isDashboard = pathname?.startsWith("/dashboard");
  const totalItems = getTotalItems();

  // Set menu top position to match navbar height exactly (no gap)
  useEffect(() => {
    if (navbarRef.current && menuRef.current) {
      // Use getBoundingClientRect for precise positioning, accounting for borders/shadows
      const navbarRect = navbarRef.current.getBoundingClientRect();
      // Position menu exactly at navbar's bottom edge, subtract 1px to eliminate any visual gap
      menuRef.current.style.top = `${Math.floor(navbarRect.bottom) - 1}px`;
    }
  }, [menuOpen]);

  // Calculate navbar height for SearchPanel
  useEffect(() => {
    const updateNavbarHeight = () => {
      if (navbarRef.current) {
        const height = navbarRef.current.getBoundingClientRect().height;
        setNavbarHeight(height);
      }
    };

    updateNavbarHeight();
    window.addEventListener("resize", updateNavbarHeight);
    return () => window.removeEventListener("resize", updateNavbarHeight);
  }, []);

  // Close search when opening menu and vice versa
  useEffect(() => {
    if (menuOpen) {
      setSearchOpen(false);
      setAccountDropdownOpen(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) {
      setMenuOpen(false);
      setAccountDropdownOpen(false);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (accountDropdownOpen) {
      setMenuOpen(false);
      setSearchOpen(false);
    }
  }, [accountDropdownOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (menuOpen && menuRef.current) {
        // Check if click is outside the menu
        const isClickInMenu = menuRef.current.contains(target);
        // Check if click is on the menu toggle button
        const isClickOnToggle = menuToggleRef.current?.contains(target);

        // Close menu if click is outside both menu and toggle button
        if (!isClickInMenu && !isClickOnToggle) {
          setMenuOpen(false);
        }
      }
    };

    if (menuOpen) {
      // Use a small delay to avoid closing immediately when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [menuOpen]);

  if (isDashboard) {
    return null;
  }

  return (
    <nav ref={navbarRef} className={styles.navbar}>
      <div className={styles.container}>
        <button
          className={styles.searchIconMobile}
          onClick={() => setSearchOpen(!searchOpen)}
          data-search-trigger
          aria-label={t("Search", "جستجو")}
        >
          <FiSearch />
        </button>

        <ul ref={menuRef} className={`${styles.left} ${menuOpen ? styles.active : ""}`}>
          <li>
            <Link href="/" className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("Home", "صفحه اصلی")}
            </Link>
          </li>
          <li>
            <Link href="/instructions" className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("Instructions", "آموزش")}
            </Link>
          </li>
          <li>
            <Link href="/how-to-use" className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("How to Use", "نحوه استفاده")}
            </Link>
          </li>
          <li>
            <Link
              href="/products"
              className={styles.link}
              onClick={() => {
                setMenuOpen(false);
                window.dispatchEvent(new Event("reset-products-filters"));
              }}
            >
              {t("Products", "محصولات")}
            </Link>
          </li>
          <li>
            <Link href="/contact" className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("Contact Us", "تماس با ما")}
            </Link>
          </li>
          <li>
            <Link href="/about" className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("About Us", "درباره ما")}
            </Link>
          </li>
          <li className={styles.mobileLangSwitcher}>
            <div className={styles.langSwitcher}>
              <button
                className={`${styles.langBtn} ${language === "en" ? styles.active : ""}`}
                onClick={() => {
                  setLanguage("en");
                  setMenuOpen(false);
                }}
              >
                EN
              </button>
              <button
                className={`${styles.langBtn} ${language === "fa" ? styles.active : ""}`}
                onClick={() => {
                  setLanguage("fa");
                  setMenuOpen(false);
                }}
              >
                فا
              </button>
            </div>
            <button
              className={styles.closeButton}
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <FiX />
            </button>
          </li>
        </ul>

        <Link href="/" className={styles.logo}>
          <Image 
            src="/images/logo.png" 
            alt="Logo" 
            width={50}
            height={50}
            priority
          />
        </Link>

        <div className={styles.right}>
          <button
            className={styles.icon}
            onClick={() => setSearchOpen(!searchOpen)}
            data-search-trigger
            aria-label={t("Search", "جستجو")}
          >
            <FiSearch />
          </button>
          <div className={styles.langSwitcher}>
            <button
              className={`${styles.langBtn} ${language === "en" ? styles.active : ""}`}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
            <button
              className={`${styles.langBtn} ${language === "fa" ? styles.active : ""}`}
              onClick={() => setLanguage("fa")}
            >
              فا
            </button>
          </div>
          {/* Cart icon - always visible for both guests and logged-in users */}
          <button className={styles.icon} onClick={openCart} aria-label="Open cart">
            <FiShoppingCart />
            {totalItems > 0 && (
              <span className={styles.cartBadge}>{totalItems}</span>
            )}
          </button>
          {session ? (
            <div className={styles.accountDropdown}>
              <button
                ref={accountButtonRef}
                className={`${styles.icon} ${styles.iconLoggedIn} ${styles.accountButton}`}
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                aria-label={t("Account", "حساب کاربری")}
              >
                <FiUser />
              </button>
              <UserAccountDropdown
                isOpen={accountDropdownOpen}
                onClose={() => setAccountDropdownOpen(false)}
              />
            </div>
          ) : (
            <Link
              href="/login"
              className={styles.icon}
              aria-label={t("Login", "ورود")}
              title={t("Login", "ورود")}
            >
              <FiUser />
            </Link>
          )}
        </div>

        <button
          ref={menuToggleRef}
          className={styles.menuToggle}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? t("Close menu", "بستن منو") : t("Open menu", "باز کردن منو")}
          title={menuOpen ? t("Close menu", "بستن منو") : t("Open menu", "باز کردن منو")}
        >
          <FiMenu />
        </button>
      </div>
      <SearchPanel
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        navbarHeight={navbarHeight}
      />
    </nav>
  );
}
