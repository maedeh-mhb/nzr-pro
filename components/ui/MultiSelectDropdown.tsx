"use client";

import { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import styles from "@/styles/components/_multiSelectDropdown.module.scss";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label?: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  error,
  placeholder = "Select categories",
  className = "",
  disabled = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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

  const handleToggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  // Get selected labels for display
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    
    const selectedLabels = options
      .filter(opt => selectedValues.includes(opt.value))
      .map(opt => opt.label);
    
    // Truncate if too long
    const display = selectedLabels.join(", ");
    return display.length > 50 ? display.substring(0, 47) + "..." : display;
  };

  return (
    <div className={`${styles.selectGroup} ${className} ${disabled ? styles.disabled : ""}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.selectWrapper} ref={dropdownRef}>
        <button
          type="button"
          className={`${styles.selectButton} ${isOpen ? styles.open : ""} ${error ? styles.error : ""}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={styles.selectValue}>{getDisplayText()}</span>
          <FiChevronDown className={`${styles.selectIcon} ${isOpen ? styles.rotated : ""}`} />
        </button>
        
        {isOpen && (
          <div className={styles.dropdown}>
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.option} ${isSelected ? styles.selected : ""}`}
                  onClick={() => handleToggleOption(option.value)}
                >
                  <span className={styles.checkbox}>
                    {isSelected && <FiCheck className={styles.checkIcon} />}
                  </span>
                  <span className={styles.optionText}>{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}