"use client";

import { ReactNode } from "react";
import styles from "@/styles/components/_adminCard.module.scss";

interface AdminCardProps {
  children: ReactNode;
  className?: string;
}

export default function AdminCard({ children, className = "" }: AdminCardProps) {
  return <div className={`${styles.adminCard} ${className}`}>{children}</div>;
}

