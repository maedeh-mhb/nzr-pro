import { firstNameMatchesEmail, isPersianName } from "../nameValidation";

describe("firstNameMatchesEmail", () => {
  it("matches a first name anywhere in the email, ignoring case", () => {
    expect(firstNameMatchesEmail("Ali", "ali.rezaei@example.com")).toBe(true);
    expect(firstNameMatchesEmail("ALI", "contact+ali@example.com")).toBe(true);
  });

  it("does not match when the email does not contain the first name", () => {
    expect(firstNameMatchesEmail("Sara", "ali@example.com")).toBe(false);
  });

  it("does not treat an empty first name as a match", () => {
    expect(firstNameMatchesEmail(" ", "ali@example.com")).toBe(false);
  });
});

describe("isPersianName", () => {
  it("accepts Persian-script names and compound names", () => {
    expect(isPersianName("علی")).toBe(true);
    expect(isPersianName("محمد رضا")).toBe(true);
    expect(isPersianName("زهرا\u200cسادات")).toBe(true);
  });

  it("rejects Latin, mixed-script, empty, and non-name input", () => {
    expect(isPersianName("Ali")).toBe(false);
    expect(isPersianName("علی Ali")).toBe(false);
    expect(isPersianName("   ")).toBe(false);
    expect(isPersianName("۱۲۳")).toBe(false);
  });
});
