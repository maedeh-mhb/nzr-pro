import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, heroSettings, products } from "@/lib/db/schema";
import { instructionCards } from "@/lib/db/schema/system";
import { getActiveCartReservations } from "@/lib/services/cartInventory";
import { getActiveReservationsForProducts } from "@/lib/services/inventoryReservation";

export interface HomeHero {
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  buttonTextEn: string;
  buttonTextFa: string;
  buttonLink: string;
  backgroundImageUrl: string | null;
  isEnabled: boolean;
}

export interface HomeProduct {
  id: string;
  name: string;
  nameFa: string | null;
  shortDescription: string | null;
  shortDescriptionFa: string | null;
  price: string;
  image: string | null;
  images: string[];
  quantity: number;
  badge: string | null;
  productType: "economic" | "featured" | null;
  slug: string | null;
  category: string | null;
  minOrderQuantity: number | null;
  maxOrderQuantity: number | null;
}

export interface HomeArticle {
  id: string;
  titleEn: string;
  titleFa: string;
  imageUrl: string;
}

export interface HomeCategory {
  id: string;
  name: string;
  nameFa: string | null;
  icon: string | null;
}

export interface HomeNoteData {
  contentEn: string | null;
  contentFa: string | null;
  availabilityTitleEn: string | null;
  availabilityTitleFa: string | null;
  availabilityDates: string[];
  availabilityAudioUrl: string | null;
  availabilityIsEnabled: boolean;
  isEnabled: boolean;
}

const DEFAULT_HERO: HomeHero = {
  titleEn: "Welcome to Our World",
  titleFa: "به دنیای ما خوش آمدید",
  descriptionEn: "Discover amazing products and experiences crafted just for you",
  descriptionFa: "محصولات شگفت انگیز و تجربیات ساخته شده برای شما را کشف کنید",
  buttonTextEn: "Explore Now",
  buttonTextFa: "اکنون کاوش کنید",
  buttonLink: "/products",
  backgroundImageUrl: null,
  isEnabled: true,
};

export async function getHomeHero(): Promise<HomeHero> {
  try {
    const rows = await db.select().from(heroSettings).limit(1);
    if (rows.length === 0) return DEFAULT_HERO;
    const s = rows[0];
    if (!s.isEnabled) return { ...DEFAULT_HERO, isEnabled: false };
    return {
      titleEn: s.titleEn || DEFAULT_HERO.titleEn,
      titleFa: s.titleFa || DEFAULT_HERO.titleFa,
      descriptionEn: s.descriptionEn || DEFAULT_HERO.descriptionEn,
      descriptionFa: s.descriptionFa || DEFAULT_HERO.descriptionFa,
      buttonTextEn: s.buttonTextEn || DEFAULT_HERO.buttonTextEn,
      buttonTextFa: s.buttonTextFa || DEFAULT_HERO.buttonTextFa,
      buttonLink: s.buttonLink || DEFAULT_HERO.buttonLink,
      backgroundImageUrl: s.backgroundImageUrl,
      isEnabled: s.isEnabled,
    };
  } catch (error) {
    console.error("Error fetching hero settings:", error);
    return DEFAULT_HERO;
  }
}

export async function getFeaturedProducts(limit = 8): Promise<HomeProduct[]> {
  try {
    const positionOrder = sql`COALESCE(${products.position}, 2147483647)`;
    const rows = await db
      .select()
      .from(products)
      .where(
        and(
          or(isNull(products.badge), ne(products.badge, "Not Available"))!,
          eq(products.productType, "featured")
        )
      )
      .orderBy(positionOrder, desc(products.createdAt))
      .limit(limit);

    const ids = rows.map((p) => p.id);
    const [cartReservations, checkoutReservations] = await Promise.all([
      getActiveCartReservations(ids),
      getActiveReservationsForProducts(ids),
    ]);

    return rows.map((product: any) => {
      let images: string[] = [];
      if (typeof product.images === "string") {
        try {
          images = JSON.parse(product.images);
        } catch {
          images = [];
        }
      } else if (Array.isArray(product.images)) {
        images = product.images;
      }
      return {
        id: product.id,
        name: product.name,
        nameFa: product.nameFa,
        shortDescription: product.shortDescription,
        shortDescriptionFa: product.shortDescriptionFa,
        price: product.price,
        image: product.image,
        images,
        quantity: Math.max(
          0,
          (product.quantity ?? 0) -
            (cartReservations.get(product.id) || 0) -
            (checkoutReservations.get(product.id) || 0)
        ),
        badge: product.badge,
        productType: product.productType,
        slug: product.slug,
        category: product.category,
        minOrderQuantity: product.minOrderQuantity ?? null,
        maxOrderQuantity: product.maxOrderQuantity ?? null,
      };
    });
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
}

export async function getLatestArticles(limit = 5): Promise<HomeArticle[]> {
  try {
    return await db
      .select({
        id: instructionCards.id,
        titleEn: instructionCards.titleEn,
        titleFa: instructionCards.titleFa,
        imageUrl: instructionCards.imageUrl,
      })
      .from(instructionCards)
      .where(eq(instructionCards.isEnabled, true))
      .orderBy(desc(instructionCards.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
}

export async function getActiveCategories(): Promise<HomeCategory[]> {
  try {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.order);
    return rows.map((c) => ({ id: c.id, name: c.name, nameFa: c.nameFa, icon: c.icon }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function getHomeNote(): Promise<HomeNoteData | null> {
  try {
    const note = await db.query.homeNote.findFirst();
    if (!note) return null;
    let availabilityDates: string[] = [];
    try {
      availabilityDates = note.availabilityDates ? JSON.parse(note.availabilityDates) : [];
    } catch {
      availabilityDates = [];
    }
    return {
      contentEn: note.contentEn,
      contentFa: note.contentFa,
      availabilityTitleEn: note.availabilityTitleEn,
      availabilityTitleFa: note.availabilityTitleFa,
      availabilityDates,
      availabilityAudioUrl: note.availabilityAudioUrl,
      availabilityIsEnabled: Boolean(note.availabilityIsEnabled),
      isEnabled: Boolean(note.isEnabled),
    };
  } catch (error) {
    console.error("Error fetching home note:", error);
    return null;
  }
}
