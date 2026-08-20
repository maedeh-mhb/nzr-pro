"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/utils/language";
import toast from "react-hot-toast";
import {
  FiPackage,
  FiHeart,
  FiGift,
  FiZap,
  FiShoppingBag,
  FiMessageSquare,
  FiUser,
  FiMessageCircle,
  FiTag,
  FiAward,
  FiShare2,
  FiShoppingCart
} from "react-icons/fi";
import { useCart } from "@/lib/contexts/CartContext";
import { formatPrice } from "@/lib/utils/formatPrice";
import Link from "next/link";
import RecentActivitySection from "./RecentActivitySection";
import SkeletonLoader from "../SkeletonLoader";
import AnimatedCounter from "../AnimatedCounter";
import styles from "@/styles/components/_dashboard.module.scss";

interface HomeSectionProps {
  setActiveSection: (section: string) => void;
  refetchTrigger?: number; // Trigger to refetch completeness data when profile updates
}

interface DashboardStats {
  orders: number;
  wishlist: number;
  points: number;
  messages: number;
}

interface ProfileCompleteness {
  percentage: number;
  checks: {
    firstName: boolean;
    lastName: boolean;
    phoneVerified: boolean;
    email: boolean;
    completeAddress: boolean;
  };
  missingItems: string[];
  emailVerified: boolean;
}

interface ExclusiveLink {
  id: string;
  nameEn: string;
  nameFa: string;
  url: string;
  icon: string | null;
}

export default function HomeSection({ setActiveSection, refetchTrigger }: HomeSectionProps) {
  const { data: session } = useSession();
  const { t, language, currency } = useLanguage();
  const router = useRouter();
  const { items, getTotalPrice, isLoading: cartLoading } = useCart();
  const [stats, setStats] = useState<DashboardStats>({
    orders: 0,
    wishlist: 0,
    points: 0,
    messages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loadingCompleteness, setLoadingCompleteness] = useState(true);
  const [exclusiveLinks, setExclusiveLinks] = useState<ExclusiveLink[]>([]);
  const [loadingExclusiveLinks, setLoadingExclusiveLinks] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        } else {
          console.error("Failed to fetch dashboard stats");
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchCompleteness = async () => {
      try {
        const response = await fetch("/api/user/profile/completeness");
        if (response.ok) {
          const data = await response.json();
          setCompleteness(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch profile completeness:", response.status, errorData);
          // Don't show error to user, just log it
        }
      } catch (error) {
        console.error("Error fetching profile completeness:", error);
        // Don't show error to user, just log it
      } finally {
        setLoadingCompleteness(false);
      }
    };

    if (session?.user) {
      fetchCompleteness();
    } else {
      setLoadingCompleteness(false);
    }
  }, [session, refetchTrigger]);

  useEffect(() => {
    const fetchExclusiveLinks = async () => {
      try {
        const response = await fetch("/api/social-links");
        if (response.ok) {
          const data = await response.json();
          // Get links from the public endpoint
          if (data && data.links && Array.isArray(data.links)) {
            setExclusiveLinks(data.links);
          }
        } else {
          console.error("Failed to fetch exclusive links");
        }
      } catch (error) {
        console.error("Error fetching exclusive links:", error);
      } finally {
        setLoadingExclusiveLinks(false);
      }
    };

    fetchExclusiveLinks();
  }, []);

  return (
    <>
      <div className={styles.statsGrid}>
        {loading ? (
          <>
            <SkeletonLoader type="statCard" count={4} />
          </>
        ) : (
          <>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiPackage />
              </div>
              <div className={styles.statValue}>
                <AnimatedCounter value={stats.orders} />
              </div>
              <div className={styles.statLabel}>{t("Orders", "سفارشات")}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiHeart />
              </div>
              <div className={styles.statValue}>
                <AnimatedCounter value={stats.wishlist} />
              </div>
              <div className={styles.statLabel}>{t("Wishlist", "علاقه‌مندی")}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiGift />
              </div>
              <div className={styles.statValue}>
                <AnimatedCounter value={stats.points} />
              </div>
              <div className={styles.statLabel}>{t("Points", "امتیاز")}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiMessageSquare />
              </div>
              <div className={styles.statValue}>
                <AnimatedCounter value={stats.messages} />
              </div>
              <div className={styles.statLabel}>{t("Messages", "پیام‌ها")}</div>
            </div>
          </>
        )}
      </div>

      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiUser /></span>
            <span>{t("Profile Completeness", "تکمیل پروفایل")}</span>
          </h3>
        </div>
        <div className={styles.profileCompleteness}>
          <div className={styles.completenessInfo}>
            <span className={styles.completenessPercentage}>
              {loadingCompleteness ? "..." : `${completeness?.percentage || 0}%`}
            </span>
            <span className={styles.completenessLabel}>{t("Complete", "تکمیل شده")}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: loadingCompleteness ? "0%" : `${completeness?.percentage || 0}%`,
              }}
            ></div>
          </div>
          <button
            className={styles.completenessBtn}
            onClick={() => setActiveSection("profile")}
          >
            {t("Complete Profile", "تکمیل پروفایل")}
          </button>
          <div className={styles.completenessNotes}>
            {loadingCompleteness ? (
              <div className={styles.notesLoading}>
                {t("Loading...", "در حال بارگذاری...")}
              </div>
            ) : completeness ? (
              completeness.missingItems.length > 0 ? (
                <>
                  <div className={styles.notesTitle}>
                    {t("To complete your profile:", "برای تکمیل پروفایل خود:")}
                  </div>
                  <ul className={styles.notesList}>
                    {completeness.missingItems.includes("firstName") && (
                      <li>{t("Add your first name", "نام خود را اضافه کنید")}</li>
                    )}
                    {completeness.missingItems.includes("lastName") && (
                      <li>{t("Add your last name", "نام خانوادگی خود را اضافه کنید")}</li>
                    )}
                    {completeness.missingItems.includes("phoneVerified") && (
                      <li>{t("Verify your phone number", "شماره تلفن خود را تأیید کنید")}</li>
                    )}
                    {completeness.missingItems.includes("email") && (
                      <li>{t("Add your email address", "آدرس ایمیل خود را اضافه کنید")}</li>
                    )}
                    {completeness.missingItems.includes("completeAddress") && (
                      <li>
                        {t(
                          "Add a complete address (province, city, address, postal code)",
                          "یک آدرس کامل اضافه کنید (استان، شهر، آدرس، کد پستی)"
                        )}
                      </li>
                    )}
                  </ul>
                </>
              ) : (
                <div className={styles.notesComplete}>
                  {t("All profile items are complete!", "همه موارد پروفایل تکمیل شده است!")}
                </div>
              )
            ) : (
              <div className={styles.notesError}>
                {t("Unable to load profile status", "نمی‌توان وضعیت پروفایل را بارگذاری کرد")}
              </div>
            )}
          </div>
          {!loadingCompleteness && completeness && !completeness.emailVerified && (
            <div className={styles.emailWarning}>
              <strong>{t("Important:", "مهم:")}</strong>{" "}
              {t(
                "If you don't verify your email, you will not be able to recover your forgotten password.",
                "اگر ایمیل خود را تأیید نکنید، نمی‌توانید رمز عبور فراموش شده خود را بازیابی کنید."
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiShare2 /></span>
            <span>{t("Your Exclusive Links", "لینک‌های انحصاری شما")}</span>
          </h3>
        </div>
        <div className={styles.exclusiveLinksContainer}>
          {loadingExclusiveLinks ? (
            <p className={styles.exclusiveLinksDescription}>
              {t("Loading...", "در حال بارگذاری...")}
            </p>
          ) : exclusiveLinks && exclusiveLinks.length > 0 ? (
            <div className={styles.exclusiveLinksList}>
              {exclusiveLinks.map((link) => {
                const displayName = language === "fa" && link.nameFa ? link.nameFa : link.nameEn;
                // Check if icon is a valid URL (starts with http:// or https:// or /)
                const isValidIconUrl = link.icon && (
                  link.icon.startsWith('http://') ||
                  link.icon.startsWith('https://') ||
                  link.icon.startsWith('/')
                );

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.exclusiveLinksItem}
                    title={displayName}
                  >
                    {isValidIconUrl && link.icon && (
                      <img src={link.icon} alt={displayName} className={styles.exclusiveLinksIcon} />
                    )}
                    <span className={styles.exclusiveLinksName}>{displayName}</span>
                    <FiShare2 className={styles.exclusiveLinksArrow} />
                  </a>
                );
              })}
            </div>
          ) : (
            <p className={styles.exclusiveLinksDescription}>
              {t("No exclusive links available yet", "هیچ لینک انحصاری در دسترس نیست")}
            </p>
          )}
        </div>
      </div>

      {/* Active Cart Section */}
      {items.length > 0 && (
        <div className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <span><FiShoppingCart /></span>
              <span>{t("Active Cart", "سبد خرید فعال")}</span>
            </h3>
          </div>
          <div className={styles.activeCart}>
            {cartLoading ? (
              <SkeletonLoader type="list" count={2} />
            ) : (
              <>
                <div className={styles.cartItems}>
                  {items.slice(0, 3).map((item) => {
                    const displayName = language === "fa" && item.nameFa ? item.nameFa : item.name;
                    return (
                      <div key={item.id} className={styles.cartItemRow}>
                        <span className={styles.cartItemName}>{displayName}</span>
                        <span className={styles.cartItemQuantity}>x{item.quantity}</span>
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <div className={styles.cartItemMore}>
                      {t("and {count} more items", `و ${items.length - 3} آیتم دیگر`)}
                    </div>
                  )}
                </div>
                <div className={styles.cartTotal}>
                  <span className={styles.cartTotalLabel}>{t("Total", "مجموع")}:</span>
                  <span className={styles.cartTotalPrice}>
                    {formatPrice(getTotalPrice(), language, currency ?? "toman")}
                  </span>
                </div>
                <Link href="/checkout" className={styles.continueCheckoutBtn}>
                  {t("Continue Checkout", "ادامه تسویه حساب")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiZap /></span>
            <span>{t("Quick Actions", "اقدامات سریع")}</span>
          </h3>
        </div>
        <div className={styles.quickActions}>
          <button
            className={styles.actionBtn}
            onClick={() => router.push("/products")}
          >
            <span className={styles.actionIcon}>
              <FiShoppingBag />
            </span>
            <span className={styles.actionLabel}>{t("Shop", "خرید")}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => setActiveSection("orders")}
          >
            <span className={styles.actionIcon}>
              <FiPackage />
            </span>
            <span className={styles.actionLabel}>{t("Orders", "سفارشات")}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => setActiveSection("profile")}
          >
            <span className={styles.actionIcon}>
              <FiUser />
            </span>
            <span className={styles.actionLabel}>{t("Profile", "پروفایل")}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => router.push("/contact")}
          >
            <span className={styles.actionIcon}>
              <FiMessageCircle />
            </span>
            <span className={styles.actionLabel}>{t("Support", "پشتیبانی")}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => setActiveSection("wishlist")}
          >
            <span className={styles.actionIcon}>
              <FiHeart />
            </span>
            <span className={styles.actionLabel}>{t("Wishlists", "لیست علاقه‌مندی")}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => setActiveSection("coupons")}
          >
            <span className={styles.actionIcon}>
              <FiTag />
            </span>
            <span className={styles.actionLabel}>{t("Coupons", "کوپن‌ها")}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => setActiveSection("rewards")}
          >
            <span className={styles.actionIcon}>
              <FiAward />
            </span>
            <span className={styles.actionLabel}>{t("Rewards", "پاداش‌ها")}</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => setActiveSection("messages")}
          >
            <span className={styles.actionIcon}>
              <FiMessageCircle />
            </span>
            <span className={styles.actionLabel}>{t("Messages", "پیام‌ها")}</span>
          </button>
        </div>
      </div>

      <RecentActivitySection />
    </>
  );
}
