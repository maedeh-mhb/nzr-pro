"use client";

import { useState, useRef, useEffect } from "react";
import { DatePicker } from "jalaali-react-date-picker";
import moment from "moment-jalaali";
import "jalaali-react-date-picker/lib/styles/index.css";
import styles from "@/styles/components/_persianDatePicker.module.scss";

interface PersianDatePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export default function PersianDatePicker({
  label,
  value,
  onChange,
  error,
  placeholder = "انتخاب تاریخ",
}: PersianDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<moment.Moment | null>(
    value ? moment(value, "jYYYY/jMM/jDD") : null
  );
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = moment(value, "jYYYY/jMM/jDD");
      if (date.isValid()) {
        setSelectedDate(date);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
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

  const handleDateChange = (date: moment.Moment | null) => {
    setSelectedDate(date);
    if (date && onChange) {
      const jalaliString = date.format("jYYYY/jMM/jDD");
      onChange(jalaliString);
    } else if (onChange) {
      onChange("");
    }
    setIsOpen(false);
  };

  return (
    <div className={styles.formGroup}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.datePickerWrapper} ref={wrapperRef}>
        <input
          type="text"
          readOnly
          value={selectedDate ? selectedDate.format("jYYYY/jMM/jDD") : ""}
          placeholder={placeholder}
          className={`${styles.input} ${error ? styles.error : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        />
        {isOpen && (
          <div className={styles.calendarContainer}>
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>
        )}
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

