/**
 * Caching utility functions
 * 
 * Note: This is a simple in-memory cache. For production, consider using Redis
 * or a more robust caching solution.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 60 * 1000; // 1 minute default

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern(pattern: string | RegExp): void {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        activeEntries++;
      }
    });

    return {
      total: this.cache.size,
      active: activeEntries,
      expired: expiredEntries,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// Export singleton instance
export const cache = new SimpleCache();

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  categories: () => "categories:all",
  category: (id: string) => `category:${id}`,
  products: (filters?: string) => filters ? `products:list:${filters}` : "products:list:all",
  product: (id: string) => `product:${id}`,
  users: (filters?: string) => filters ? `users:list:${filters}` : "users:list:all",
  user: (id: string) => `user:${id}`,
  orders: (filters?: string) => filters ? `orders:list:${filters}` : "orders:list:all",
  order: (id: string) => `order:${id}`,
  journalCategories: () => "journalCategories:all",
  journalCategory: (id: string) => `journalCategory:${id}`,
  journalPosts: (filters?: string) => filters ? `journal:list:${filters}` : "journal:list:all",
  journalPost: (id: string) => `journal:${id}`,
};

/**
 * Cache TTL constants (in milliseconds)
 */
export const cacheTTL = {
  short: 30 * 1000, // 30 seconds
  medium: 5 * 60 * 1000, // 5 minutes
  long: 15 * 60 * 1000, // 15 minutes
  veryLong: 60 * 60 * 1000, // 1 hour
};

