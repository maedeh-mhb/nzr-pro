"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiEdit2, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";
import StatusBadge from "./StatusBadge";
import Button from "@/components/ui/Button";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import tableStyles from "@/styles/components/_adminTable.module.scss";
import styles from "@/styles/components/_adminUserCard.module.scss";

interface UserAddress {
  id: string;
  name: string;
  address: string;
  provinceId: number;
  cityId: number;
  postalCode: string;
  country: string;
  isDefault: boolean | null;
}

interface User {
  id: string;
  name: string | null;
  surname: string | null;
  email: string;
  phone: string | null;
  role: "user" | "admin" | "superadmin";
  emailVerified: Date | null;
  phoneVerified: Date | null;
  // Individual address fields (for display)
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  // Address array (for compatibility with UsersSection)
  addresses: UserAddress[];
  createdAt: Date | null;
  updatedAt: Date | null;
}
interface UserCardProps {
  user: User;
  index: number;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export default function UserCard({ user, index, onEdit, onDelete }: UserCardProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={styles.userCard}>
      <div className={styles.cardHeader} onClick={toggleExpand}>
        <div className={styles.cardHeaderContent}>
          <span className={styles.cardIndex}>#{index}</span>
          <span className={styles.cardName}>
            {user.name || ""} {user.surname || ""}
          </span>
        </div>
        <div className={styles.cardToggle}>
          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </div>
      
      {isExpanded && (
        <div className={styles.cardDetails}>
          <div className={styles.expandedSection}>
            <h4 className={styles.expandedSectionTitle}>{t("Personal Information", "اطلاعات شخصی")}</h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Name", "نام")}:</span>
              <span className={styles.detailValue}>{user.name || t("N/A", "نامشخص")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Surname", "نام خانوادگی")}:</span>
              <span className={styles.detailValue}>{user.surname || t("N/A", "نامشخص")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Email", "ایمیل")}:</span>
              <span className={styles.detailValue}>{user.email}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Phone", "تلفن")}:</span>
              <span className={styles.detailValue}>{user.phone || t("N/A", "نامشخص")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Role", "نقش")}:</span>
              <span className={styles.detailValue}>
                {user.role === "superadmin" ? t("Super Admin", "سوپر ادمین") : user.role === "admin" ? t("Admin", "مدیر") : t("User", "کاربر")}
              </span>
            </div>
          </div>
          
          <div className={styles.expandedSection}>
            <h4 className={styles.expandedSectionTitle}>{t("Verification Status", "وضعیت تایید")}</h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Email Verified", "ایمیل تایید شده")}:</span>
              <span className={styles.detailValue}>
                <StatusBadge
                  status={user.emailVerified ? "active" : "pending"}
                  label={user.emailVerified ? t("Yes", "بله") : t("No", "خیر")}
                />
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Phone Verified", "تلفن تایید شده")}:</span>
              <span className={styles.detailValue}>
                <StatusBadge
                  status={user.phoneVerified ? "active" : "pending"}
                  label={user.phoneVerified ? t("Yes", "بله") : t("No", "خیر")}
                />
              </span>
            </div>
          </div>
          
          {(user.createdAt || user.updatedAt) && (
            <div className={styles.expandedSection}>
              <h4 className={styles.expandedSectionTitle}>{t("Account Information", "اطلاعات حساب")}</h4>
              {user.createdAt && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("Member Since", "عضو از")}:</span>
                  <span className={styles.detailValue}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {user.updatedAt && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("Last Updated", "آخرین به‌روزرسانی")}:</span>
                  <span className={styles.detailValue}>
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className={styles.expandedSection}>
            <h4 className={styles.expandedSectionTitle}>{t("Address", "آدرس")}</h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Address", "آدرس")}:</span>
              <span className={styles.detailValue}>{user.address || t("N/A", "نامشخص")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("City", "شهر")}:</span>
              <span className={styles.detailValue}>{user.city || t("N/A", "نامشخص")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("State/Province", "استان")}:</span>
              <span className={styles.detailValue}>{user.state || t("N/A", "نامشخص")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Post Code", "کد پستی")}:</span>
              <span className={styles.detailValue}>{user.zipCode || t("N/A", "نامشخص")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("Country", "کشور")}:</span>
              <span className={styles.detailValue}>{user.country || t("N/A", "نامشخص")}</span>
            </div>
          </div>
          <div className={styles.cardActions}>
            <Button
              variant="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(user);
              }}
              title={t("Edit", "ویرایش")}
            >
              <FiEdit2 />
              <span>{t("Edit", "ویرایش")}</span>
            </Button>
            <Button
              variant="danger"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(user);
              }}
              title={t("Delete", "حذف")}
            >
              <FiTrash2 />
              <span>{t("Delete", "حذف")}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

