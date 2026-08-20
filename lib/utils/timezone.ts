// Centralized timezone utility

export function getSiteTimezone(settings?: { timezone?: string }): string {
    // Accepts settings object, returns a valid IANA timezone string
    // Defaults to Asia/Tehran if not set or invalid
    if (!settings || !settings.timezone) return "Asia/Tehran";
    const tz = settings.timezone.toLowerCase();
    if (tz === "asia/tehran" || tz === "tehran") return "Asia/Tehran";
    if (tz === "utc") return "UTC";
    if (tz === "est") return "America/New_York";
    if (tz === "pst") return "America/Los_Angeles";
    // fallback
    return "Asia/Tehran";
}

export function formatDateWithTimezone(date: Date | string, timezone: string, options?: Intl.DateTimeFormatOptions, locale: string = "en-US") {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        ...options,
    }).format(d);
}
