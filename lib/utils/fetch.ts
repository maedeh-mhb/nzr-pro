/**
 * Enhanced fetch utility with:
 * - Request batching
 * - Caching
 * - Retry logic
 * - Timeout handling
 * - Request deduplication
 */

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: RequestCache;
  skipDedup?: boolean;
}

interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
}

// Request deduplication cache
const pendingRequests = new Map<string, PendingRequest>();
const CACHE_DURATION = 100; // 100ms deduplication window

// Response cache
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Request batching
interface BatchedRequest {
  url: string;
  options: FetchOptions;
  resolve: (value: Response) => void;
  reject: (reason?: any) => void;
}

let batchQueue: BatchedRequest[] = [];
let batchTimer: NodeJS.Timeout | null = null;
const BATCH_DELAY = 50; // 50ms batching window

/**
 * Create a cache key from URL and options
 */
function createCacheKey(url: string, options?: FetchOptions): string {
  const method = options?.method || "GET";
  const body = options?.body ? JSON.stringify(options.body) : "";
  return `${method}:${url}:${body}`;
}

/**
 * Check if request is within deduplication window
 */
function isRequestPending(key: string): boolean {
  const pending = pendingRequests.get(key);
  if (!pending) return false;
  
  const age = Date.now() - pending.timestamp;
  if (age > CACHE_DURATION) {
    pendingRequests.delete(key);
    return false;
  }
  
  return true;
}

/**
 * Process batched requests
 */
async function processBatch() {
  if (batchQueue.length === 0) return;
  
  const batch = [...batchQueue];
  batchQueue = [];
  batchTimer = null;
  
  // Execute requests in parallel
  const results = await Promise.allSettled(
    batch.map(({ url, options }) => fetch(url, options))
  );
  
  // Resolve/reject each promise
  results.forEach((result, index) => {
    const { resolve, reject } = batch[index];
    if (result.status === "fulfilled") {
      resolve(result.value);
    } else {
      reject(result.reason);
    }
  });
}

/**
 * Enhanced fetch with timeout
 */
function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
  timeout: number = 30000
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Retry logic
 */
async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  retries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeout = options.timeout || 30000;
      const response = await fetchWithTimeout(url, options, timeout);

      // Retry on 5xx errors
      if (response.status >= 500 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && error.message.includes("timeout")) {
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
      }
      
      if (attempt === retries) {
        throw lastError;
      }
      
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  throw lastError || new Error("Request failed");
}

/**
 * Enhanced fetch function with all optimizations
 */
export async function enhancedFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    cache = "default",
    skipDedup = false,
    ...fetchOptions
  } = options;

  const cacheKey = createCacheKey(url, options);

  // Check response cache
  if (cache === "force-cache" || cache === "default") {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Return cached response as a new Response object
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Request deduplication
  if (!skipDedup && isRequestPending(cacheKey)) {
    const pending = pendingRequests.get(cacheKey)!;
    return pending.promise;
  }

  // Create fetch promise
  const fetchPromise = fetchWithRetry(url, { ...fetchOptions, timeout, retries, retryDelay }, retries, retryDelay)
    .then(async (response) => {
      // Cache successful GET requests
      if (fetchOptions.method === "GET" || !fetchOptions.method) {
        try {
          const data = await response.clone().json();
          responseCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000, // 5 minutes default TTL
          });
        } catch {
          // Not JSON, don't cache
        }
      }

      // Clean up pending request
      pendingRequests.delete(cacheKey);
      return response;
    })
    .catch((error) => {
      pendingRequests.delete(cacheKey);
      throw error;
    });

  // Store pending request
  if (!skipDedup) {
    pendingRequests.set(cacheKey, {
      promise: fetchPromise,
      timestamp: Date.now(),
    });
  }

  return fetchPromise;
}

/**
 * Batch multiple requests together
 */
export function batchFetch(requests: Array<{ url: string; options?: FetchOptions }>): Promise<Response[]> {
  return Promise.all(requests.map(({ url, options }) => enhancedFetch(url, options)));
}

/**
 * Clear response cache
 */
export function clearCache(pattern?: string) {
  if (pattern) {
    const regex = new RegExp(pattern);
    for (const key of responseCache.keys()) {
      if (regex.test(key)) {
        responseCache.delete(key);
      }
    }
  } else {
    responseCache.clear();
  }
}

/**
 * Prefetch data
 */
export function prefetch(url: string, options?: FetchOptions): Promise<void> {
  return enhancedFetch(url, { ...options, skipDedup: true })
    .then(() => undefined)
    .catch(() => undefined); // Silently fail prefetch
}

