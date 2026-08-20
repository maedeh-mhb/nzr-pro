"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import {
  // Font Awesome
  FaLeaf,
  FaSeedling,
  FaTree,
  FaPagelines,
  FaSun,
  FaWater,
  FaWind,
  FaSoap,
  FaHandSparkles,
  FaHandsWash,
  FaPumpSoap,
  FaBath,
  FaShower,
  FaCut,
  FaUserAlt,
  FaUserCircle,
  FaBroom,
  FaSprayCan,
  FaMagic,
  FaCheckCircle,
  FaSpa,
  FaHeartbeat,
  FaPumpMedical,
} from "react-icons/fa";
import {
  // Material Icons
  MdSoap,
  MdCleanHands,
  MdWash,
  MdShower,
  MdBathroom,
  MdFace,
  MdPerson,
  MdSpa,
  MdSelfImprovement,
  MdHealthAndSafety,
} from "react-icons/md";
import {
  // Game Icons
  GiLeafSwirl,
  GiHerbsBundle,
  GiPlantRoots,
  GiFlowerPot,
  GiForest,
  GiSprout,
  GiHairStrands,
  GiBeard,
  GiComb,
  GiPerfumeBottle,
  GiMedicinePills,
} from "react-icons/gi";
import {
  // Tabler Icons
  TbWash,
  TbDroplet,
  TbSparkles,
  TbChecklist,
} from "react-icons/tb";
import {
  // Ionicons
  IoSparkles,
  IoWaterOutline,
  IoLeafOutline,
} from "react-icons/io5";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "@/styles/components/_iconPicker.module.scss";

interface IconOption {
  name: string;
  component: React.ComponentType<{ className?: string }>;
  library: string;
}

// Helper function to filter out undefined components
const createIconList = (icons: Array<{ name: string; component: any }>) => {
  return icons.filter((icon) => icon.component !== undefined);
};

const iconCategories = {
  "Font Awesome": createIconList([
    { name: "FaLeaf", component: FaLeaf },
    { name: "FaSeedling", component: FaSeedling },
    { name: "FaTree", component: FaTree },
    { name: "FaPagelines", component: FaPagelines },
    { name: "FaSun", component: FaSun },
    { name: "FaWater", component: FaWater },
    { name: "FaWind", component: FaWind },
    { name: "FaSoap", component: FaSoap },
    { name: "FaHandSparkles", component: FaHandSparkles },
    { name: "FaHandsWash", component: FaHandsWash },
    { name: "FaPumpSoap", component: FaPumpSoap },
    { name: "FaBath", component: FaBath },
    { name: "FaShower", component: FaShower },
    { name: "FaCut", component: FaCut },
    { name: "FaUserAlt", component: FaUserAlt },
    { name: "FaUserCircle", component: FaUserCircle },
    { name: "FaBroom", component: FaBroom },
    { name: "FaSprayCan", component: FaSprayCan },
    { name: "FaMagic", component: FaMagic },
    { name: "FaCheckCircle", component: FaCheckCircle },
    { name: "FaSpa", component: FaSpa },
    { name: "FaHeartbeat", component: FaHeartbeat },
    { name: "FaPumpMedical", component: FaPumpMedical },
  ]),
  "Material Icons": createIconList([
    { name: "MdSoap", component: MdSoap },
    { name: "MdCleanHands", component: MdCleanHands },
    { name: "MdWash", component: MdWash },
    { name: "MdShower", component: MdShower },
    { name: "MdBathroom", component: MdBathroom },
    { name: "MdFace", component: MdFace },
    { name: "MdPerson", component: MdPerson },
    { name: "MdSpa", component: MdSpa },
    { name: "MdSelfImprovement", component: MdSelfImprovement },
    { name: "MdHealthAndSafety", component: MdHealthAndSafety },
  ]),
  "Game Icons": createIconList([
    { name: "GiLeafSwirl", component: GiLeafSwirl },
    { name: "GiHerbsBundle", component: GiHerbsBundle },
    { name: "GiPlantRoots", component: GiPlantRoots },
    { name: "GiFlowerPot", component: GiFlowerPot },
    { name: "GiForest", component: GiForest },
    { name: "GiSprout", component: GiSprout },
    { name: "GiHairStrands", component: GiHairStrands },
    { name: "GiBeard", component: GiBeard },
    { name: "GiComb", component: GiComb },
    { name: "GiPerfumeBottle", component: GiPerfumeBottle },
    { name: "GiMedicinePills", component: GiMedicinePills },
  ]),
  "Tabler Icons": createIconList([
    { name: "TbWash", component: TbWash },
    { name: "TbDroplet", component: TbDroplet },
    { name: "TbSparkles", component: TbSparkles },
    { name: "TbChecklist", component: TbChecklist },
  ]),
  "Ionicons": createIconList([
    { name: "IoSparkles", component: IoSparkles },
    { name: "IoWaterOutline", component: IoWaterOutline },
    { name: "IoLeafOutline", component: IoLeafOutline },
  ]),
};

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
}

export default function IconPicker({ value, onChange, label }: IconPickerProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectedIcon = value
    ? Object.values(iconCategories)
        .flat()
        .find((icon) => icon.name === value)
    : null;

  return (
    <div className={styles.iconPicker}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.pickerContainer}>
        <button
          type="button"
          className={styles.pickerButton}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className={styles.selectedIcon}>
            {selectedIcon && selectedIcon.component ? (
              <selectedIcon.component className={styles.icon} />
            ) : (
              <span className={styles.placeholder}>
                {t("Select an icon", "یک آیکون انتخاب کنید")}
              </span>
            )}
          </div>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>

        {isOpen && (
          <div className={styles.iconGrid}>
            {Object.entries(iconCategories).map(([category, icons]) => (
              <div key={category} className={styles.categorySection}>
                <button
                  type="button"
                  className={styles.categoryHeader}
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  {expandedCategories.has(category) ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {expandedCategories.has(category) && (
                  <div className={styles.iconsList}>
                    {icons.map((icon) => {
                      const IconComponent = icon.component;
                      const isSelected = value === icon.name;
                      // Skip if component is undefined
                      if (!IconComponent || typeof IconComponent !== 'function') {
                        return null;
                      }
                      return (
                        <button
                          key={icon.name}
                          type="button"
                          className={`${styles.iconOption} ${isSelected ? styles.selected : ""}`}
                          onClick={() => {
                            onChange(icon.name);
                            setIsOpen(false);
                          }}
                          title={icon.name}
                        >
                          <IconComponent className={styles.icon} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {value && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
              >
                {t("Clear Selection", "پاک کردن انتخاب")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

