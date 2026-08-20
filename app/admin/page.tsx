"use client";


import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";
import AdminLayout from "@/components/admin/AdminLayout";
import styles from "@/styles/components/_admin.module.scss";


export default function AdminDashboard() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className={styles.adminContainer} style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t("Loading...", "در حال بارگذاری...")}</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "admin" && userRole !== "superadmin") {
    return null;
  }

  return <AdminLayout />;
}

