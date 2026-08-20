"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPreferences,
  getPreference,
  setPreference,
  setPreferences,
  subscribeToPreferences,
  type PreferenceKey,
} from "@/lib/store/preferences";

/**
 * Hook for managing user preferences with persistence
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState(getPreferences());

  useEffect(() => {
    // Load preferences on mount
    setPrefs(getPreferences());

    // Subscribe to changes
    const unsubscribe = subscribeToPreferences((key, value) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    });

    return unsubscribe;
  }, []);

  const updatePreference = useCallback(
    <K extends PreferenceKey>(key: K, value: any) => {
      setPreference(key, value);
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updatePreferences = useCallback((updates: Partial<typeof prefs>) => {
    setPreferences(updates);
    setPrefs((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    preferences: prefs,
    getPreference: useCallback(
      <K extends PreferenceKey>(key: K) => getPreference(key),
      []
    ),
    setPreference: updatePreference,
    setPreferences: updatePreferences,
  };
}

