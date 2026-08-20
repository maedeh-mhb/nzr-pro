"use client";

import { useState, useCallback } from "react";
import { mutate } from "swr";

interface OptimisticUpdateOptions<T> {
  url: string;
  optimisticData: T;
  rollbackData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<T>() {
  const [isUpdating, setIsUpdating] = useState(false);

  const update = useCallback(
    async (
      mutationFn: () => Promise<T>,
      options: OptimisticUpdateOptions<T>
    ) => {
      const { url, optimisticData, rollbackData, onSuccess, onError } = options;

      setIsUpdating(true);

      // Optimistically update cache
      await mutate(url, optimisticData, false);

      try {
        // Perform actual mutation
        const result = await mutationFn();

        // Update cache with real data
        await mutate(url, result, true);

        onSuccess?.(result);
        return result;
      } catch (error) {
        // Rollback on error
        if (rollbackData !== undefined) {
          await mutate(url, rollbackData, false);
        } else {
          // Revalidate to get correct data
          await mutate(url);
        }

        const err = error instanceof Error ? error : new Error("Update failed");
        onError?.(err);
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { update, isUpdating };
}

