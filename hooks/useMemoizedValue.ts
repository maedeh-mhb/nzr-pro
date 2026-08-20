"use client";

import { useMemo, DependencyList } from "react";

/**
 * Enhanced useMemo with better typing and error handling
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: DependencyList
): T {
  return useMemo(() => {
    try {
      return factory();
    } catch (error) {
      console.error("Error in memoized computation:", error);
      throw error;
    }
  }, deps);
}

