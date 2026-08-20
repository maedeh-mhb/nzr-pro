/**
 * Utility functions for creating bilingual API error messages
 */

export interface BilingualError {
  error: string;
  errorFa: string;
}

/**
 * Create a bilingual error response
 */
export function createBilingualError(en: string, fa: string): BilingualError {
  return { error: en, errorFa: fa };
}

/**
 * Common error messages
 */
export const API_ERRORS = {
  CART_EMPTY: createBilingualError("Cart is empty", "سبد خرید خالی است"),
  INVALID_TOTAL: createBilingualError("Invalid total amount", "مبلغ کل نامعتبر است"),
  PAYMENT_METHOD_REQUIRED: createBilingualError("Payment method is required", "روش پرداخت الزامی است"),
  PAYMENT_SETTINGS_NOT_FOUND: createBilingualError("Payment settings not found", "تنظیمات پرداخت یافت نشد"),
  INVALID_PAYMENT_METHOD: createBilingualError("Invalid payment method", "روش پرداخت نامعتبر است"),
  PAYMENT_METHOD_NOT_AVAILABLE: createBilingualError("Selected payment method is not available", "روش پرداخت انتخاب شده در دسترس نیست"),
  USER_NOT_FOUND: createBilingualError("User not found", "کاربر یافت نشد"),
  FULL_NAME_REQUIRED: createBilingualError("Full name (name and surname) is required to place an order", "نام و نام خانوادگی کامل برای ثبت سفارش الزامی است"),
  PHONE_VERIFIED_REQUIRED: createBilingualError("Verified phone number is required to place an order", "شماره تلفن تأیید شده برای ثبت سفارش الزامی است"),
  ADDRESS_REQUIRED: createBilingualError("Complete shipping address is required to place an order", "آدرس کامل ارسال برای ثبت سفارش الزامی است"),
  GUEST_INFO_REQUIRED: createBilingualError("Guest information is required", "اطلاعات مهمان الزامی است"),
  PRODUCT_NOT_FOUND: (productId: string) => createBilingualError(`Product ${productId} not found`, `محصول ${productId} یافت نشد`),
  PRODUCT_NOT_AVAILABLE: (productName: string) => createBilingualError(`Product ${productName} is not available`, `محصول ${productName} در دسترس نیست`),
  INSUFFICIENT_QUANTITY: (productName: string) => createBilingualError(`Insufficient quantity for ${productName}`, `تعداد ناکافی برای ${productName}`),
  TOTAL_MISMATCH: createBilingualError("Total amount mismatch. Please recalculate.", "عدم تطابق مبلغ کل. لطفاً مجدداً محاسبه کنید."),
  DISCOUNT_CODE_NOT_FOUND: createBilingualError("Discount code not found", "کد تخفیف یافت نشد"),
  DISCOUNT_CODE_LIMIT_REACHED: createBilingualError("Discount code has reached its usage limit", "کد تخفیف به حد استفاده رسیده است"),
  FAILED_TO_CREATE_ORDER: createBilingualError("Failed to create order", "خطا در ایجاد سفارش"),
  INVALID_CSRF: createBilingualError("Invalid or missing CSRF token", "توکن CSRF نامعتبر یا مفقود است"),
  NO_ITEMS_SELECTED: createBilingualError("No items selected for checkout", "هیچ آیتمی برای پرداخت انتخاب نشده است"),
  NO_VALID_ITEMS: createBilingualError("No valid items selected for checkout", "هیچ آیتم معتبری برای پرداخت انتخاب نشده است"),
  GUEST_ITEMS_REQUIRED: createBilingualError("Guest items are required for validation", "آیتم‌های مهمان برای اعتبارسنجی الزامی است"),
  NO_VALID_ITEMS_FOUND: createBilingualError("No valid items found for checkout", "هیچ آیتم معتبری برای پرداخت یافت نشد"),
  INVENTORY_UNAVAILABLE: createBilingualError("Inventory became unavailable. Please refresh and try again.", "موجودی در دسترس نیست. لطفاً صفحه را رفرش کنید و دوباره تلاش کنید."),
  FAILED_TO_RESERVE: createBilingualError("Failed to reserve inventory. Please try again.", "خطا در رزرو موجودی. لطفاً دوباره تلاش کنید."),
  FAILED_TO_VALIDATE: createBilingualError("Failed to validate checkout", "خطا در اعتبارسنجی پرداخت"),
  EMAIL_REQUIRED: createBilingualError("Email is required", "ایمیل الزامی است"),
  INTERNAL_SERVER_ERROR: createBilingualError("Internal server error", "خطای داخلی سرور"),
  TOKEN_PASSWORD_REQUIRED: createBilingualError("Token and password are required", "توکن و رمز عبور الزامی است"),
  PASSWORD_MIN_LENGTH: createBilingualError("Password must be at least 8 characters", "رمز عبور باید حداقل 8 کاراکتر باشد"),
  INVALID_EXPIRED_TOKEN: createBilingualError("Invalid or expired reset token", "توکن بازیابی نامعتبر یا منقضی شده است"),
};

