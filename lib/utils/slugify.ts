/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function slugify(text: string | number | null | undefined): string {
  const source = String(text ?? "")
    .trim()
    .toLowerCase();

  if (!source) {
    return "";
  }

  return source
    .replace(/\s+/g, "-")
    .replace(/[_-]+/g, "-")
    .replace(/[^\p{L}\p{N}\u0600-\u06FF-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique slug by appending a number if the slug already exists
 * @param baseSlug - The base slug to check
 * @param checkExists - Function to check if a slug exists
 * @returns A unique slug
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = slugify(baseSlug) || "item";
  let counter = 1;
  let uniqueSlug = slug;

  while (await checkExists(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

