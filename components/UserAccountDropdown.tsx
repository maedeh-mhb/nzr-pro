"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiUser, FiLogOut, FiPackage, FiChevronDown } from "react-icons/fi";
import styles from "@/styles/components/_userAccountDropdown.module.scss";

interface UserProfile {
  name: string | null;
  surname: string | null;
  email: string;
}

interface UserAccountDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserAccountDropdown({ isOpen, onClose }: UserAccountDropdownProps) {
  const { t, language } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setUserProfile({
            name: data.name,
            surname: data.surname,
            email: data.email,
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (session?.user && isOpen) {
      fetchProfile();
    }
  }, [session, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
    onClose();
    toast.success(t("Logged out successfully", "با موفقیت خارج شدید"));
    router.push("/");
    router.refresh();
  };

  const getInitials = (name: string | null, surname: string | null) => {
    if (name && surname) {
      return (name[0] + surname[0]).toUpperCase();
    }
    if (name) {
      return name.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const displayName = userProfile
    ? userProfile.surname
      ? `${userProfile.name} ${userProfile.surname}`
      : userProfile.name || "User"
    : session?.user?.name || "User";

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef} 
      className={styles.dropdownMenu}
      dir={language === "fa" ? "rtl" : "ltr"}
    >
      <div className={styles.dropdownHeader}>
        <div className={styles.dropdownAvatar}>
          {getInitials(userProfile?.name || null, userProfile?.surname || null)}
        </div>
        <div className={styles.dropdownInfo}>
          <div className={styles.dropdownName}>{displayName}</div>
          <div className={styles.dropdownEmail}>
            {userProfile?.email || session?.user?.email}
          </div>
        </div>
      </div>
      <div className={styles.dropdownDivider}></div>
      {language === "fa" ? (
        // Farsi RTL version
        <div className={styles.dropdownItemsRTL}>
          <Link
            href="/dashboard"
            className={styles.dropdownItemRTL}
            onClick={onClose}
          >
            <span>{t("Account", "حساب کاربری")}</span>
            <FiUser />
          </Link>
          <Link
            href="/dashboard?section=orders"
            className={styles.dropdownItemRTL}
            onClick={onClose}
          >
            <span>{t("Orders", "سفارش‌ها")}</span>
            <FiPackage />
          </Link>
          <button
            className={`${styles.dropdownItemRTL} ${styles.dropdownItemDangerRTL}`}
            onClick={handleLogout}
          >
            <span>{t("Logout", "خروج")}</span>
            <FiLogOut />
          </button>
        </div>
      ) : (
        // English LTR version
        <div className={styles.dropdownItems}>
          <Link
            href="/dashboard"
            className={styles.dropdownItem}
            onClick={onClose}
          >
            <FiUser />
            <span>{t("Account", "حساب کاربری")}</span>
          </Link>
          <Link
            href="/dashboard?section=orders"
            className={styles.dropdownItem}
            onClick={onClose}
          >
            <FiPackage />
            <span>{t("Orders", "سفارش‌ها")}</span>
          </Link>
          <button
            className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>{t("Logout", "خروج")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

