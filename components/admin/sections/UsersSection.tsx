"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiUsers, FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { useSession } from "next-auth/react";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import DataTable from "../DataTable";
import UserCard from "../UserCard";
import EditUserModal from "../EditUserModal";
import StatusBadge from "../StatusBadge";
import Button from "@/components/ui/Button";
import Modal from "../Modal";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { FiUsers as EmptyIcon } from "react-icons/fi";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import tableStyles from "@/styles/components/_adminTable.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import UserAddresses from "../UserAddresses";
import styles from "@/styles/components/_admin.module.scss";

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
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  addresses: UserAddress[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default function UsersSection() {
  const { t } = useLanguage();
  const { data: session } = useSession();

  const LIMIT = 20;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canDeleteUsers, setCanDeleteUsers] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const checkDeletePermission = async () => {
      if (!session?.user?.id) {
        setCanDeleteUsers(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/permissions/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            permissionNames: ["delete_users"],
          }),
        });

        if (!response.ok) {
          setCanDeleteUsers(false);
          return;
        }

        const data = await response.json();
        setCanDeleteUsers(Boolean(data.hasPermission) || session.user.role === "superadmin");
      } catch {
        setCanDeleteUsers(false);
      }
    };

    checkDeletePermission();
  }, [session?.user?.id, session?.user?.role]);

  const buildUsersUrl = useCallback(
    (pageNumber: number) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNumber));
      params.set("limit", String(LIMIT));

      if (debouncedSearchQuery) {
        params.set("search", debouncedSearchQuery);
      }

      return `/api/admin/users?${params.toString()}`;
    },
    [debouncedSearchQuery]
  );

  const fetchUsers = useCallback(
    async (pageNumber: number, replace = false) => {
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;

      if (pageNumber === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      try {
        const response = await fetch(buildUsersUrl(pageNumber));

        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const fetchedUsers = data.data || data.users || [];
        const nextHasMore =
          typeof data.pagination?.hasNext === "boolean"
            ? data.pagination.hasNext
            : fetchedUsers.length >= LIMIT;

        setUsers((prev) => (replace ? fetchedUsers : [...prev, ...fetchedUsers]));
        setHasMore(nextHasMore);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        const errorMessage =
          err?.message || t("Failed to load users", "خطا در بارگذاری کاربران");
        setError(errorMessage);

        if (pageNumber === 1) {
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [LIMIT, buildUsersUrl, t]
  );

  useEffect(() => {
    setUsers([]);
    setPage(1);
    setHasMore(true);
    setExpandedUserId(null);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    fetchUsers(page, page === 1);
  }, [page, fetchUsers]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingMore &&
          !isFetchingRef.current
        ) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "250px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore]);

  const refreshUsersFromStart = useCallback(async () => {
    setUsers([]);
    setPage(1);
    setHasMore(true);
    await fetchUsers(1, true);
  }, [fetchUsers]);

  const handleEdit = (userOrRow: User | any) => {
    const original = users.find((u) => u.id === userOrRow.id) ?? userOrRow;
    setEditingUser(original);
    setIsEditUserModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (
      !confirm(
        t(
          `Are you sure you want to delete ${user.email}?`,
          `آیا مطمئن هستید کاربر ${user.email} حذف شود؟`
        )
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      toast.success(t("User deleted successfully", "کاربر با موفقیت حذف شد"));
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      toast.error(err.message || t("Failed to delete user", "خطا در حذف کاربر"));
    }
  };

  const handleSaveEdit = async (formData: any) => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      toast.success(t("User updated successfully", "کاربر با موفقیت به‌روزرسانی شد"));
      setIsEditUserModalOpen(false);
      setEditingUser(null);

      await refreshUsersFromStart();
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast.error(t("Failed to update user", "خطا در به‌روزرسانی کاربر"));
    }
  };

  const columns = useMemo(
    () => [
      { key: "index", label: t("#", "#") },
      {
        key: "name",
        label: t("Name", "نام"),
        render: (value: string, row: any) => (
          <span>
            {value || ""} {row.surname || ""}
          </span>
        ),
      },
      { key: "email", label: t("Email", "ایمیل") },
      { key: "phone", label: t("Phone", "تلفن") },
      {
        key: "role",
        label: t("Role", "نقش"),
        render: (value: string) => (
          <span style={{ textTransform: "capitalize" }}>
            {value === "superadmin"
              ? t("Super Admin", "سوپر ادمین")
              : value === "admin"
              ? t("Admin", "مدیر")
              : t("User", "کاربر")}
          </span>
        ),
      },
      {
        key: "emailVerified",
        label: t("Email Verified", "ایمیل تایید شده"),
        render: (value: Date | null) => (
          <StatusBadge
            status={value ? "active" : "pending"}
            label={value ? t("Yes", "بله") : t("No", "خیر")}
          />
        ),
      },
      {
        key: "phoneVerified",
        label: t("Phone Verified", "تلفن تایید شده"),
        render: (value: Date | null) => (
          <StatusBadge
            status={value ? "active" : "pending"}
            label={value ? t("Yes", "بله") : t("No", "خیر")}
          />
        ),
      },
      {
        key: "actions",
        label: t("Actions", "اقدامات"),
        render: (_: any, row: User) => (
          <div className={tableStyles.tableActions}>
            <Button
              variant="primary"
              size="small"
              title={t("View", "مشاهده")}
              style={{ padding: "0.5rem", minWidth: "auto" }}
              onClick={() =>
                setExpandedUserId(expandedUserId === row.id ? null : row.id)
              }
            >
              <FiEye />
            </Button>
            <Button
              variant="primary"
              size="small"
              title={t("Edit", "ویرایش")}
              style={{ padding: "0.5rem", minWidth: "auto" }}
              onClick={() => handleEdit(row)}
            >
              <FiEdit2 />
            </Button>
            {canDeleteUsers && (
              <Button
                variant="danger"
                size="small"
                title={t("Delete", "حذف")}
                style={{ padding: "0.5rem", minWidth: "auto" }}
                onClick={() => handleDelete(row)}
              >
                <FiTrash2 />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, expandedUserId]
  );

  const tableData = useMemo(() => {
    return users.map((user, index) => ({
      id: user.id,
      index: index + 1,
      name: user.name || t("N/A", "نامشخص"),
      surname: user.surname || "",
      email: user.email,
      phone: user.phone || t("N/A", "نامشخص"),
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      actions: null,
      addresses: user.addresses || [],
    }));
  }, [users, t]);

  return (
    <>
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiUsers />
            <span>{t("User Management", "مدیریت کاربران")}</span>
          </h3>
          <button
            className={cardStyles.cardAction}
            onClick={() => setIsAddUserModalOpen(true)}
          >
            {t("Add User", "افزودن کاربر")}
          </button>
        </div>

        <SearchBar
          placeholder={t(
            "Search users by name, email, or phone...",
            "جستجوی کاربران بر اساس نام، ایمیل یا تلفن..."
          )}
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              fetchUsers(1, true);
            }}
          />
        ) : (
          <>
            <div className={styles.tableView}>
              <DataTable
                columns={columns}
                data={tableData}
                emptyMessage={t(
                  "No user exists in database",
                  "هیچ کاربری در پایگاه داده وجود ندارد"
                )}
                renderExpandedRow={(row) => {
                  const user = users.find((u) => u.id === row.id);
                  if (!user) return null;

                  return (
                    <tr className={tableStyles.expandedRow}>
                      <td
                        colSpan={columns.length}
                        className={tableStyles.expandedCell}
                      >
                        <div className={tableStyles.expandedContent}>
                          <div className={tableStyles.expandedSection}>
                            <h4 className={tableStyles.expandedTitle}>
                              {t("Personal Information", "اطلاعات شخصی")}
                            </h4>
                            <div className={tableStyles.expandedGrid}>
                              <div className={tableStyles.expandedItem}>
                                <span className={tableStyles.expandedLabel}>
                                  {t("Name", "نام")}:
                                </span>
                                <span className={tableStyles.expandedValue}>
                                  {user.name || t("N/A", "نامشخص")}
                                </span>
                              </div>
                              <div className={tableStyles.expandedItem}>
                                <span className={tableStyles.expandedLabel}>
                                  {t("Surname", "نام خانوادگی")}:
                                </span>
                                <span className={tableStyles.expandedValue}>
                                  {user.surname || t("N/A", "نامشخص")}
                                </span>
                              </div>
                              <div className={tableStyles.expandedItem}>
                                <span className={tableStyles.expandedLabel}>
                                  {t("Email", "ایمیل")}:
                                </span>
                                <span className={tableStyles.expandedValue}>
                                  {user.email}
                                </span>
                              </div>
                              <div className={tableStyles.expandedItem}>
                                <span className={tableStyles.expandedLabel}>
                                  {t("Phone", "تلفن")}:
                                </span>
                                <span className={tableStyles.expandedValue}>
                                  {user.phone || t("N/A", "نامشخص")}
                                </span>
                              </div>
                              <div className={tableStyles.expandedItem}>
                                <span className={tableStyles.expandedLabel}>
                                  {t("Role", "نقش")}:
                                </span>
                                <span className={tableStyles.expandedValue}>
                                  {user.role === "superadmin"
                                    ? t("Super Admin", "سوپر ادمین")
                                    : user.role === "admin"
                                    ? t("Admin", "مدیر")
                                    : t("User", "کاربر")}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className={tableStyles.expandedSection}>
                            <h4 className={tableStyles.expandedTitle}>
                              {t("Verification Status", "وضعیت تایید")}
                            </h4>
                            <div className={tableStyles.expandedGrid}>
                              <div className={tableStyles.expandedItem}>
                                <span className={tableStyles.expandedLabel}>
                                  {t("Email Verified", "ایمیل تایید شده")}:
                                </span>
                                <span className={tableStyles.expandedValue}>
                                  <StatusBadge
                                    status={user.emailVerified ? "active" : "pending"}
                                    label={
                                      user.emailVerified
                                        ? t("Yes", "بله")
                                        : t("No", "خیر")
                                    }
                                  />
                                </span>
                              </div>
                              <div className={tableStyles.expandedItem}>
                                <span className={tableStyles.expandedLabel}>
                                  {t("Phone Verified", "تلفن تایید شده")}:
                                </span>
                                <span className={tableStyles.expandedValue}>
                                  <StatusBadge
                                    status={user.phoneVerified ? "active" : "pending"}
                                    label={
                                      user.phoneVerified
                                        ? t("Yes", "بله")
                                        : t("No", "خیر")
                                    }
                                  />
                                </span>
                              </div>
                            </div>
                          </div>

                          <UserAddresses
                            userId={user.id}
                            initialAddresses={user.addresses || []}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                }}
                expandedRowId={expandedUserId}
              />
            </div>

            <div className={styles.cardView}>
              {tableData.length === 0 ? (
                <EmptyState
                  icon={<EmptyIcon />}
                  title={t("No Users", "هیچ کاربری وجود ندارد")}
                  titleFa="هیچ کاربری وجود ندارد"
                  description={t(
                    "No user exists in database",
                    "هیچ کاربری در پایگاه داده وجود ندارد"
                  )}
                  descriptionFa="هیچ کاربری در پایگاه داده وجود ندارد"
                  action={{
                    label: t("Add User", "افزودن کاربر"),
                    labelFa: "افزودن کاربر",
                    onClick: () => setIsAddUserModalOpen(true),
                  }}
                />
              ) : (
                tableData.map((row) => {
                  const user = users.find((u) => u.id === row.id);
                  if (!user) return null;

                  return (
                    <UserCard
                      key={row.id}
                      user={user}
                      index={row.index}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  );
                })
              )}
            </div>

            {isLoadingMore && (
              <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                {t("Loading more users...", "در حال بارگذاری کاربران بیشتر...")}
              </div>
            )}

            <div ref={sentinelRef} style={{ height: 1 }} />

            {!hasMore && users.length > 0 && !isLoadingMore && (
              <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                {t("You have reached the end of users", "به انتهای لیست کاربران رسیدید")}
              </div>
            )}
          </>
        )}
      </AdminCard>

      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSave={handleSaveEdit}
      />

      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title={t("Add New User", "افزودن کاربر جدید")}
      >
        <Input
          label={t("Full Name", "نام کامل")}
          placeholder={t("Enter full name", "نام کامل را وارد کنید")}
        />
        <Input
          label={t("Email Address", "آدرس ایمیل")}
          type="email"
          placeholder={t("Enter email address", "آدرس ایمیل را وارد کنید")}
        />
        <Input
          label={t("Phone Number", "شماره تلفن")}
          type="tel"
          placeholder={t("Enter phone number", "شماره تلفن را وارد کنید")}
        />
        <div className={formStyles.formActions}>
          <Button variant="primary" onClick={() => setIsAddUserModalOpen(false)}>
            {t("Add User", "افزودن کاربر")}
          </Button>
          <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
            {t("Cancel", "لغو")}
          </Button>
        </div>
      </Modal>
    </>
  );
}