"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/utils/language";
import { isPersianName } from "@/lib/utils/nameValidation";
import toast from "react-hot-toast";
import { FiUser, FiMapPin, FiHome, FiBriefcase, FiArrowLeft, FiCheck, FiX, FiEdit2, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/Button";
import AddressForm from "@/components/dashboard/AddressForm";
import AddressCard from "@/components/dashboard/AddressCard";
import PhoneVerification from "@/components/phone/PhoneVerification";
import EmailVerification from "@/components/email/EmailVerification";
import SkeletonLoader from "../SkeletonLoader";
import EmptyState from "../EmptyState";
import styles from "@/styles/components/_dashboard.module.scss";

interface ProfileSectionProps {
  setActiveSection: (section: string) => void;
  onProfileUpdate?: () => void; // Callback to notify parent when profile is updated
}

interface UserProfile {
  name: string;
  surname: string | null;
  email: string;
  phone: string | null;
  emailVerified: Date | string | null;
  phoneVerified: Date | string | null;
  createdAt: Date | string;
}

interface Address {
  id: string;
  name: string;
  provinceId: number;
  cityId: number;
  address: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export default function ProfileSection({ setActiveSection, onProfileUpdate }: ProfileSectionProps) {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setFormData({
            name: data.name || "",
            surname: data.surname || "",
            email: data.email || "",
            phone: data.phone || "",
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch profile:", response.status, errorData);
          // Don't show error to user, just log it
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Don't show error to user, just log it
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [session]);


  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await fetch("/api/user/addresses");
        if (response.ok) {
          const data = await response.json();
          setAddresses(data.addresses || []);
        } else {
          console.error("Failed to fetch addresses");
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, []);

  const handleAddAddress = () => {
    setEditingAddress(null);
    setIsAddressFormOpen(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsAddressFormOpen(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm(t("Are you sure you want to delete this address?", "آیا مطمئن هستید که می‌خواهید این آدرس را حذف کنید؟"))) {
      return;
    }

    try {
      const response = await fetch(`/api/user/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      toast.success(t("Address deleted successfully", "آدرس با موفقیت حذف شد"));
      // Refresh addresses
      const refreshResponse = await fetch("/api/user/addresses");
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setAddresses(data.addresses || []);
      }
    } catch (error: any) {
      console.error("Error deleting address:", error);
      toast.error(t("Failed to delete address", "خطا در حذف آدرس"));
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const response = await fetch(`/api/user/addresses/${addressId}/set-default`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("Failed to set default address");
      }

      toast.success(t("Default address updated", "آدرس پیش‌فرض به‌روزرسانی شد"));
      // Refresh addresses
      const refreshResponse = await fetch("/api/user/addresses");
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setAddresses(data.addresses || []);
      }
    } catch (error: any) {
      console.error("Error setting default address:", error);
      toast.error(t("Failed to set default address", "خطا در تعیین آدرس پیش‌فرض"));
    }
  };

  const handleAddressSuccess = async () => {
    // Refresh addresses
    const response = await fetch("/api/user/addresses");
    if (response.ok) {
      const data = await response.json();
      setAddresses(data.addresses || []);
    }
  };


  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        surname: profile.surname || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t("Name is required", "نام الزامی است"));
      return;
    }

    if (!isPersianName(formData.name)) {
      toast.error(t("Please enter your name in Persian", "نام خود را به فارسی وارد کنید"));
      return;
    }

    if (!formData.surname.trim()) {
      toast.error(t("Family name is required", "نام خانوادگی الزامی است"));
      return;
    }

    if (!isPersianName(formData.surname)) {
      toast.error(
        t("Please enter your family name in Persian", "نام خانوادگی خود را به فارسی وارد کنید")
      );
      return;
    }

    // Prevent email change if already verified
    if (profile?.emailVerified && formData.email !== profile.email) {
      toast.error(t("Email address cannot be changed once verified", "ایمیل پس از تأیید قابل تغییر نیست"));
      return;
    }

    // Email is optional, but validate it when provided.
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast.error(t("Invalid email format", "فرمت ایمیل نامعتبر است"));
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          surname: formData.surname.trim() || null,
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "Email already in use") {
          toast.error(t("Email already in use", "این ایمیل قبلاً استفاده شده است"));
          return;
        }
        throw new Error(errorData.error || t("Failed to update profile", "خطا در به‌روزرسانی پروفایل"));
      }

      const data = await response.json();
      setProfile({
        name: data.name,
        surname: data.surname,
        email: data.email || "",
        phone: data.phone,
        emailVerified: data.emailVerified,
        phoneVerified: data.phoneVerified,
        createdAt: data.createdAt,
      });
      setIsEditing(false);
      toast.success(t("Profile updated successfully", "پروفایل با موفقیت به‌روزرسانی شد"));
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || t("Failed to update profile", "خطا در به‌روزرسانی پروفایل"));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <>
      <button
        className={styles.backButton}
        onClick={() => setActiveSection("home")}
      >
        <FiArrowLeft />
        <span>{t("Back to Dashboard", "بازگشت به داشبورد")}</span>
      </button>
      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiUser /></span>
            <span>{t("Account Information", "اطلاعات حساب")}</span>
          </h3>
        </div>
        {loading ? (
          <SkeletonLoader type="card" />
        ) : (
          <div className={styles.accountInfoGrid}>
            <div className={styles.orderItem}>
              <div className={styles.orderProduct}>{t("Name", "نام")}</div>
              {isEditing ? (
                <div className={styles.profileFieldInput}>
                  <input
                    type="text"
                    className={styles.profileInput}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("Name", "نام")}
                    aria-invalid={!!formData.name && !isPersianName(formData.name)}
                  />
                  {!!formData.name && !isPersianName(formData.name) && (
                    <p className={styles.profileNameError}>
                      {t("Please enter your name in Persian", "نام خود را به فارسی وارد کنید")}
                    </p>
                  )}
                </div>
              ) : (
                <div className={styles.orderDate}>{profile?.name || "N/A"}</div>
              )}
            </div>
            <div className={styles.orderItem}>
              <div className={styles.orderProduct}>{t("Surname", "نام خانوادگی")}</div>
              {isEditing ? (
                <div className={styles.profileFieldInput}>
                  <input
                    type="text"
                    className={styles.profileInput}
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    placeholder={t("Surname", "نام خانوادگی")}
                    aria-invalid={!!formData.surname && !isPersianName(formData.surname)}
                  />
                  {!!formData.surname && !isPersianName(formData.surname) && (
                    <p className={styles.profileNameError}>
                      {t("Please enter your family name in Persian", "نام خانوادگی خود را به فارسی وارد کنید")}
                    </p>
                  )}
                </div>
              ) : (
                <div className={styles.orderDate}>{profile?.surname || "N/A"}</div>
              )}
            </div>
            {isEditing && (
              <p className={styles.profileNameHint}>
                {t(
                  "Please write your full first and family names in Persian",
                  "نام و نام خانوادگی خود را به صورت کامل و به فارسی بنویسید"
                )}
              </p>
            )}
            <div className={styles.orderItem}>
              <div className={styles.orderProduct}>{t("Email", "ایمیل")}</div>
              {isEditing ? (
                <input
                  type="email"
                  className={styles.profileInput}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("Email", "ایمیل")}
                  disabled={!!profile?.emailVerified}
                  title={profile?.emailVerified ? t("Email cannot be changed once verified", "ایمیل پس از تأیید قابل تغییر نیست") : ""}
                />
              ) : (
                <div className={styles.orderDate}>
                  <>
                    {profile?.email || "N/A"}
                    {profile?.emailVerified ? (
                      <span className={styles.verifiedBadge}>
                        <FiCheck /> {t("Verified", "تأیید شده")}
                      </span>
                    ) : (
                      <>
                        <span className={styles.notVerifiedBadge}>
                          <FiX /> {t("Not Verified", "تأیید نشده")}
                        </span>
                        <a
                          href="#"
                          className={styles.verifyLink}
                          onClick={(e) => {
                            e.preventDefault();
                            setShowEmailVerification(!showEmailVerification);
                          }}
                        >
                          {t("Verify Now", "تأیید کنید")}
                        </a>
                      </>
                    )}
                  </>
                </div>
              )}
            </div>
            <div className={styles.orderItem}>
              <div className={styles.orderProduct}>{t("Phone", "تلفن")}</div>
              {isEditing ? (
                <input
                  type="tel"
                  className={styles.profileInput}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t("Phone", "تلفن")}
                />
              ) : (
                <div className={styles.orderDate}>
                  <>
                    {profile?.phone || "N/A"}
                    {profile?.phoneVerified ? (
                      <span className={styles.verifiedBadge}>
                        <FiCheck /> {t("Verified", "تأیید شده")}
                      </span>
                    ) : (
                      <>
                        <span className={styles.notVerifiedBadge}>
                          <FiX /> {t("Not Verified", "تأیید نشده")}
                        </span>
                        <a
                          href="#"
                          className={styles.verifyLink}
                          onClick={(e) => {
                            e.preventDefault();
                            setShowPhoneVerification(!showPhoneVerification);
                          }}
                        >
                          {t("Verify Now", "تأیید کنید")}
                        </a>
                      </>
                    )}
                  </>
                </div>
              )}
            </div>

            {/* Phone Verification Component */}
            {showPhoneVerification && !profile?.phoneVerified && (
              <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                <PhoneVerification
                  phone={profile?.phone || null}
                  onVerified={async () => {
                    // Refresh profile data
                    try {
                      const response = await fetch("/api/user/profile");
                      if (response.ok) {
                        const data = await response.json();
                        setProfile(data);
                        setShowPhoneVerification(false);
                        // Notify parent to refetch completeness
                        onProfileUpdate?.();
                      }
                    } catch (error) {
                      console.error("Error refreshing profile:", error);
                    }
                  }}
                />
              </div>
            )}

            {/* Email Verification Component */}
            {showEmailVerification && !profile?.emailVerified && (
              <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                <EmailVerification
                  email={profile?.email || null}
                  onVerified={async () => {
                    // Refresh profile data
                    try {
                      const response = await fetch("/api/user/profile");
                      if (response.ok) {
                        const data = await response.json();
                        setProfile(data);
                        setShowEmailVerification(false);
                        // Notify parent to refetch completeness
                        onProfileUpdate?.();
                      }
                    } catch (error) {
                      console.error("Error refreshing profile:", error);
                    }
                  }}
                />
              </div>
            )}

            <div className={`${styles.orderItem} ${styles.joinedItem}`}>
              <div className={styles.orderProduct}>{t("Joined", "عضویت")}</div>
              <div className={styles.orderDate}>{formatDate(profile?.createdAt || null)}</div>
            </div>
          </div>
        )}
        {isEditing ? (
          <div className={styles.profileActions}>
            <Button
              variant="outline"
              className={styles.profileActionBtn}
              onClick={handleCancel}
              disabled={saving}
            >
              {t("Cancel", "لغو")}
            </Button>
            <Button
              variant="primary"
              className={`${styles.profileActionBtn} ${styles.saveButton}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t("Saving...", "در حال ذخیره...") : t("Save", "ذخیره")}
            </Button>
          </div>
        ) : (
          <Button variant="primary" className={styles.editProfileButton} onClick={handleEdit}>
            <FiEdit2 />
            {t("Edit Profile", "ویرایش پروفایل")}
          </Button>
        )}
      </div>

      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiMapPin /></span>
            <span>{t("Saved Addresses", "آدرس‌های ذخیره شده")}</span>
          </h3>
          <a
            href="#"
            className={styles.cardAction}
            onClick={(e) => {
              e.preventDefault();
              handleAddAddress();
            }}
          >
            {t("Add New Address", "افزودن آدرس جدید")}
          </a>
        </div>
        <AddressForm
          isOpen={isAddressFormOpen}
          onClose={() => {
            setIsAddressFormOpen(false);
            setEditingAddress(null);
          }}
          onSuccess={handleAddressSuccess}
          address={editingAddress}
        />
        {loadingAddresses ? (
          <SkeletonLoader type="list" count={2} />
        ) : addresses.length === 0 && !isAddressFormOpen ? (
          <EmptyState
            icon={<FiMapPin />}
            title={t("No Addresses Saved", "هیچ آدرسی ذخیره نشده")}
            titleFa="هیچ آدرسی ذخیره نشده"
            description={t("Add your first address to make checkout faster", "اولین آدرس خود را اضافه کنید تا تسویه حساب سریع‌تر شود")}
            descriptionFa="اولین آدرس خود را اضافه کنید تا تسویه حساب سریع‌تر شود"
            action={{
              label: t("Add Address", "افزودن آدرس"),
              labelFa: "افزودن آدرس",
              onClick: handleAddAddress
            }}
          />
        ) : (
          addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => handleEditAddress(address)}
              onDelete={() => handleDeleteAddress(address.id)}
              onSetDefault={() => handleSetDefaultAddress(address.id)}
              t={t}
            />
          ))
        )}
      </div>

    </>
  );
}
