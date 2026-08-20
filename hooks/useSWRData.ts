"use client";

import useSWR from "swr";
import { enhancedFetch } from "@/lib/utils/fetch";

interface UseSWRDataOptions {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  dedupingInterval?: number;
  refreshInterval?: number;
  retryOnError?: boolean;
  retryCount?: number;
}

/**
 * Enhanced SWR hook with optimized fetch
 */
export function useSWRData<T = any>(
  url: string | null,
  options: UseSWRDataOptions = {}
) {
  const {
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    dedupingInterval = 2000,
    refreshInterval,
    retryOnError = true,
    retryCount = 3,
  } = options;

  const { data, error, isLoading, mutate } = useSWR<T>(
    url,
    async (url: string) => {
      const response = await enhancedFetch(url, {
        cache: "default",
        retries: retryCount,
        timeout: 30000,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    {
      revalidateOnFocus,
      revalidateOnReconnect,
      dedupingInterval,
      refreshInterval,
      errorRetryCount: retryOnError ? retryCount : 0,
      shouldRetryOnError: (error) => {
        // Retry on network errors and 5xx errors
        if (error.message.includes("timeout") || error.message.includes("network")) {
          return true;
        }
        if (error.message.includes("status: 5")) {
          return true;
        }
        return false;
      },
    }
  );

  return {
    data,
    error,
    isLoading,
    isError: !!error,
    mutate,
  };
}

