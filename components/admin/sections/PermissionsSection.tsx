"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useSession } from "next-auth/react";
import {
  FiShield,
  FiUsers,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiEdit2,
  FiSave,
  FiFileText,
} from "react-icons/fi";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Modal from "../Modal";
import DataTable from "../DataTable";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { showSuccess, showError } from "@/lib/utils/toast";
import { filterManagedUsers } from "@/lib/utils/permissionUsers";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import styles from "@/styles/components/_admin.module.scss";

interface Permission {
  id: string;
  name: string;
  descriptionEn: string;
  descriptionFa: string;
  category: string;
}

interface User {
  id: string;
  name: string | null;
  surname: string | null;
  email: string;
  role: "user" | "admin" | "superadmin";
}

interface UserPermission {
  userId: string;
  permissionName: string;
  hasPermission: boolean;
}

export default function PermissionsSection() {
  const { t, language } = useLanguage();
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isMatrixView, setIsMatrixView] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogEntries, setAuditLogEntries] = useState<any[]>([]);
  const [isLoadingAuditLog, setIsLoadingAuditLog] = useState(false);

  // Debug: Log session data
  useEffect(() => {
    if (session?.user) {
      console.log("PermissionsSection - Session user:", session.user);
      console.log("PermissionsSection - Session user role:", (session.user as any)?.role);
    }
  }, [session]);

  // Fetch permissions
  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/admin/permissions");
      if (!response.ok) throw new Error("Failed to fetch permissions");
      const data = await response.json();
      setPermissions(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users?limit=1000");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      // Handle paginated response format: { success: true, data: [...] }
      setUsers(data.data || data.users || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Fetch user permissions
  const fetchUserPermissions = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/permissions/user/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user permissions");
      const data = await response.json();
      return data.permissions || [];
    } catch (err: any) {
      return [];
    }
  };

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchPermissions(), fetchUsers()]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Load permissions for all users when in matrix view
  useEffect(() => {
    if (isMatrixView && users.length > 0 && permissions.length > 0) {
      const loadAllPermissions = async () => {
        const perms: Record<string, string[]> = {};
        for (const user of users.filter((u) => u.role !== "user")) {
          perms[user.id] = await fetchUserPermissions(user.id);
        }
        setUserPermissions(perms);
        setEditingPermissions({});
      };
      loadAllPermissions();
    }
  }, [isMatrixView, users, permissions]);

  const handleOpenPermissionModal = async (user: User) => {
    setSelectedUser(user);
    const userPerms = await fetchUserPermissions(user.id);
    const permsMap: Record<string, boolean> = {};
    permissions.forEach((perm) => {
      permsMap[perm.id] = userPerms.includes(perm.name);
    });
    setEditingPermissions(permsMap);
    setIsPermissionModalOpen(true);
  };

  const fetchAuditLog = async () => {
    setIsLoadingAuditLog(true);
    try {
      const response = await fetch("/api/admin/permissions/audit?limit=100");
      if (!response.ok) throw new Error("Failed to fetch audit log");
      const data = await response.json();
      setAuditLogEntries(data.entries || []);
    } catch (err: any) {
      showError(err.message || t("Failed to load audit log", "خطا در بارگذاری سوابق"));
    } finally {
      setIsLoadingAuditLog(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      const permissionNames = Object.entries(editingPermissions)
        .filter(([_, hasPerm]) => hasPerm)
        .map(([permId]) => {
          const perm = permissions.find((p) => p.id === permId);
          return perm?.name;
        })
        .filter((name): name is string => !!name);

      const response = await fetch(`/api/admin/permissions/user/${selectedUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          permissionNames,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save permissions");
      }

      showSuccess(
        t("Permissions updated successfully", "مجوزها با موفقیت به‌روزرسانی شد")
      );
      setIsPermissionModalOpen(false);
      setSelectedUser(null);

      // Refresh matrix view if open
      if (isMatrixView) {
        const userPerms = await fetchUserPermissions(selectedUser.id);
        setUserPermissions((prev) => ({
          ...prev,
          [selectedUser.id]: userPerms,
        }));
      }
    } catch (err: any) {
      showError(err.message || t("Failed to save permissions", "خطا در ذخیره مجوزها"));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const managedUsers = filterManagedUsers(users);

    if (!searchQuery) return managedUsers;

    const query = searchQuery.toLowerCase();
    return managedUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.surname && u.surname.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  }, [permissions]);

  const columns = useMemo(
    () => [
      {
        key: "email",
        label: t("Email", "ایمیل"),
      },
      {
        key: "name",
        label: t("Name", "نام"),
        render: (value: string, row: User) => {
          const fullName = [row.name, row.surname].filter(Boolean).join(" ");
          return fullName || "-";
        },
      },
      {
        key: "role",
        label: t("Role", "نقش"),
        render: (value: string) => {
          const roleLabels: Record<string, string> = {
            superadmin: t("Super Admin", "سوپر ادمین"),
            admin: t("Admin", "مدیر"),
            user: t("User", "کاربر"),
          };
          return roleLabels[value] || value;
        },
      },
      {
        key: "permissions",
        label: t("Permissions", "مجوزها"),
        render: (_: any, row: User) => {
          const count = userPermissions[row.id]?.length || 0;
          return (
            <span>
              {count} {t("permissions", "مجوز")}
            </span>
          );
        },
      },
      {
        key: "actions",
        label: t("Actions", "اقدامات"),
        render: (_: any, row: User) => (
          <Button
            variant="primary"
            size="small"
            onClick={() => handleOpenPermissionModal(row)}
          >
            <FiEdit2 />
            <span>{t("Manage", "مدیریت")}</span>
          </Button>
        ),
      },
    ],
    [t, userPermissions]
  );

  if (isLoading) {
    return (
      <AdminCard>
        <TableSkeleton rows={5} columns={5} />
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard>
        <ErrorState message={error} />
      </AdminCard>
    );
  }

  return (
    <>
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiShield />
            <span>{t("Permissions & Roles", "مجوزها و نقش‌ها")}</span>
          </h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant={showAuditLog ? "primary" : "outline"}
              size="small"
              onClick={() => {
                setShowAuditLog(!showAuditLog);
                if (!showAuditLog) {
                  fetchAuditLog();
                }
              }}
            >
              <FiFileText />
              <span>{t("Audit Log", "سوابق")}</span>
            </Button>
            <Button
              variant={isMatrixView ? "primary" : "outline"}
              size="small"
              onClick={() => setIsMatrixView(!isMatrixView)}
            >
              {isMatrixView
                ? t("List View", "نمایش لیست")
                : t("Matrix View", "نمایش ماتریس")}
            </Button>
          </div>
        </div>

        {showAuditLog ? (
          <div>
            <h4 style={{ marginBottom: "1rem", fontSize: "1.125rem", fontWeight: 600 }}>
              {t("Permission Audit Log", "سوابق تغییرات مجوزها")}
            </h4>
            {isLoadingAuditLog ? (
              <TableSkeleton rows={5} columns={5} />
            ) : auditLogEntries.length === 0 ? (
              <EmptyState
                icon={<FiFileText />}
                title={t("No Audit Entries", "هیچ سابقه‌ای وجود ندارد")}
                titleFa="هیچ سابقه‌ای وجود ندارد"
              />
            ) : (
              <DataTable
                columns={[
                  {
                    key: "action",
                    label: t("Action", "عملیات"),
                  },
                  {
                    key: "userId",
                    label: t("User ID", "شناسه کاربر"),
                  },
                  {
                    key: "createdAt",
                    label: t("Date", "تاریخ"),
                    render: (value: Date) => new Date(value).toLocaleString(),
                  },
                ]}
                data={auditLogEntries}
              />
            )}
          </div>
        ) : !isMatrixView ? (
          <>
            <SearchBar
              placeholder={t("Search users...", "جستجوی کاربران...")}
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <DataTable columns={columns} data={filteredUsers} />
          </>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                    {t("User", "کاربر")}
                  </th>
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <th
                      key={category}
                      colSpan={perms.length}
                      style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #e5e7eb" }}
                    >
                      {category}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th></th>
                  {permissions.map((perm) => (
                    <th
                      key={perm.id}
                      style={{
                        padding: "0.5rem",
                        fontSize: "0.75rem",
                        textAlign: "center",
                        borderBottom: "1px solid #e5e7eb",
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                      }}
                      title={language === "fa" ? perm.descriptionFa : perm.descriptionEn}
                    >
                      {perm.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{user.email}</div>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                          {[user.name, user.surname].filter(Boolean).join(" ") || "-"}
                        </div>
                      </div>
                    </td>
                    {permissions.map((perm) => {
                      const hasPerm = userPermissions[user.id]?.includes(perm.name) || false;
                      return (
                        <td
                          key={perm.id}
                          style={{
                            padding: "0.5rem",
                            textAlign: "center",
                            borderBottom: "1px solid #e5e7eb",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            if (user.role === "superadmin") return;
                            setEditingPermissions((prev) => ({
                              ...prev,
                              [`${user.id}_${perm.id}`]: !hasPerm,
                            }));
                            // Update local state immediately
                            setUserPermissions((prev) => {
                              const current = prev[user.id] || [];
                              if (hasPerm) {
                                return {
                                  ...prev,
                                  [user.id]: current.filter((p) => p !== perm.name),
                                };
                              } else {
                                return {
                                  ...prev,
                                  [user.id]: [...current, perm.name],
                                };
                              }
                            });
                          }}
                        >
                          {hasPerm ? (
                            <FiCheck style={{ color: "#10b981" }} />
                          ) : (
                            <FiX style={{ color: "#ef4444" }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="primary"
                onClick={async () => {
                  // Save all changes
                  setIsSaving(true);
                  try {
                    for (const user of filteredUsers) {
                      if (user.role === "superadmin") continue;
                      const permissionNames = userPermissions[user.id] || [];
                      await fetch(`/api/admin/permissions/user/${user.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "set",
                          permissionNames,
                        }),
                      });
                    }
                    showSuccess(
                      t("All permissions saved", "همه مجوزها ذخیره شد")
                    );
                  } catch (err: any) {
                    showError(err.message || t("Failed to save", "خطا در ذخیره"));
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
              >
                <FiSave />
                <span>
                  {isSaving
                    ? t("Saving...", "در حال ذخیره...")
                    : t("Save All Changes", "ذخیره همه تغییرات")}
                </span>
              </Button>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Permission Management Modal */}
      <Modal
        isOpen={isPermissionModalOpen}
        onClose={() => {
          setIsPermissionModalOpen(false);
          setSelectedUser(null);
          setEditingPermissions({});
        }}
        title={
          selectedUser
            ? t("Manage Permissions", "مدیریت مجوزها") +
              `: ${selectedUser.email}`
            : t("Manage Permissions", "مدیریت مجوزها")
        }
        size="large"
      >
        {selectedUser && (
          <div style={{ padding: "1rem" }}>
            {selectedUser.role === "superadmin" ? (
              <p style={{ color: "#6b7280" }}>
                {t(
                  "Super admins have all permissions by default.",
                  "سوپر ادمین‌ها به طور پیش‌فرض همه مجوزها را دارند."
                )}
              </p>
            ) : (
              <>
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category} style={{ marginBottom: "1.5rem" }}>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        marginBottom: "0.75rem",
                        color: "var(--primary)",
                      }}
                    >
                      {category}
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {perms.map((perm) => {
                        const isChecked = editingPermissions[perm.id] || false;
                        return (
                          <label
                            key={perm.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setEditingPermissions((prev) => ({
                                  ...prev,
                                  [perm.id]: e.target.checked,
                                }));
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 500 }}>{perm.name}</div>
                              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                {language === "fa" ? perm.descriptionFa : perm.descriptionEn}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPermissionModalOpen(false);
                      setSelectedUser(null);
                      setEditingPermissions({});
                    }}
                  >
                    {t("Cancel", "لغو")}
                  </Button>
                  <Button variant="primary" onClick={handleSavePermissions} disabled={isSaving}>
                    <FiSave />
                    <span>
                      {isSaving
                        ? t("Saving...", "در حال ذخیره...")
                        : t("Save", "ذخیره")}
                    </span>
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
