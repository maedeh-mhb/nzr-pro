/**
 * Icon renderer utility
 * Combines icon maps from different libraries and renders them
 */

import React from "react";
import { faIcons } from "./icons/fa";
import { mdIcons } from "./icons/md";
import { giIcons } from "./icons/gi";
import { tbIcons } from "./icons/tb";
import { ioIcons } from "./icons/io";

// Combine all icon maps
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ...faIcons,
  ...mdIcons,
  ...giIcons,
  ...tbIcons,
  ...ioIcons,
};

export function renderIcon(iconName: string | null, className?: string, style?: React.CSSProperties): React.ReactElement | null {
  if (!iconName) return null;
  
  const IconComponent = iconMap[iconName];
  if (!IconComponent || typeof IconComponent !== 'function') {
    console.warn(`Icon "${iconName}" not found in iconMap`);
    return null;
  }
  
  return <IconComponent className={className} style={style} />;
}
