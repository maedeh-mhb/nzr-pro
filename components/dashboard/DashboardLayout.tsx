"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import DashboardNav from "./DashboardNav";
import DashboardBottomNav from "./DashboardBottomNav";
import HomeSection from "./sections/HomeSection";
import OrdersSection from "./sections/OrdersSection";
import WalletSection from "./sections/WalletSection";
import ProfileSection from "./sections/ProfileSection";
import NotificationsSection from "./sections/NotificationsSection";
import WishlistSection from "./sections/WishlistSection";
import MessagesSection from "./sections/MessagesSection";
import CouponsSection from "./sections/CouponsSection";
import RewardsSection from "./sections/RewardsSection";
import styles from "@/styles/components/_dashboard.module.scss";

export default function DashboardLayout() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [activeSection, setActiveSection] = useState(sectionParam || "home");
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0); // Trigger for profile updates

  // Handle profile update callback from ProfileSection
  const handleProfileUpdate = () => {
    // Trigger a refetch in HomeSection by incrementing this counter
    setProfileUpdateTrigger(prev => prev + 1);
  };

  // Update active section when URL parameter changes
  useEffect(() => {
    if (sectionParam) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam]);


  return (
    <div className={styles.dashboardPage}>
      <DashboardNav activeSection={activeSection} setActiveSection={setActiveSection} />
      <Navbar dashboardDesktopOnly />

      <div className={styles.dashboardContainer}>
        <div className={`${styles.section} ${activeSection === "home" ? styles.active : ""}`}>
          <HomeSection setActiveSection={setActiveSection} refetchTrigger={profileUpdateTrigger} />
        </div>

        <div className={`${styles.section} ${activeSection === "orders" ? styles.active : ""}`}>
          <OrdersSection setActiveSection={setActiveSection} />
        </div>

        <div className={`${styles.section} ${activeSection === "wallet" ? styles.active : ""}`}>
          <WalletSection setActiveSection={setActiveSection} />
        </div>

        <div className={`${styles.section} ${activeSection === "profile" ? styles.active : ""}`}>
          <ProfileSection setActiveSection={setActiveSection} onProfileUpdate={handleProfileUpdate} />
        </div>

        <div className={`${styles.section} ${activeSection === "notifications" ? styles.active : ""}`}>
          <NotificationsSection setActiveSection={setActiveSection} />
        </div>

        <div className={`${styles.section} ${activeSection === "wishlist" ? styles.active : ""}`}>
          <WishlistSection setActiveSection={setActiveSection} />
        </div>

        <div className={`${styles.section} ${activeSection === "messages" ? styles.active : ""}`}>
          <MessagesSection setActiveSection={setActiveSection} />
        </div>

        <div className={`${styles.section} ${activeSection === "coupons" ? styles.active : ""}`}>
          <CouponsSection setActiveSection={setActiveSection} isActive={activeSection === "coupons"} />
        </div>

        <div className={`${styles.section} ${activeSection === "rewards" ? styles.active : ""}`}>
          <RewardsSection setActiveSection={setActiveSection} />
        </div>
      </div>

      <DashboardBottomNav activeSection={activeSection} setActiveSection={setActiveSection} />
    </div>
  );
}
