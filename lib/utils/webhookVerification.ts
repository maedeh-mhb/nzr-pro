/**
 * Webhook signature verification utility
 * Verifies payment gateway webhook signatures to ensure authenticity
 */

import crypto from "crypto";

/**
 * Verify webhook signature using HMAC
 * @param payload - The raw webhook payload (string or Buffer)
 * @param signature - The signature from webhook headers
 * @param secret - The webhook secret key
 * @param algorithm - The hashing algorithm (default: sha256)
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
    algorithm: string = "sha256"
): boolean {
    if (!payload || !signature || !secret) {
        return false;
    }

    try {
        // Generate expected signature
        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(payload);
        const expectedSignature = hmac.digest("hex");

        // Constant-time comparison to prevent timing attacks
        return constantTimeCompare(signature, expectedSignature);
    } catch (error) {
        console.error("Error verifying webhook signature:", error);
        return false;
    }
}

/**
 * Verify Stripe webhook signature
 * Stripe uses a different format: t=timestamp,v1=signature
 */
export function verifyStripeWebhook(
    payload: string | Buffer,
    signatureHeader: string,
    secret: string,
    tolerance: number = 300 // 5 minutes tolerance
): boolean {
    if (!payload || !signatureHeader || !secret) {
        return false;
    }

    try {
        // Parse signature header
        const signatures = signatureHeader.split(",").reduce((acc, item) => {
            const [key, value] = item.split("=");
            if (key && value) {
                if (key === "t") {
                    acc.timestamp = parseInt(value, 10);
                } else if (key.startsWith("v")) {
                    acc.signatures.push(value);
                }
            }
            return acc;
        }, { timestamp: 0, signatures: [] as string[] });

        if (!signatures.timestamp || signatures.signatures.length === 0) {
            return false;
        }

        // Check timestamp tolerance
        const currentTime = Math.floor(Date.now() / 1000);
        if (Math.abs(currentTime - signatures.timestamp) > tolerance) {
            return false;
        }

        // Generate expected signature
        const signedPayload = `${signatures.timestamp}.${payload}`;
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(signedPayload);
        const expectedSignature = hmac.digest("hex");

        // Check if any provided signature matches
        return signatures.signatures.some(sig => constantTimeCompare(sig, expectedSignature));
    } catch (error) {
        console.error("Error verifying Stripe webhook:", error);
        return false;
    }
}

/**
 * Verify PayPal webhook signature
 * PayPal uses certificate-based verification
 */
export function verifyPayPalWebhook(
    webhookId: string,
    transmissionId: string,
    transmissionTime: string,
    certUrl: string,
    transmissionSig: string,
    webhookEvent: any,
    secret: string
): boolean {
    // Note: Full PayPal verification requires fetching the certificate from certUrl
    // and verifying the signature using the public key. This is a simplified version.
    // For production, use PayPal's official SDK: @paypal/checkout-server-sdk

    try {
        // Generate expected message for verification
        const expectedMessage = [
            transmissionId,
            transmissionTime,
            webhookId,
            crc32(JSON.stringify(webhookEvent))
        ].join("|");

        // For now, use HMAC with secret (this should be replaced with RSA verification)
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(expectedMessage);
        const expectedSignature = hmac.digest("base64");

        return constantTimeCompare(transmissionSig, expectedSignature);
    } catch (error) {
        console.error("Error verifying PayPal webhook:", error);
        return false;
    }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * CRC32 checksum for PayPal webhook verification
 */
function crc32(str: string): string {
    const table = makeCRCTable();
    let crc = 0 ^ (-1);

    for (let i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return ((crc ^ (-1)) >>> 0).toString(16);
}

/**
 * Generate CRC32 lookup table
 */
function makeCRCTable(): number[] {
    const table: number[] = [];
    let c: number;

    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }

    return table;
}

/**
 * Extract signature from various webhook header formats
 */
export function extractWebhookSignature(headers: Headers): {
    signature: string | null;
    timestamp: string | null;
    algorithm: string;
} {
    // Check common signature header names
    const signatureHeaders = [
        "x-signature",
        "x-webhook-signature",
        "stripe-signature",
        "paypal-transmission-sig",
        "x-hub-signature",
        "x-hub-signature-256",
    ];

    for (const headerName of signatureHeaders) {
        const value = headers.get(headerName);
        if (value) {
            // Determine algorithm from header name
            let algorithm = "sha256";
            if (headerName.includes("256")) {
                algorithm = "sha256";
            } else if (headerName === "x-hub-signature") {
                algorithm = "sha1";
            }

            // For Stripe format, return as-is
            if (headerName === "stripe-signature") {
                return { signature: value, timestamp: null, algorithm };
            }

            // For other formats, extract signature and timestamp if present
            if (value.startsWith("sha256=") || value.startsWith("sha1=")) {
                const [alg, sig] = value.split("=");
                return { signature: sig, timestamp: null, algorithm: alg };
            }

            return { signature: value, timestamp: null, algorithm };
        }
    }

    return { signature: null, timestamp: null, algorithm: "sha256" };
}
