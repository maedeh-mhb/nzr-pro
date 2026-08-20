import { NextRequest } from "next/server";

/**
 * Validate CSRF token
 * @param request - The incoming request
 * @param token - The CSRF token from request body
 * @returns true if valid, false otherwise
 */
export async function validateCsrfToken(
  request: NextRequest,
  token: string | null | undefined
): Promise<boolean> {
  if (!token) {
    return false;
  }
  
  const storedToken = request.cookies.get("csrf-token")?.value;
  
  if (!storedToken) {
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(storedToken, token);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

