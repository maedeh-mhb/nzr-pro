// ...existing code...
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, products, paymentSettings, users, contactSettings, userActivities, notifications, discountCodeUsages, discountCodes, idempotencyKeys, orderStatusHistory } from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcryptjs";
import { createActivity } from "@/lib/services/activities";
import { createAdminActivity } from "@/lib/services/adminActivities";
import { createNotification } from "@/lib/services/notifications";
import { sendOrderConfirmationEmail, sendGuestOrderConfirmationEmail, sendPasswordResetEmail, sendEmail } from "@/lib/services/email";
import { validateDiscountCode } from "@/lib/services/discountCodes";
import { convertReservationToOrder, releaseUserReservations, getActiveReservationsForProduct } from "@/lib/services/inventoryReservation";
import { validateOrigin, getOriginValidationError } from "@/lib/utils/validateOrigin";
import { checkRateLimit, getRateLimitIdentifier, extractIpAddress, getRateLimitError } from "@/lib/utils/rateLimiter";
import { validateCsrfToken } from "@/lib/utils/csrf";
import { getOrCreateRequestId, addRequestIdToHeaders } from "@/lib/utils/requestId";
import { API_ERRORS } from "@/lib/utils/apiErrors";
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeName,
  sanitizeAddress,
  sanitizeDiscountCode,
  sanitizeProductId,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeProvinceId,
  sanitizeCityId,
} from "@/lib/utils/sanitize";
export const dynamic = "force-dynamic";

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  // Generate request ID for tracking
  const requestId = getOrCreateRequestId(request);

  try {
    // 1. Validate request origin
    if (!validateOrigin(request)) {
      const error = getOriginValidationError();
      return NextResponse.json(
        { error: error.error },
        {
          status: error.status,
          headers: addRequestIdToHeaders({}, requestId)
        }
      );
    }

    // 2. Rate limiting
    const session = await getServerSession(authOptions);
    let userId = session?.user?.id || null;
    const ipAddress = extractIpAddress(request);
    const identifier = getRateLimitIdentifier(userId, ipAddress);

    const rateLimit = checkRateLimit(identifier, 10, 60 * 60 * 1000); // 10 orders per hour
    if (!rateLimit.allowed) {
      const error = getRateLimitError(rateLimit.resetTime);
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        {
          status: error.status,
          headers: {
            "Retry-After": error.retryAfter.toString(),
          },
        }
      );
    }

    // 3. CSRF protection
    const body = await request.json();
    const { csrfToken, idempotencyKey, ...orderData } = body;

    const csrfValid = await validateCsrfToken(request, csrfToken);
    if (!csrfValid) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 }
      );
    }

    // 3.5. Idempotency key check - if key exists, return existing order
    if (idempotencyKey && typeof idempotencyKey === "string" && idempotencyKey.trim() !== "") {
      const sanitizedIdempotencyKey = idempotencyKey.trim();
      const existingKey = await db.query.idempotencyKeys.findFirst({
        where: eq(idempotencyKeys.idempotencyKey, sanitizedIdempotencyKey),
      });

      if (existingKey) {
        // Key exists, fetch and return the existing order
        const existingOrder = await db.query.orders.findFirst({
          where: eq(orders.id, existingKey.orderId),
        });

        if (existingOrder) {
          // Fetch order items
          const existingItems = await db.query.orderItems.findMany({
            where: eq(orderItems.orderId, existingOrder.id),
          });

          return NextResponse.json({
            order: {
              id: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              status: existingOrder.status,
              total: existingOrder.total,
              createdAt: existingOrder.createdAt,
            },
            idempotent: true, // Indicate this is a duplicate request
          });
        }
      }
    }

    // 4. Input sanitization
    const {
      items, // Array of { productId, quantity }
      total,
      paymentMethod,
      // Discount code fields
      discountCode,
      discountCodeId,
      discountAmount,
      shippingCost = 0,
      shipping = 0, // Also accept "shipping" for backward compatibility
      shippingMethod = "iranian_post", // Default to Iranian Post
      // Guest order fields (if guest checkout)
      guestName,
      guestSurname,
      guestEmail,
      guestPhone,
      createAccount,
      accountPassword,
      provinceId,
      cityId,
      address,
      postalCode,
      // Invoice request
      invoiceRequested = false,
    } = orderData;

    // Sanitize all inputs
    const sanitizedItems = Array.isArray(items)
      ? items.map((item: any) => {
        const sanitizedProductId = sanitizeProductId(item.productId);
        const sanitizedQuantity = sanitizeInteger(item.quantity);
        return {
          productId: sanitizedProductId,
          quantity: sanitizedQuantity,
        };
      }).filter((item: any) => item.productId !== "" && item.quantity > 0)
      : [];

    const sanitizedTotal = sanitizeNumber(total);
    const sanitizedPaymentMethod = sanitizeString(paymentMethod);
    const sanitizedDiscountCode = discountCode ? sanitizeDiscountCode(discountCode) : null;
    const sanitizedDiscountCodeId = discountCodeId ? sanitizeProductId(discountCodeId) : null;
    const sanitizedDiscountAmount = discountAmount ? sanitizeNumber(discountAmount) : null;
    const sanitizedShippingCost = sanitizeNumber(shippingCost || shipping || 0);
    const sanitizedShippingMethod = sanitizeString(shippingMethod) || "iranian_post";

    // Guest fields
    const sanitizedGuestFirstName = guestName ? sanitizeName(guestName) : null;
    const sanitizedGuestSurname = guestSurname ? sanitizeName(guestSurname) : null;
    const sanitizedGuestName = [sanitizedGuestFirstName, sanitizedGuestSurname]
      .filter(Boolean)
      .join(" ") || null;
    const sanitizedGuestEmail = guestEmail ? sanitizeEmail(guestEmail) : null;
    const sanitizedGuestPhone = guestPhone ? sanitizePhone(guestPhone) : null;
    const sanitizedProvinceId = sanitizeProvinceId(provinceId);
    const sanitizedCityId = sanitizeCityId(cityId);
    const sanitizedAddress = address ? sanitizeAddress(address) : null;
    const sanitizedPostalCode = postalCode ? sanitizeString(postalCode, 10).replace(/\D/g, "").slice(0, 10) : null;

    // Use shippingCost if provided, otherwise fall back to shipping
    const actualShippingCost = sanitizedShippingCost;

    // Validate required fields (using sanitized values)
    if (sanitizedItems.length === 0) {
      console.error("Cart is empty - items received:", items, "sanitized:", sanitizedItems);
      const error = API_ERRORS.CART_EMPTY;
      return NextResponse.json({
        error: error.error,
        errorFa: error.errorFa,
        debug: {
          itemsReceived: Array.isArray(items) ? items.length : 0,
          itemsType: typeof items,
          sanitizedCount: sanitizedItems.length,
        }
      }, { status: 400 });
    }

    if (sanitizedTotal <= 0) {
      const error = API_ERRORS.INVALID_TOTAL;
      return NextResponse.json({ error: error.error, errorFa: error.errorFa }, { status: 400 });
    }

    if (!sanitizedPaymentMethod) {
      const error = API_ERRORS.PAYMENT_METHOD_REQUIRED;
      return NextResponse.json({ error: error.error, errorFa: error.errorFa }, { status: 400 });
    }

    // Check if payment method is enabled
    const paymentSettingsData = await db.select().from(paymentSettings).limit(1);
    if (paymentSettingsData.length === 0) {
      const error = API_ERRORS.PAYMENT_SETTINGS_NOT_FOUND;
      return NextResponse.json({ error: error.error, errorFa: error.errorFa }, { status: 500 });
    }

    const payment = paymentSettingsData[0];

    // userId already extracted above for rate limiting
    // Fetch user data first to check for user-specific payment method overrides
    let user = null;
    if (userId) {
      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        const error = API_ERRORS.USER_NOT_FOUND;
        return NextResponse.json({ error: error.error, errorFa: error.errorFa }, { status: 404 });
      }
    }

    // Check if payment method is enabled (considering user-specific overrides)
    let isPaymentEnabled = false;
    switch (sanitizedPaymentMethod) {
      case "card_to_card":
        // Use user-specific override if it exists (not null), otherwise use global setting
        isPaymentEnabled = user && user.cardToCardEnabled !== null
          ? user.cardToCardEnabled
          : (payment.cardToCardEnabled || false);
        break;
      case "online_payment":
        isPaymentEnabled = session?.user && user && user.onlinePaymentEnabled !== null
          ? user.onlinePaymentEnabled
          : (payment.onlinePaymentEnabled || false);
        break;
      case "pay_after_delivery":
        isPaymentEnabled = user && user.payAfterDeliveryEnabled !== null
          ? user.payAfterDeliveryEnabled
          : (payment.payAfterDeliveryEnabled || false);
        break;
      case "paypal":
        isPaymentEnabled = user && user.paypalEnabled !== null
          ? user.paypalEnabled
          : (payment.paypalEnabled || false);
        break;
      default:
        const invalidError = API_ERRORS.INVALID_PAYMENT_METHOD;
        return NextResponse.json({ error: invalidError.error, errorFa: invalidError.errorFa }, { status: 400 });
    }

    if (!isPaymentEnabled) {
      const notAvailableError = API_ERRORS.PAYMENT_METHOD_NOT_AVAILABLE;
      return NextResponse.json(
        { error: notAvailableError.error, errorFa: notAvailableError.errorFa },
        { status: 400 }
      );
    }

    // Profile requirements apply only to authenticated users, never to guests whose
    // contact details happen to match an existing account.
    if (session?.user && user) {
      // Check full name
      if (!user.name || !user.surname || user.name.trim() === "" || user.surname.trim() === "") {
        const error = API_ERRORS.FULL_NAME_REQUIRED;
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }

      // Check verified phone
      if (!user.phoneVerified) {
        const error = API_ERRORS.PHONE_VERIFIED_REQUIRED;
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }

      // Check full address - must have provinceId, cityId, and address (using sanitized values)
      if (!sanitizedProvinceId || !sanitizedCityId || !sanitizedAddress || sanitizedAddress.trim() === "") {
        const error = API_ERRORS.ADDRESS_REQUIRED;
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }
    }

    // Validate guest fields (using sanitized values)
    const isGuestOrder = !session?.user;

    if (isGuestOrder) {
      if (
        !sanitizedGuestFirstName ||
        !sanitizedGuestSurname ||
        !sanitizedGuestPhone ||
        !sanitizedProvinceId ||
        !sanitizedCityId ||
        !sanitizedAddress
      ) {
        const error = API_ERRORS.GUEST_INFO_REQUIRED;
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }
    }

    const shouldCreateAccount = isGuestOrder && createAccount === true;
    let hashedAccountPassword: string | null = null;
    if (shouldCreateAccount) {
      if (typeof accountPassword !== "string" || accountPassword.length < 8 || accountPassword.length > 100) {
        return NextResponse.json(
          {
            error: "Password must be between 8 and 100 characters",
            errorFa: "رمز عبور باید بین ۸ تا ۱۰۰ کاراکتر باشد",
          },
          { status: 400 }
        );
      }

      const existingAccount = await db.query.users.findFirst({
        where: sanitizedGuestEmail
          ? or(eq(users.phone, sanitizedGuestPhone!), eq(users.email, sanitizedGuestEmail))
          : eq(users.phone, sanitizedGuestPhone!),
        columns: { id: true },
      });

      if (existingAccount) {
        return NextResponse.json(
          {
            error: "An account already exists with this phone number or email. Sign in or continue without creating an account.",
            errorFa: "با این شماره تلفن یا ایمیل قبلاً حسابی ایجاد شده است. وارد شوید یا بدون ایجاد حساب ادامه دهید.",
            code: "ACCOUNT_ALREADY_EXISTS",
          },
          { status: 409 }
        );
      }

      hashedAccountPassword = await bcrypt.hash(accountPassword, 10);
    }

    // Initial product validation (without locking) for early error detection and cart subtotal calculation
    // This is a quick check, but final validation with locking happens inside transaction
    const initialValidatedItems: Array<{
      productId: string;
      productName: string;
      productNameFa: string | null;
      price: string;
      quantity: number;
    }> = [];
    let cartSubtotal = 0;
    for (const item of sanitizedItems) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });

      if (!product) {
        const error = API_ERRORS.PRODUCT_NOT_FOUND(item.productId);
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }

      // Check if product is available (not out of stock or not available)
      if (product.badge === "Out of Stock" || product.badge === "Not Available") {
        const error = API_ERRORS.PRODUCT_NOT_AVAILABLE(product.name);
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }

      // Initial quantity check (final check with locking happens in transaction)
      if (product.quantity < item.quantity) {
        const error = API_ERRORS.INSUFFICIENT_QUANTITY(product.name);
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }

      const itemPrice = parseFloat(product.price.toString());
      cartSubtotal += itemPrice * item.quantity;

      initialValidatedItems.push({
        productId: product.id,
        productName: product.name,
        productNameFa: product.nameFa ?? null,
        price: product.price,
        quantity: item.quantity,
      });
    }

    // Validate and apply discount code if provided (using sanitized values)
    let finalDiscountCodeId: string | null = null;
    let finalDiscountAmount: number | null = null;

    if (sanitizedDiscountCode || sanitizedDiscountCodeId) {
      // If discountCode is provided, validate it
      if (sanitizedDiscountCode) {
        const validation = await validateDiscountCode({
          code: sanitizedDiscountCode,
          userId: userId || undefined,
          cartTotal: cartSubtotal,
          shippingCost: Number(actualShippingCost),
        });

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.message },
            { status: 400 }
          );
        }

        finalDiscountCodeId = validation.codeId || null;
        finalDiscountAmount = validation.discount_amount ? Number(validation.discount_amount) : null;
      } else if (sanitizedDiscountCodeId && sanitizedDiscountAmount !== null) {
        // If discountCodeId and discountAmount are provided directly (from frontend validation)
        finalDiscountCodeId = sanitizedDiscountCodeId;
        finalDiscountAmount = sanitizedDiscountAmount;
      }

      // Verify the total matches (cartSubtotal + shippingCost - discountAmount)
      // For courier shipping, shippingCost should be 0 (customer pays courier directly)
      // Note: Discount amount is always capped at cartSubtotal (never exceeds subtotal),
      // so shipping costs are always charged separately and cannot be made free by discounts
      const calculatedShippingCost = sanitizedShippingMethod === "courier" ? 0 : Number(actualShippingCost);
      const expectedTotal = cartSubtotal + calculatedShippingCost - (finalDiscountAmount || 0);
      if (Math.abs(expectedTotal - sanitizedTotal) > 0.01) {
        if (process.env.NODE_ENV === "development") {
          console.error("Total mismatch - Expected:", expectedTotal, "Received:", sanitizedTotal);
        }
        const error = API_ERRORS.TOTAL_MISMATCH;
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }
    } else {
      // No discount code, verify total matches (cartSubtotal + shippingCost)
      // For courier shipping, shippingCost should be 0 (customer pays courier directly)
      const calculatedShippingCost = sanitizedShippingMethod === "courier" ? 0 : Number(actualShippingCost);
      const expectedTotal = cartSubtotal + calculatedShippingCost;
      if (Math.abs(expectedTotal - sanitizedTotal) > 0.01) {
        if (process.env.NODE_ENV === "development") {
          console.error("Total mismatch - Expected:", expectedTotal, "Received:", sanitizedTotal);
        }
        const error = API_ERRORS.TOTAL_MISMATCH;
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }
    }

    // Generate order number
    let orderNumber = generateOrderNumber();
    let orderNumberExists = true;
    while (orderNumberExists) {
      const existing = await db.query.orders.findFirst({
        where: eq(orders.orderNumber, orderNumber),
      });
      if (!existing) {
        orderNumberExists = false;
      } else {
        orderNumber = generateOrderNumber();
      }
    }

    // Sanitize invoice request
    const sanitizedInvoiceRequested = Boolean(invoiceRequested);

    // Wrap all database operations in a transaction to ensure atomicity
    // If any operation fails, all changes will be rolled back
    const newOrder = await db.transaction(async (tx) => {
      let orderUserId = userId;
      if (shouldCreateAccount) {
        const [createdUser] = await tx.insert(users).values({
          name: sanitizedGuestFirstName!,
          surname: sanitizedGuestSurname!,
          email: sanitizedGuestEmail,
          phone: sanitizedGuestPhone!,
          password: hashedAccountPassword!,
        }).returning({ id: users.id });
        orderUserId = createdUser.id;
      }

      // CRITICAL: Validate products with row-level locking (SELECT FOR UPDATE) to prevent race conditions
      // This ensures that inventory is checked and updated atomically, preventing overselling
      const validatedItems = [];
      const lockedProductsMap = new Map<string, any>();

      // Lock product rows and validate inventory
      for (const item of initialValidatedItems) {
        // Use SELECT FOR UPDATE to lock the row (prevents race conditions)
        // This prevents other transactions from modifying the product until this transaction completes
        // Using parameterized query for safety (item.productId is already sanitized)
        const lockedProducts = await tx.execute(
          sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
        );

        const product = lockedProducts[0] as any;

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        // Store locked product data for later use
        lockedProductsMap.set(item.productId, product);

        // Re-check availability with locked row (prevents race conditions)
        if (product.badge === "Out of Stock" || product.badge === "Not Available") {
          throw new Error(`Product ${product.name} is not available`);
        }

        // Re-check quantity with locked row (accounting for reservations)
        const totalQuantity = parseFloat(product.quantity?.toString() || "0");
        const activeReservations = await getActiveReservationsForProduct(product.id);
        const availableQuantity = totalQuantity - activeReservations;

        if (availableQuantity < item.quantity) {
          throw new Error(`Insufficient quantity for ${product.name}. Available: ${availableQuantity}, Requested: ${item.quantity}`);
        }

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          productNameFa: item.productNameFa ?? product.nameFa ?? null,
          price: product.price,
          quantity: item.quantity,
          currentQuantity: totalQuantity, // Store for inventory update
        });
      }

      // Create order (using sanitized values)
      const orderStatus = sanitizedPaymentMethod === "online_payment" ? "payment_pending" : "pending";

      const [order] = await tx
        .insert(orders)
        .values({
          userId: orderUserId,
          orderNumber,
          total: sanitizedTotal.toString(),
          paymentMethod: sanitizedPaymentMethod,
          shippingMethod: sanitizedShippingMethod,
          status: orderStatus,
          discountCodeId: finalDiscountCodeId,
          discountAmount: finalDiscountAmount ? finalDiscountAmount.toString() : null,
          invoiceRequested: sanitizedInvoiceRequested,
          shippingProvinceId: sanitizedProvinceId || null,
          shippingCityId: sanitizedCityId || null,
          shippingAddress: sanitizedAddress || null,
          shippingPostalCode: sanitizedPostalCode || null,
        })
        .returning();

      // Create order items
      const orderItemsData = validatedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        productNameFa: item.productNameFa ?? null,
        price: item.price,
        quantity: item.quantity,
      }));

      await tx.insert(orderItems).values(orderItemsData);

      // Record discount code usage if discount was applied (with row-level locking)
      if (finalDiscountCodeId && finalDiscountAmount !== null) {
        // Lock discount code row to prevent concurrent usage
        const lockedCodes = await tx.execute(
          sql`SELECT * FROM discount_codes WHERE id = ${finalDiscountCodeId} FOR UPDATE`
        );
        const codeRecord = lockedCodes[0] as any;

        if (!codeRecord) {
          const error = API_ERRORS.DISCOUNT_CODE_NOT_FOUND;
          throw new Error(JSON.stringify({ error: error.error, errorFa: error.errorFa }));
        }

        // Re-check usage limits with locked row
        if (codeRecord.usageLimit !== null && codeRecord.usageCount >= codeRecord.usageLimit) {
          const error = API_ERRORS.DISCOUNT_CODE_LIMIT_REACHED;
          throw new Error(JSON.stringify({ error: error.error, errorFa: error.errorFa }));
        }

        // Record usage
        await tx.insert(discountCodeUsages).values({
          discountCodeId: finalDiscountCodeId,
          orderId: order.id,
          userId: orderUserId || null,
          discountAmount: finalDiscountAmount.toString(),
        });

        // Increment usage count (row is still locked)
        await tx
          .update(discountCodes)
          .set({
            usageCount: sql`${discountCodes.usageCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(discountCodes.id, finalDiscountCodeId));
      }

      // Update product quantities (inventory) - rows are still locked from SELECT FOR UPDATE
      // Use the locked product data we already fetched to ensure consistency
      for (const item of validatedItems) {
        const currentQty = (item as any).currentQuantity || 0;
        const updatedQty = Math.max(0, currentQty - item.quantity);

        await tx
          .update(products)
          .set({
            quantity: updatedQty,
          })
          .where(eq(products.id, item.productId));
      }

      // Store the guest shipping/contact snapshot.
      if (isGuestOrder) {
        await tx.insert(guestOrders).values({
          orderId: order.id,
          guestName: sanitizedGuestName!,
          guestEmail: sanitizedGuestEmail!,
          guestPhone: sanitizedGuestPhone!,
          provinceId: sanitizedProvinceId!,
          cityId: sanitizedCityId!,
          address: sanitizedAddress!,
          postalCode: sanitizedPostalCode,
        });
      }

      // Create activity and notification for registered users
      if (orderUserId) {
        // Create activity
        await tx.insert(userActivities).values({
          userId: orderUserId,
          activityType: "order_placed",
          activityData: JSON.stringify({ orderNumber }),
        });

        // Create notification
        await tx.insert(notifications).values({
          userId: orderUserId,
          type: "order_pending",
          title: "Order pending payment",
          titleFa: "سفارش در انتظار پرداخت",
          message: `Order #${orderNumber} is pending payment`,
          messageFa: `سفارش #${orderNumber} در انتظار پرداخت است`,
          notificationData: JSON.stringify({ orderId: order.id, orderNumber }),
          isRead: false,
          dismissed: false,
        });
      }

      // Record initial order status in history
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        status: "pending",
        previousStatus: null,
        changedBy: orderUserId || null,
        changedByType: orderUserId ? "user" : "system",
        notes: null,
      });

      // Store idempotency key if provided (inside transaction to ensure atomicity)
      if (idempotencyKey && typeof idempotencyKey === "string" && idempotencyKey.trim() !== "") {
        const sanitizedIdempotencyKey = idempotencyKey.trim();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Expire after 24 hours

        await tx.insert(idempotencyKeys).values({
          idempotencyKey: sanitizedIdempotencyKey,
          orderId: order.id,
          expiresAt,
        });
      }

      return order;
    });

    // Convert reservations to order and release user reservations
    try {
      const sessionId = request.headers.get("x-session-id") || null;
      // Note: We don't convert specific reservations here because we've already deducted inventory
      // Instead, we just release any remaining reservations for this user/session
      await releaseUserReservations(userId, sessionId);
    } catch (reservationError) {
      console.error("Error releasing reservations:", reservationError);
      // Don't fail the order if reservation cleanup fails
    }

    // Note: Admin notifications are automatically generated from the orders table
    // When admins fetch notifications via /api/admin/notifications, new orders appear immediately
    // No additional notification creation needed - the order is already in the database

    // Create activity and notification for registered users (outside transaction for email sending)
    // Note: Activity and notification are already created in transaction above
    // This section only handles email sending which should not be in transaction
    // Skip email for online payment - email will be sent after payment verification in callback
    if (userId && sanitizedPaymentMethod !== "online_payment") {
      // Send order confirmation email or invoice email
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (user?.email && user.emailVerified) {
          const orderItemsForEmail = initialValidatedItems.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.price.toString(),
          }));

          const contactSettingsData = await db
            .select()
            .from(contactSettings)
            .limit(1);

          const contactInfo = contactSettingsData[0] || {};

          await sendOrderConfirmationEmail(user.email, {
            orderNumber,
            customerName: `${user.name} ${user.surname || ""}`.trim(),
            orderDate: newOrder.createdAt.toLocaleDateString("fa-IR"),
            items: orderItemsForEmail,
            total: sanitizedTotal.toString(),
            paymentMethod: sanitizedPaymentMethod || "Unknown",
            language: "fa",
            telegram: contactInfo.telegram || null,
            instagram: contactInfo.instagram || null,
            whatsapp: contactInfo.whatsapp || null,
            contactAddress: contactInfo.address || null,
            contactAddressFa: contactInfo.addressFa || null,
            contactEmail: contactInfo.email || null,
          });
        }
      } catch (emailError) {
        console.error("Error sending order email:", emailError);
        // Don't fail the order if email fails
      }
    }

    // Send email to the guest (shipping snapshot stored).
    // Skip email for online payment - email will be sent after payment verification in callback
    if (isGuestOrder && sanitizedPaymentMethod !== "online_payment") {
      // Send email to guest
      try {
        if (sanitizedGuestEmail) {
          const orderItemsForEmail = initialValidatedItems.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.price.toString(),
          }));

          const contactSettingsData = await db
            .select()
            .from(contactSettings)
            .limit(1);

          const contactInfo = contactSettingsData[0] || {};

          const nameParts = sanitizedGuestName!.trim().split(/\s+/);
          const guestFirstName = nameParts[0] || sanitizedGuestName!;
          const guestSurname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

          await sendGuestOrderConfirmationEmail(sanitizedGuestEmail, {
            orderNumber,
            customerName: guestFirstName,
            customerSurname: guestSurname,
            phone: sanitizedGuestPhone!,
            email: sanitizedGuestEmail!,
            provinceId: sanitizedProvinceId!,
            cityId: sanitizedCityId!,
            address: sanitizedAddress!,
            postalCode: sanitizedPostalCode,
            orderDate: newOrder.createdAt.toLocaleDateString("fa-IR"),
            items: orderItemsForEmail,
            total: sanitizedTotal.toString(),
            paymentMethod: sanitizedPaymentMethod || "Unknown",
            telegram: contactInfo.telegram || null,
            instagram: contactInfo.instagram || null,
            whatsapp: contactInfo.whatsapp || null,
            contactAddress: contactInfo.address || null,
            contactAddressFa: contactInfo.addressFa || null,
            contactEmail: contactInfo.email || null,
          });
        }
      } catch (emailError) {
        console.error("Error sending guest order email:", emailError);
        // Don't fail the order if email fails
      }
    }

    // Note: Product quantities are already updated in the transaction above

    return NextResponse.json(
      {
        success: true,
        order: {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          total: newOrder.total,
        },
        accountCreated: shouldCreateAccount,
      },
      {
        status: 201,
        headers: addRequestIdToHeaders({}, requestId)
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Error creating order:`, error instanceof Error ? error.message : String(error));
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Try to parse bilingual error from transaction
    try {
      const parsedError = JSON.parse(errorMessage);
      if (parsedError.error && parsedError.errorFa) {
        return NextResponse.json(
          { error: parsedError.error, errorFa: parsedError.errorFa },
          {
            status: 500,
            headers: addRequestIdToHeaders({}, requestId)
          }
        );
      }
    } catch {
      // Not a JSON error, use default
    }

    const defaultError = API_ERRORS.FAILED_TO_CREATE_ORDER;
    return NextResponse.json(
      { error: defaultError.error, errorFa: defaultError.errorFa, details: errorMessage },
      {
        status: 500,
        headers: addRequestIdToHeaders({}, requestId)
      }
    );
  }
}
