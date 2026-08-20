/**
 * Honeypot field utility for bot detection
 * Add these hidden fields to forms to detect automated bot submissions
 */

export interface HoneypotFields {
    website: string;
    company: string;
}

/**
 * Check if honeypot fields have been filled (indicates bot)
 * @param fields - Honeypot field values
 * @returns true if bot detected (fields filled), false if legitimate user
 */
export function isBot(fields: HoneypotFields): boolean {
    return fields.website !== "" || fields.company !== "";
}

/**
 * Initialize honeypot state
 */
export function initHoneypot(): HoneypotFields {
    return {
        website: "",
        company: "",
    };
}

/**
 * React component props for honeypot fields
 */
export interface HoneypotProps {
    fields: HoneypotFields;
    onChange: (field: keyof HoneypotFields, value: string) => void;
}

/**
 * Render honeypot fields (for use in JSX)
 * Returns JSX for hidden input fields
 */
export const renderHoneypotFields = (props: HoneypotProps) => {
    return (
        <div
            style={{
                position: "absolute",
                left: "-9999px",
                opacity: 0,
                pointerEvents: "none",
            }}
            aria-hidden="true"
        >
            <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={props.fields.website}
                onChange={(e) => props.onChange("website", e.target.value)}
            />
            <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={props.fields.company}
                onChange={(e) => props.onChange("company", e.target.value)}
            />
        </div>
    );
};
