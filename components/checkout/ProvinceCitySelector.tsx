"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import Select, { SelectOption } from "@/components/ui/Select";
import styles from "@/styles/components/_provinceCitySelector.module.scss";

interface Province {
  id: number;
  name: string;
  slug: string;
}

interface City {
  id: number;
  name: string;
  slug: string;
  province_id: number;
}

interface ProvinceCitySelectorProps {
  provinceId: number | null;
  cityId: number | null;
  onProvinceChange: (provinceId: number | null) => void;
  onCityChange: (cityId: number | null) => void;
  error?: string;
}

export default function ProvinceCitySelector({
  provinceId,
  cityId,
  onProvinceChange,
  onCityChange,
  error,
}: ProvinceCitySelectorProps) {
  const { language } = useLanguage();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // Load provinces based on language
  useEffect(() => {
    const loadProvinces = async () => {
      setIsLoadingProvinces(true);
      try {
        const fileName = language === "fa" ? "provinces-fa.json" : "provinces-en.json";
        const response = await fetch(`/data/${fileName}`);
        if (response.ok) {
          const data = await response.json();
          setProvinces(data);
        }
      } catch (error) {
        console.error("Error loading provinces:", error);
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    loadProvinces();
  }, [language]);

  // Load cities when province is selected
  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      onCityChange(null);
      return;
    }

    const loadCities = async () => {
      setIsLoadingCities(true);
      try {
        const fileName = language === "fa" ? "cities-fa.json" : "cities-en.json";
        const response = await fetch(`/data/${fileName}`);
        if (response.ok) {
          const data = await response.json();
          // Filter cities by province_id
          const filteredCities = data.filter((city: City) => city.province_id === provinceId);
          setCities(filteredCities);
        }
      } catch (error) {
        console.error("Error loading cities:", error);
      } finally {
        setIsLoadingCities(false);
      }
    };

    loadCities();
  }, [provinceId, language, onCityChange]);

  const provinceOptions: SelectOption[] = provinces.map((province) => ({
    value: province.id.toString(),
    label: province.name,
  }));

  const cityOptions: SelectOption[] = cities.map((city) => ({
    value: city.id.toString(),
    label: city.name,
  }));

  return (
    <div className={styles.selectorGroup}>
      <div className={styles.selectorItem}>
        <Select
          label={language === "fa" ? "استان" : "Province"}
          options={provinceOptions}
          value={provinceId?.toString() || ""}
          onChange={(value) => {
            onProvinceChange(value ? parseInt(value) : null);
            onCityChange(null); // Reset city when province changes
          }}
          placeholder={language === "fa" ? "استان را انتخاب کنید" : "Select province"}
          error={error && !provinceId ? error : undefined}
          disabled={isLoadingProvinces}
        />
      </div>
      <div className={styles.selectorItem}>
        <Select
          label={language === "fa" ? "شهر" : "City"}
          options={cityOptions}
          value={cityId?.toString() || ""}
          onChange={(value) => onCityChange(value ? parseInt(value) : null)}
          placeholder={language === "fa" ? "شهر را انتخاب کنید" : "Select city"}
          error={error && provinceId && !cityId ? error : undefined}
          disabled={!provinceId || isLoadingCities}
        />
      </div>
    </div>
  );
}

