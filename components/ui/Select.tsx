"use client";

import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import styles from "@/styles/components/_select.module.scss";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  renderOption?: (option: SelectOption) => React.ReactNode;
  renderSelectedOption?: (option: SelectOption | undefined) => React.ReactNode;
}

export default function Select({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  style,
  renderOption,
  renderSelectedOption,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!renderSelectedOption) {
      if (value) {
        const option = options.find((opt) => opt.value === value);
        setSelectedLabel(option?.label || placeholder);
      } else {
        setSelectedLabel(placeholder);
      }
    }
  }, [value, options, placeholder, renderSelectedOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`${styles.selectGroup} ${className} ${disabled ? styles.disabled : ""}`} style={style}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.selectWrapper} ref={dropdownRef}>
        <button
          type="button"
          className={`${styles.selectButton} ${isOpen ? styles.open : ""} ${error ? styles.error : ""}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={styles.selectValue}>
            {renderSelectedOption
              ? (() => {
                const selectedOption = value ? options.find((opt) => opt.value === value) : undefined;
                return renderSelectedOption(selectedOption);
              })()
              : selectedLabel
            }
          </span>
          <FiChevronDown className={`${styles.selectIcon} ${isOpen ? styles.rotated : ""}`} />
        </button>
        {isOpen && (
          <div className={styles.dropdown}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${value === option.value ? styles.selected : ""}`}
                onClick={() => handleSelect(option.value)}
              >
                {renderOption ? renderOption(option) : <span className={styles.optionText}>{option.label}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

