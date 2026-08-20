/**
 * File validation utilities for security
 */

/**
 * Magic bytes (file signatures) for common image formats
 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff], // JPEG
  ],
  "image/png": [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
  ],
  "image/webp": [
    // WebP format
    [0x52, 0x49, 0x46, 0x46], // RIFF
  ],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
};

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  
  return mimeToExt[mimeType] || "jpg";
}

/**
 * Validate file magic bytes (file signature)
 * @param buffer - File buffer to validate
 * @param expectedMimeType - Expected MIME type
 * @returns true if file signature matches expected type
 */
export function validateFileSignature(
  buffer: Buffer,
  expectedMimeType: string
): boolean {
  const signatures = FILE_SIGNATURES[expectedMimeType];
  
  if (!signatures || signatures.length === 0) {
    return false;
  }

  // Check if buffer is long enough
  if (buffer.length < 8) {
    return false;
  }

  // Check each possible signature for this MIME type
  for (const signature of signatures) {
    if (signature.length > buffer.length) {
      continue;
    }

    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      // Special handling for WebP (check for WEBP string at offset 8)
      if (expectedMimeType === "image/webp") {
        if (buffer.length >= 12) {
          const webpSignature = Buffer.from("WEBP", "ascii");
          const hasWebp = buffer.slice(8, 12).equals(webpSignature);
          return hasWebp;
        }
        return false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Validate image file
 * @param file - File object
 * @param buffer - File buffer
 * @param allowedMimeTypes - Array of allowed MIME types
 * @returns Object with isValid flag and error message if invalid
 */
export function validateImageFile(
  file: File,
  buffer: Buffer,
  allowedMimeTypes: string[]
): { isValid: boolean; error?: string } {
  // Check MIME type
  if (!file.type || !allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Only ${allowedMimeTypes.join(", ")} are allowed.`,
    };
  }

  // Validate file signature (magic bytes)
  if (!validateFileSignature(buffer, file.type)) {
    return {
      isValid: false,
      error: "File content does not match declared file type. File may be corrupted or malicious.",
    };
  }

  return { isValid: true };
}

/**
 * Generate a safe filename without using user input
 * @param prefix - Prefix for the filename (e.g., "product", "hero")
 * @param mimeType - MIME type to determine extension
 * @returns Safe filename
 */
export function generateSafeFilename(prefix: string, mimeType: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = getExtensionFromMimeType(mimeType);
  return `${prefix}-${timestamp}-${randomString}.${extension}`;
}

