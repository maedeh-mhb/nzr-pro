"use client";

import { ReactNode } from "react";
import styles from "@/styles/components/_adminActivity.module.scss";

interface ActivityItemProps {
  icon: ReactNode;
  text: string;
  time: string;
}

export default function ActivityItem({ icon, text, time }: ActivityItemProps) {
  return (
    <div className={styles.activityItem}>
      <div className={styles.activityIcon}>{icon}</div>
      <div className={styles.activityContent}>
        <div className={styles.activityText}>{text}</div>
        <div className={styles.activityTime}>{time}</div>
      </div>
    </div>
  );
}

