"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";
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

interface UserProfile {
  name: string;
  surname: string | null;
  email: string;
}

export default function DashboardLayout() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [activeSection, setActiveSection] = useState(sectionParam || "home");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0); // Trigger for profile updates

  const user = session?.user;

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setUserProfile({
            name: data.name,
            surname: data.surname,
            email: data.email,
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  // Refresh profile when user navigates to profile section (after potential updates)
  useEffect(() => {
    if (activeSection === "profile") {
      const fetchProfile = async () => {
        try {
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const data = await response.json();
            setUserProfile({
              name: data.name,
              surname: data.surname,
              email: data.email,
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      };
      fetchProfile();
    }
  }, [activeSection]);

  // Get display name (name + surname if available)
  const displayName = userProfile
    ? userProfile.surname
      ? `${userProfile.name} ${userProfile.surname}`
      : userProfile.name
    : user?.name || "User";

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <DashboardNav activeSection={activeSection} setActiveSection={setActiveSection} />

      <div className={styles.userHeader}>
        <div className={styles.userAvatar}>
          {displayName !== "User" ? getInitials(displayName) : "U"}
        </div>
        <div className={styles.userInfo}>
          <h2 className={styles.userName}>{displayName}</h2>
          <p className={styles.userEmail}>{userProfile?.email || user?.email}</p>
        </div>
      </div>

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
    </>
  );
}
