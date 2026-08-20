"use client";

import { useLanguage } from "@/lib/utils/language";
import { FiSearch } from "react-icons/fi";
import styles from "@/styles/components/_adminSearch.module.scss";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export default function SearchBar({ placeholder, value, onChange }: SearchBarProps) {
  const { t } = useLanguage();

  return (
    <div className={styles.searchBar}>
      <span className={styles.searchIcon}>
        <FiSearch />
      </span>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder || t("Search...", "جستجو...")}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

