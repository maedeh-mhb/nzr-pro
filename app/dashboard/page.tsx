"use client";


import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

function DashboardContent() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            router.push("/login");
            return;
        }

        // Redirect admins/superadmins to admin dashboard
        const userRole = (session.user as any)?.role;
        if (userRole === "admin" || userRole === "superadmin") {
            router.push("/admin");
            return;
        }
    }, [session, status, router]);

    // Use language context for loading text
    let loadingText = "Loading...";
    try {
        // Dynamically import useLanguage to avoid SSR issues
        const { useLanguage } = require("@/lib/utils/language");
        const { language } = useLanguage();
        if (language === "fa") loadingText = "در حال بارگذاری";
    } catch { }
    if (status === "loading") {
        return <div>{loadingText}</div>;
    }

    if (!session) {
        return null;
    }

    // Double check role before rendering
    const userRole = (session.user as any)?.role;
    if (userRole === "admin" || userRole === "superadmin") {
        return null; // Will redirect
    }

    return <DashboardLayout />;
}

export default function DashboardPage() {
    // Use language context for loading text in Suspense fallback
    let loadingText = "Loading...";
    try {
        // Dynamically import useLanguage to avoid SSR issues
        const { useLanguage } = require("@/lib/utils/language");
        const { language } = useLanguage();
        if (language === "fa") loadingText = "در حال بارگذاری";
    } catch { }
    return (
        <Suspense fallback={<div>{loadingText}</div>}>
            <DashboardContent />
        </Suspense>
    );
}

