/**
 * Redis-based rate limiting utility for API endpoints
 * Falls back to in-memory rate limiting if Redis is not available
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fallback store for rate limiting (when Redis is not available)
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
 * Get Redis client (returns null if Redis is not configured)
 */
async function getRedisClient() {
  try {
    // Try to use Redis if available
    // For now, we'll create a structure that can be easily updated when Redis is added
    // You'll need to install: npm install ioredis (or @upstash/redis for serverless)
    
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return null;
    }

    // Dynamically import Redis client (install ioredis or @upstash/redis)
    // Example with ioredis:
    // const Redis = (await import("ioredis")).default;
    // return new Redis(redisUrl);
    
    // For now, return null to use in-memory fallback
    // TODO: Uncomment and configure when Redis is set up
    // const Redis = (await import("ioredis")).default;
    // return new Redis(redisUrl);
    
    return null;
  } catch (error) {
    console.warn("Redis not available, using in-memory rate limiting:", error);
    return null;
  }
}

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
 * Check rate limit using Redis (with in-memory fallback)
 * @param identifier - Unique identifier (user ID or IP)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and reset time
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; resetTime: number; remaining: number }> {
  const redis = await getRedisClient();
  
  if (redis) {
    // Use Redis-based rate limiting
    // TODO: Implement Redis-based rate limiting when Redis client is configured
    // Example implementation:
    /*
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const resetTime = windowStart + windowMs;
    
    // Increment counter
    const count = await redis.incr(key);
    
    // Set expiration
    if (count === 1) {
      await redis.pexpire(key, windowMs);
    }
    
    const remaining = Math.max(0, maxRequests - count);
    
    return {
      allowed: count <= maxRequests,
      resetTime,
      remaining,
    };
    */
  }
  
  // Fallback to in-memory rate limiting
  return checkRateLimitInMemory(identifier, maxRequests, windowMs);
}

/**
 * In-memory rate limiting (fallback)
 */
function checkRateLimitInMemory(
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
export function getRateLimitError(resetTime: number): { error: string; status: number; retryAfter: number } {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
  return {
    error: "Too many requests. Please try again later.",
    status: 429,
    retryAfter: Math.max(1, retryAfter),
  };
}

