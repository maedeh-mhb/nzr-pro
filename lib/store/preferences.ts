/**
 * User preferences state management with persistence
 */

export type PreferenceKey =
  | "sidebarCollapsed"
  | "sidebarWidth"
  | "language"
  | "theme"
  | "tablePageSize"
  | "dateFormat"
  | "currency";

interface Preferences {
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
  language?: "en" | "fa";
  theme?: "light" | "dark";
  tablePageSize?: number;
  dateFormat?: string;
  currency?: string;
}

const STORAGE_KEY = "nzr_preferences";

/**
 * Get all preferences
 */
export function getPreferences(): Preferences {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Get a specific preference
 */
export function getPreference<K extends PreferenceKey>(
  key: K
): Preferences[K] | undefined {
  const preferences = getPreferences();
  return preferences[key];
}

/**
 * Set a preference
 */
export function setPreference<K extends PreferenceKey>(
  key: K,
  value: Preferences[K]
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const preferences = getPreferences();
    preferences[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

    // Dispatch custom event for state synchronization
    window.dispatchEvent(
      new CustomEvent("preferencesChanged", {
        detail: { key, value },
      })
    );
  } catch (error) {
    console.error("Error saving preference:", error);
  }
}

/**
 * Set multiple preferences at once
 */
export function setPreferences(updates: Partial<Preferences>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const preferences = getPreferences();
    Object.assign(preferences, updates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

    // Dispatch custom event
    window.dispatchEvent(
      new CustomEvent("preferencesChanged", {
        detail: updates,
      })
    );
  } catch (error) {
    console.error("Error saving preferences:", error);
  }
}

/**
 * Clear all preferences
 */
export function clearPreferences(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("preferencesChanged", { detail: {} }));
}

/**
 * Hook-like function to subscribe to preference changes
 */
export function subscribeToPreferences(
  callback: (key: PreferenceKey, value: any) => void
): () => void {
  if (typeof window === "undefined") {
    return () => { };
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    const updates = customEvent.detail;
    Object.entries(updates).forEach(([key, value]) => {
      callback(key as PreferenceKey, value);
    });
  };

  window.addEventListener("preferencesChanged", handler);

  return () => {
    window.removeEventListener("preferencesChanged", handler);
  };
}

