/**
 * Request origin validation utility for security
 */

/**
 * Get allowed origins from environment variables
 */
function getAllowedOrigins(): string[] {
  const allowedOrigins: string[] = [];
  
  // Get from environment variable (comma-separated)
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    allowedOrigins.push(...envOrigins.split(",").map(origin => origin.trim()));
  }
  
  // Add NEXTAUTH_URL if set
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    try {
      const url = new URL(nextAuthUrl);
      allowedOrigins.push(url.origin);
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Add development origins
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push(
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001"
    );
  }
  
  // Remove duplicates
  return [...new Set(allowedOrigins)];
}

/**
 * Extract origin from request headers
 */
function extractOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      return url.origin;
    } catch (e) {
      return null;
    }
  }
  
  // Fallback to referer
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return url.origin;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

/**
 * Validate request origin
 * @param request - The incoming request
 * @returns true if origin is valid, false otherwise
 */
export function validateOrigin(request: Request): boolean {
  const allowedOrigins = getAllowedOrigins();
  
  // If no origins configured, allow all in development, deny in production
  if (allowedOrigins.length === 0) {
    return process.env.NODE_ENV === "development";
  }
  
  const requestOrigin = extractOrigin(request);
  
  if (!requestOrigin) {
    // No origin header - could be a direct API call
    // In production, we might want to be stricter
    // For now, allow in development, deny in production
    return process.env.NODE_ENV === "development";
  }
  
  return allowedOrigins.includes(requestOrigin);
}

/**
 * Get origin validation error message
 */
export function getOriginValidationError(): { error: string; status: number } {
  return {
    error: "Invalid request origin",
    status: 403,
  };
}

