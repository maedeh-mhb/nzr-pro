import HomeClient from "./HomeClient";
import {
  getActiveCategories,
  getFeaturedProducts,
  getHomeHero,
  getHomeNote,
  getLatestArticles,
} from "@/lib/services/homeData";

// Data changes via the admin panel; re-render at most once a minute.
export const revalidate = 60;

export default async function HomePage() {
  const [hero, featuredProducts, articles, categories, note] = await Promise.all([
    getHomeHero(),
    getFeaturedProducts(8),
    getLatestArticles(5),
    getActiveCategories(),
    getHomeNote(),
  ]);

  return (
    <HomeClient
      hero={hero}
      featuredProducts={featuredProducts}
      articles={articles}
      categories={categories}
      note={note}
    />
  );
}
