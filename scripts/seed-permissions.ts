import "dotenv/config";
import postgres from "postgres";
import { createId } from "@paralleldrive/cuid2";

const sql = postgres(process.env.DATABASE_URL!);

const permissions = [
  // Users Management
  { name: "view_users", descriptionEn: "View Users", descriptionFa: "مشاهده کاربران", category: "users" },
  { name: "edit_users", descriptionEn: "Edit Users", descriptionFa: "ویرایش کاربران", category: "users" },
  { name: "delete_users", descriptionEn: "Delete Users", descriptionFa: "حذف کاربران", category: "users" },
  { name: "create_users", descriptionEn: "Create Users", descriptionFa: "ایجاد کاربران", category: "users" },
  
  // Products Management
  { name: "view_products", descriptionEn: "View Products", descriptionFa: "مشاهده محصولات", category: "products" },
  { name: "edit_products", descriptionEn: "Edit Products", descriptionFa: "ویرایش محصولات", category: "products" },
  { name: "delete_products", descriptionEn: "Delete Products", descriptionFa: "حذف محصولات", category: "products" },
  { name: "create_products", descriptionEn: "Create Products", descriptionFa: "ایجاد محصولات", category: "products" },
  
  // Orders Management
  { name: "view_orders", descriptionEn: "View Orders", descriptionFa: "مشاهده سفارشات", category: "orders" },
  { name: "edit_orders", descriptionEn: "Edit Orders", descriptionFa: "ویرایش سفارشات", category: "orders" },
  { name: "cancel_orders", descriptionEn: "Cancel Orders", descriptionFa: "لغو سفارشات", category: "orders" },
  
  // Settings Management
  { name: "manage_site_settings", descriptionEn: "Manage Site Settings", descriptionFa: "مدیریت تنظیمات سایت", category: "settings" },
  { name: "manage_shipping", descriptionEn: "Manage Shipping Settings", descriptionFa: "مدیریت تنظیمات ارسال", category: "settings" },
  { name: "manage_payments", descriptionEn: "Manage Payment Settings", descriptionFa: "مدیریت تنظیمات پرداخت", category: "settings" },
  { name: "manage_hero", descriptionEn: "Manage Hero Section", descriptionFa: "مدیریت بخش اصلی", category: "settings" },
  { name: "manage_social_links", descriptionEn: "Manage Social Links", descriptionFa: "مدیریت لینک‌های اجتماعی", category: "settings" },
];

async function seedPermissions() {
  try {
    console.log("Seeding permissions...");

    for (const permission of permissions) {
      // Check if permission already exists
      const existing = await sql`
        SELECT id FROM permissions WHERE name = ${permission.name}
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO permissions (id, name, description_en, description_fa, category, created_at)
          VALUES (${createId()}, ${permission.name}, ${permission.descriptionEn}, ${permission.descriptionFa}, ${permission.category}, NOW())
        `;
        console.log(`✓ Created permission: ${permission.name}`);
      } else {
        console.log(`- Permission already exists: ${permission.name}`);
      }
    }

    console.log("Permissions seeding completed!");
  } catch (error) {
    console.error("Error seeding permissions:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

seedPermissions();

