"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { FiSearch, FiUser, FiShoppingCart, FiMenu, FiX, FiLogIn, FiLogOut } from "react-icons/fi";
import toast from "react-hot-toast";
import { useCart } from "@/lib/contexts/CartContext";
import SearchPanel from "@/components/SearchPanel";
import UserAccountDropdown from "@/components/UserAccountDropdown";
import styles from "@/styles/components/_navbar.module.scss";

interface NavbarProps {
  dashboardDesktopOnly?: boolean;
}

export default function Navbar({ dashboardDesktopOnly = false }: NavbarProps) {
  const { language, setLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const { openCart, getTotalItems } = useCart();
  const localizedPath = (path: string) => `/${language}${path === "/" ? "" : path}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(70);
  const navbarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  const totalItems = getTotalItems();

  const handleMobileLogout = async () => {
    await signOut({ redirect: false });
    setMenuOpen(false);
    toast.success(t("Logged out successfully", "با موفقیت خارج شدید"));
    router.push("/");
    router.refresh();
  };

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

  return (
    <nav
      ref={navbarRef}
      className={`${styles.navbar} ${dashboardDesktopOnly ? styles.dashboardDesktopOnly : ""}`}
    >
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
            <Link href={localizedPath("/")} className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("Home", "صفحه‌ی اصلی")}
            </Link>
          </li>
          <li>
            <Link href={localizedPath("/about")} className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("About Us", "درباره‌‌ی نازیرا")}
            </Link>
          </li>
          <li>
            <Link href={localizedPath("/instructions")} className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("Instructions", "آموزش")}
            </Link>
          </li>
          <li>
            <Link
              href={localizedPath("/products")}
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
            <Link href={localizedPath("/how-to-use/how-to-use-products-1")} className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("How to Use", "طرز استفاده از محصولات")}
            </Link>
          </li>
          <li>
            <Link href={localizedPath("/contact")} className={styles.link} onClick={() => setMenuOpen(false)}>
              {t("Contact Us", "ارتباط با ما")}
            </Link>
          </li>
          {session ? (
            <>
              <li className={styles.mobileAuthItem}>
                <Link href="/dashboard" className={styles.mobileAuthAction} onClick={() => setMenuOpen(false)}>
                  <span>{t("Profile", "پروفایل")}</span>
                </Link>
              </li>
              <li className={styles.mobileAuthItem}>
                <button type="button" className={styles.mobileAuthAction} onClick={handleMobileLogout}>
                  <span>{t("Logout", "خروج")}</span>
                  <FiLogOut />
                </button>
              </li>
            </>
          ) : (
            <li className={styles.mobileAuthItem}>
              <Link href="/login" className={styles.mobileAuthAction} onClick={() => setMenuOpen(false)}>
                <span>{t("Login", "ورود")}</span>
                <FiLogIn />
              </Link>
            </li>
          )}
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

        <Link href={localizedPath("/")} className={styles.logo}>
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
          {!dashboardDesktopOnly &&
            (session ? (
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
            ))}
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
