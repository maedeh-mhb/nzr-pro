"use client";

import { useLanguage } from "@/lib/utils/language";
import { FiChevronRight, FiHome } from "react-icons/fi";
import Link from "next/link";
import styles from "@/styles/components/_adminBreadcrumbs.module.scss";

interface BreadcrumbItem {
  label: string;
  labelFa: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const { language, t } = useLanguage();

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <ol className={styles.breadcrumbList}>
        <li className={styles.breadcrumbItem}>
          <Link href="/admin" className={styles.breadcrumbLink}>
            <FiHome />
            <span>{t("Admin Panel", "پنل مدیریت")}</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = language === "fa" ? item.labelFa : item.label;

          return (
            <li key={index} className={styles.breadcrumbItem}>
              <span className={styles.separator} aria-hidden="true">
                <FiChevronRight />
              </span>
              {isLast ? (
                <span className={styles.breadcrumbCurrent} aria-current="page">
                  {label}
                </span>
              ) : item.href ? (
                <Link href={item.href} className={styles.breadcrumbLink}>
                  {label}
                </Link>
              ) : item.onClick ? (
                <button
                  type="button"
                  className={styles.breadcrumbLink}
                  onClick={item.onClick}
                >
                  {label}
                </button>
              ) : (
                <span className={styles.breadcrumbLink}>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

