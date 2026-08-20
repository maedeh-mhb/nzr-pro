"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/utils/language";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FiBarChart2,
  FiUsers,
  FiShoppingBag,
  FiPackage,
  FiFileText,
  FiSettings,
  FiLogOut,
  FiMail,
  FiMessageSquare,
  FiLayers,
  FiStar,
  FiDollarSign,
  FiChevronDown,
  FiChevronRight,
  FiChevronLeft,
  FiMoreVertical,
  FiShield,
  FiActivity,
  FiMonitor,
  FiTruck,
} from "react-icons/fi";
import styles from "@/styles/components/_adminSidebar.module.scss";

interface AdminSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

interface MenuItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  defaultExpanded?: boolean;
}

interface SectionCounts {
  users: number;
  orders: number;
  products: number;
  contactMessages: number;
  reviews: number;
  refunds: number;
}

export default function AdminSidebar({ activeSection, setActiveSection }: AdminSidebarProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [sectionCounts, setSectionCounts] = useState<SectionCounts | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["main", "settings"]));
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Fetch section counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await fetch("/api/admin/section-counts");
        if (response.ok) {
          const data = await response.json();
          setSectionCounts(data.counts);
        }
      } catch (error) {
        console.error("Error fetching section counts:", error);
      }
    };

    fetchCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Get the document direction
      const isRTL = document.documentElement.dir === "rtl";
      const newWidth = isRTL
        ? window.innerWidth - e.clientX
        : e.clientX;

      // Constrain width between 200px and 400px
      const constrainedWidth = Math.max(200, Math.min(400, newWidth));
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("adminSidebarCollapsed");
    if (savedCollapsed === "true") {
      setIsCollapsed(true);
    }
    const savedWidth = localStorage.getItem("adminSidebarWidth");
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // Save collapsed state and width to localStorage
  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", isCollapsed.toString());
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem("adminSidebarWidth", sidebarWidth.toString());
  }, [sidebarWidth]);

  // Set CSS variable for sidebar width
  useEffect(() => {
    const width = isCollapsed ? 60 : sidebarWidth;
    document.documentElement.style.setProperty("--admin-sidebar-width", `${width}px`);
  }, [isCollapsed, sidebarWidth]);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/admin" });
    router.push("/login");
    router.refresh();
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set<string>();
      // If the group is already expanded, collapse it (empty set)
      // Otherwise, only expand this group (set with only this groupId)
      if (!prev.has(groupId)) {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const menuGroups: MenuGroup[] = [
    {
      id: "main",
      label: t("Main", "اصلی"),
      icon: FiBarChart2,
      items: [
        { id: "dashboard", icon: FiBarChart2, label: t("Dashboard", "داشبورد") },
        { id: "analytics", icon: FiBarChart2, label: t("Analytics", "آمار") },
      ],
      defaultExpanded: true,
    },
    {
      id: "management",
      label: t("Management", "مدیریت"),
      icon: FiUsers,
      items: [
        {
          id: "users",
          icon: FiUsers,
          label: t("Users", "کاربران"),
          badge: sectionCounts?.users,
        },
        {
          id: "products",
          icon: FiShoppingBag,
          label: t("Products", "محصولات"),
          badge: sectionCounts?.products,
        },
        { id: "inventory", icon: FiLayers, label: t("Inventory", "موجودی") },
        {
          id: "orders",
          icon: FiPackage,
          label: t("Orders", "سفارشات"),
          badge: sectionCounts?.orders,
        },
        {
          id: "sellers",
          icon: FiTruck,
          label: t("Sellers", "فروشندگان"),
        },
      ],
      defaultExpanded: true,
    },
    {
      id: "customer-service",
      label: t("Customer Service", "خدمات مشتری"),
      icon: FiMessageSquare,
      items: [
        {
          id: "contactMessages",
          icon: FiMessageSquare,
          label: t("Contact Messages", "پیام‌های تماس"),
          badge: sectionCounts?.contactMessages,
        },
        {
          id: "reviews",
          icon: FiStar,
          label: t("Reviews", "نظرات"),
          badge: sectionCounts?.reviews,
        },
        {
          id: "refunds",
          icon: FiDollarSign,
          label: t("Refunds", "بازپرداخت‌ها"),
          badge: sectionCounts?.refunds,
        },
      ],
      defaultExpanded: true,
    },
    {
      id: "content",
      label: t("Content", "محتوا"),
      icon: FiFileText,
      items: [
        { id: "content", icon: FiFileText, label: t("How to Use", "نحوه استفاده") },
        { id: "homeNote", icon: FiFileText, label: t("Home Note", "یادداشت صفحه اصلی") },
      ],
      defaultExpanded: true,
    },
    {
      id: "settings",
      label: t("Settings", "تنظیمات"),
      icon: FiSettings,
      items: [
        { id: "settings", icon: FiSettings, label: t("Settings", "تنظیمات") },
        { id: "contactSettings", icon: FiMail, label: t("Contact Settings", "تنظیمات تماس") },
      ],
      defaultExpanded: true,
    },
    {
      id: "admin-tools",
      label: t("Admin Tools", "ابزارهای مدیریت"),
      icon: FiShield,
      items: [
        { id: "auditTrail", icon: FiActivity, label: t("Audit Trail", "سوابق حسابرسی") },
        { id: "permissions", icon: FiShield, label: t("Permissions & Roles", "مجوزها و نقش‌ها") },
        { id: "systemHealth", icon: FiMonitor, label: t("System Health", "وضعیت سیستم") },
      ],
      defaultExpanded: false,
    },
  ];

  return (
    <aside
      ref={sidebarRef}
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}
      style={{ width: isCollapsed ? "60px" : `${sidebarWidth}px` }}
    >
      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          ref={resizeHandleRef}
          className={styles.resizeHandle}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          <FiMoreVertical />
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        className={styles.collapseToggle}
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? t("Expand sidebar", "باز کردن منو") : t("Collapse sidebar", "بستن منو")}
      >
        {(() => {
          const isRTL = language === "fa" || document.documentElement.dir === "rtl";
          if (isRTL) {
            // In RTL: collapsed shows left arrow (←) to expand, expanded shows right arrow (→) to collapse
            return isCollapsed ? <FiChevronLeft /> : <FiChevronRight />;
          } else {
            // In LTR: collapsed shows right arrow (→) to expand, expanded shows left arrow (←) to collapse
            return isCollapsed ? <FiChevronRight /> : <FiChevronLeft />;
          }
        })()}
      </button>

      {!isCollapsed && (
        <>
          <ul className={styles.sidebarList}>
            {menuGroups.map((group) => {
              const GroupIcon = group.icon;
              const isExpanded = expandedGroups.has(group.id);

              return (
                <li key={group.id} className={styles.sidebarGroup}>
                  <button
                    className={styles.groupHeader}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <GroupIcon />
                    <span className={styles.groupLabel}>{group.label}</span>
                    {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {isExpanded && (
                    <ul className={styles.groupItems}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                          <li key={item.id} className={styles.sidebarItem}>
                            <button
                              className={`${styles.sidebarLink} ${isActive ? styles.active : ""}`}
                              onClick={() => setActiveSection(item.id)}
                            >
                              <Icon />
                              <span className={styles.linkLabel}>{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className={styles.badge}>{item.badge}</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className={styles.logoutButton}>
            <button className={styles.logoutLink} onClick={handleLogout}>
              <FiLogOut />
              <span>{t("Logout", "خروج")}</span>
            </button>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className={styles.collapsedMenu}>
          {menuGroups.map((group) => {
            // Show only the first item from each group (top-level option)
            const firstItem = group.items[0];
            if (!firstItem) return null;

            const Icon = firstItem.icon;
            const isActive = activeSection === firstItem.id;
            return (
              <button
                key={group.id}
                className={`${styles.collapsedLink} ${isActive ? styles.active : ""}`}
                onClick={() => setActiveSection(firstItem.id)}
                title={firstItem.label}
              >
                <Icon />
                {firstItem.badge !== undefined && firstItem.badge > 0 && (
                  <span className={styles.collapsedBadge}>{firstItem.badge}</span>
                )}
              </button>
            );
          })}
          <div className={styles.collapsedLogout}>
            <button className={styles.collapsedLogoutLink} onClick={handleLogout} title={t("Logout", "خروج")}>
              <FiLogOut />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

