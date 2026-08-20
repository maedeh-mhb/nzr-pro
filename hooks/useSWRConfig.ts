"use client";

import { SWRConfiguration } from "swr";
import { enhancedFetch } from "@/lib/utils/fetch";

/**
 * SWR configuration with enhanced fetch
 */
export const swrConfig: SWRConfiguration = {
  fetcher: async (url: string) => {
    const response = await enhancedFetch(url, {
      cache: "default",
      retries: 3,
      timeout: 30000,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000, // 2 seconds
  focusThrottleInterval: 5000,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  shouldRetryOnError: (error) => {
    // Retry on network errors and 5xx errors
    if (error.message.includes("timeout") || error.message.includes("network")) {
      return true;
    }
    return false;
  },
  onError: (error) => {
    console.error("SWR Error:", error);
  },
};

