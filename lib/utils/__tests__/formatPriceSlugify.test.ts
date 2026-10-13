import { formatPrice } from "../formatPrice";
import { generateUniqueSlug, slugify } from "../slugify";

describe("formatPrice", () => {
  it("parses formatted strings and Persian numerals", () => {
    expect(formatPrice("1,234", "en", "toman")).toBe("1,234 Tomans");
    expect(formatPrice("۱۲۳۴", "fa", "toman")).toBe("۱٬۲۳۴ تومان");
  });

  it("supports Iranian currency aliases", () => {
    expect(formatPrice("150000", "fa", "irr")).toContain("۱۵۰٬۰۰۰");
    expect(formatPrice("150000", "en", "rial")).toContain("IRR");
  });
});

describe("slugify", () => {
  it("normalizes mixed separators and whitespace", () => {
    expect(slugify("  Hello -- World  ")).toBe("hello-world");
    expect(slugify("سلام دنیا!" )).toBe("سلام-دنیا");
  });

  it("falls back to a sane slug when input is empty", async () => {
    await expect(generateUniqueSlug("   ", async () => false)).resolves.toBe("item");
  });
});
