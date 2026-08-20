import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db";
import { permissions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/middleware/auth";
export const dynamic = "force-dynamic";

const defaultPermissions = [
  { name: "view_users", descriptionEn: "View Users", descriptionFa: "مشاهده کاربران", category: "users" },
  { name: "edit_users", descriptionEn: "Edit Users", descriptionFa: "ویرایش کاربران", category: "users" },
  { name: "delete_users", descriptionEn: "Delete Users", descriptionFa: "حذف کاربران", category: "users" },
  { name: "create_users", descriptionEn: "Create Users", descriptionFa: "ایجاد کاربران", category: "users" },
  { name: "view_products", descriptionEn: "View Products", descriptionFa: "مشاهده محصولات", category: "products" },
  { name: "edit_products", descriptionEn: "Edit Products", descriptionFa: "ویرایش محصولات", category: "products" },
  { name: "delete_products", descriptionEn: "Delete Products", descriptionFa: "حذف محصولات", category: "products" },
  { name: "create_products", descriptionEn: "Create Products", descriptionFa: "ایجاد محصولات", category: "products" },
  { name: "view_orders", descriptionEn: "View Orders", descriptionFa: "مشاهده سفارشات", category: "orders" },
  { name: "edit_orders", descriptionEn: "Edit Orders", descriptionFa: "ویرایش سفارشات", category: "orders" },
  { name: "cancel_orders", descriptionEn: "Cancel Orders", descriptionFa: "لغو سفارشات", category: "orders" },
  { name: "manage_site_settings", descriptionEn: "Manage Site Settings", descriptionFa: "مدیریت تنظیمات سایت", category: "settings" },
  { name: "manage_shipping", descriptionEn: "Manage Shipping Settings", descriptionFa: "مدیریت تنظیمات ارسال", category: "settings" },
  { name: "manage_payments", descriptionEn: "Manage Payment Settings", descriptionFa: "مدیریت تنظیمات پرداخت", category: "settings" },
  { name: "manage_hero", descriptionEn: "Manage Hero Section", descriptionFa: "مدیریت بخش اصلی", category: "settings" },
  { name: "manage_social_links", descriptionEn: "Manage Social Links", descriptionFa: "مدیریت لینک‌های اجتماعی", category: "settings" },
];

// Get all permissions
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    if (authResult.userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all permissions ordered by category and name
    let allPermissions = await db
      .select()
      .from(permissions)
      .orderBy(permissions.category, permissions.name);

    if (allPermissions.length === 0) {
      console.warn("Permissions table is empty. Seeding default permissions.");
      const seededPermissions = defaultPermissions.map((permission) => ({
        id: createId(),
        createdAt: new Date(),
        ...permission,
      }));

      await db.insert(permissions).values(seededPermissions);
      allPermissions = seededPermissions;
    }

    return NextResponse.json(allPermissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

