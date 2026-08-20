/**
 * Request ID generation and tracking utility
 * Generates unique IDs for tracking requests through the system
 */

import { createId } from "@paralleldrive/cuid2";

/**
 * Generate a unique request ID
 * Format: REQ-{timestamp}-{random}
 */
export function generateRequestId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = createId().substring(0, 8).toUpperCase();
    return `REQ-${timestamp}-${random}`;
}

/**
 * Extract request ID from headers or generate new one
 */
export function getOrCreateRequestId(request: Request): string {
    // Check if request already has an ID
    const existingId = request.headers.get("x-request-id");
    if (existingId) {
        return existingId;
    }

    // Generate new ID
    return generateRequestId();
}

/**
 * Add request ID to response headers
 */
export function addRequestIdToHeaders(
    headers: Record<string, string>,
    requestId: string
): Record<string, string> {
    return {
        ...headers,
        "X-Request-ID": requestId,
    };
}
