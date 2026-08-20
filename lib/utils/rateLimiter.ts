/**
 * Rate limiting utility for API endpoints
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed systems
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime + 60000) { // 1 minute after reset time
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * Get identifier for rate limiting (user ID or IP address)
 */
export function getRateLimitIdentifier(
  userId: string | null | undefined,
  ipAddress: string | null | undefined
): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  if (ipAddress) {
    return `ip:${ipAddress}`;
  }
  
  // Fallback to anonymous
  return "anonymous";
}

/**
 * Extract IP address from request
 */
export function extractIpAddress(request: Request): string | null {
  // Check various headers for IP (in case of proxies)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback to connection remote address (if available)
  // Note: This won't work in serverless environments
  return null;
}

/**
 * Check rate limit
 * @param identifier - Unique identifier (user ID or IP)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and reset time
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry) {
    // First request
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    
    return {
      allowed: true,
      resetTime: now + windowMs,
      remaining: maxRequests - 1,
    };
  }
  
  // Check if window has expired
  if (now > entry.resetTime) {
    // Reset counter
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    
    return {
      allowed: true,
      resetTime: now + windowMs,
      remaining: maxRequests - 1,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0,
    };
  }
  
  // Increment counter
  entry.count += 1;
  rateLimitStore.set(identifier, {
    count: entry.count,
    resetTime: entry.resetTime,
  });
  
  return {
    allowed: true,
    resetTime: entry.resetTime,
    remaining: maxRequests - entry.count,
  };
}

/**
 * Get rate limit error response
 */
export function getRateLimitError(resetTime: number): { error: string; errorFa: string; status: number; retryAfter: number } {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
  return {
    error: "Too many requests. Please try again later.",
    errorFa: "درخواست‌های زیادی ارسال شده است. لطفاً بعداً دوباره امتحان کنید.",
    status: 429,
    retryAfter: Math.max(1, retryAfter),
  };
}

