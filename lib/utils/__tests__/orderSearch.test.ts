import { matchesOrderSearch, normalizeSearchText } from "../orderSearch";

describe("order search helpers", () => {
  it("normalizes Persian and Latin text for matching", () => {
    expect(normalizeSearchText("09123456789")).toBe("09123456789");
    expect(normalizeSearchText("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(normalizeSearchText("سعید")).toBe("سعید");
  });

  it("matches phone numbers consistently across prefixes", () => {
    const order = {
      orderNumber: "ORD-1001",
      customerName: "Ali Rezaei",
      customerEmail: "ali@example.com",
      customerPhone: "09123456789",
      items: [],
    };

    expect(matchesOrderSearch(order, "09123")).toBe(true);
    expect(matchesOrderSearch(order, "091234")).toBe(true);
    expect(matchesOrderSearch(order, "0912345")).toBe(true);
    expect(matchesOrderSearch(order, "123456789")).toBe(true);
  });

  it("matches names and order numbers case-insensitively", () => {
    const order = {
      orderNumber: "ORD-1002",
      customerName: "Mina Ahmadi",
      customerEmail: "mina@example.com",
      customerPhone: null,
      items: [],
    };

    expect(matchesOrderSearch(order, "mina")).toBe(true);
    expect(matchesOrderSearch(order, "ORD-1002")).toBe(true);
    expect(matchesOrderSearch(order, "Mina")).toBe(true);
  });
});
