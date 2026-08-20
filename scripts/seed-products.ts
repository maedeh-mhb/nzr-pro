import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";

async function seedProducts() {
  try {
    console.log("🌱 Starting product seeding...");

    // First, create a default category if it doesn't exist
    const existingCategories = await db.select().from(categories).limit(1);
    let categoryId = existingCategories[0]?.id;

    if (!categoryId) {
      console.log("Creating default category...");
      const defaultCategory = await db
        .insert(categories)
        .values({
          name: "General",
          nameFa: "عمومی",
          description: "General products",
          descriptionFa: "محصولات عمومی",
          order: 0,
          isActive: true,
        })
        .returning();
      categoryId = defaultCategory[0].id;
    }

    // Sample products
    const sampleProducts = [
      {
        name: "Natural Soap Bar",
        nameFa: "صابون طبیعی",
        shortDescription: "Handmade natural soap with organic ingredients",
        shortDescriptionFa: "صابون طبیعی دستساز با مواد آلی",
        price: "15.99",
        quantity: 100,
        category: "General",
        categoryId,
        badge: "New Arrival",
        productType: "featured" as const,
        slug: "natural-soap-bar",
      },
      {
        name: "Lavender Soap",
        nameFa: "صابون اسطوخودوس",
        shortDescription: "Premium lavender soap for relaxation",
        shortDescriptionFa: "صابون لاوندر فوق العاده برای آرام بخشی",
        price: "12.99",
        quantity: 150,
        category: "General",
        categoryId,
        badge: "Sale",
        productType: "featured" as const,
        slug: "lavender-soap",
      },
      {
        name: "Charcoal Face Soap",
        nameFa: "صابون صورت زغال",
        shortDescription: "Detoxifying charcoal soap for face",
        shortDescriptionFa: "صابون زغال برای پاکسازی صورت",
        price: "14.99",
        quantity: 80,
        category: "General",
        categoryId,
        badge: null,
        productType: "featured" as const,
        slug: "charcoal-face-soap",
      },
      {
        name: "Honey Oat Soap",
        nameFa: "صابون عسل و جو دوسر",
        shortDescription: "Moisturizing honey and oat soap",
        shortDescriptionFa: "صابون مرطوب کننده عسل و جو دوسر",
        price: "11.99",
        quantity: 200,
        category: "General",
        categoryId,
        badge: null,
        productType: "economic" as const,
        slug: "honey-oat-soap",
      },
      {
        name: "Shea Butter Soap",
        nameFa: "صابون کره شئا",
        shortDescription: "Luxurious shea butter soap",
        shortDescriptionFa: "صابون کره شئا لوکس",
        price: "16.99",
        quantity: 120,
        category: "General",
        categoryId,
        badge: "Featured",
        productType: "featured" as const,
        slug: "shea-butter-soap",
      },
      {
        name: "Green Tea Soap",
        nameFa: "صابون چای سبز",
        shortDescription: "Antioxidant green tea soap",
        shortDescriptionFa: "صابون آنتی اکسیدان چای سبز",
        price: "13.99",
        quantity: 90,
        category: "General",
        categoryId,
        badge: "New",
        productType: "featured" as const,
        slug: "green-tea-soap",
      },
      {
        name: "Rose Hip Soap",
        nameFa: "صابون گلابی",
        shortDescription: "Anti-aging rose hip soap",
        shortDescriptionFa: "صابون ضد پیری گلابی",
        price: "17.99",
        quantity: 75,
        category: "General",
        categoryId,
        badge: null,
        productType: "featured" as const,
        slug: "rose-hip-soap",
      },
      {
        name: "Coconut Milk Soap",
        nameFa: "صابون شیر نارگیل",
        shortDescription: "Softening coconut milk soap",
        shortDescriptionFa: "صابون نرم کننده شیر نارگیل",
        price: "13.49",
        quantity: 110,
        category: "General",
        categoryId,
        badge: "Sale",
        productType: "economic" as const,
        slug: "coconut-milk-soap",
      },
    ];

    // Check if products already exist
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length > 0) {
      console.log("✅ Products already exist in database, skipping seeding");
      return;
    }

    // Insert products
    await db.insert(products).values(sampleProducts);

    console.log(`✅ Successfully seeded ${sampleProducts.length} products!`);
  } catch (error) {
    console.error("❌ Error seeding products:", error);
    process.exit(1);
  }
}

seedProducts();
