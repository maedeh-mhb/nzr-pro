import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const ORDER_EDIT_WINDOW_MS = 60 * 60 * 1000;

export function createOrderEditToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashOrderEditToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isOrderEditTokenValid(
  token: string,
  expectedHash: string | null | undefined
): boolean {
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const actual = Buffer.from(hashOrderEditToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isOrderWithinEditWindow(createdAt: Date, now = Date.now()): boolean {
  const elapsed = now - createdAt.getTime();
  return elapsed >= 0 && elapsed < ORDER_EDIT_WINDOW_MS;
}
