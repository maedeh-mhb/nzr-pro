/**
 * Image optimization utilities using Sharp
 */

import sharp from "sharp";
import { logger } from "./logger";

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 1-100 for JPEG/WebP
  format?: "jpeg" | "png" | "webp";
  progressive?: boolean; // For JPEG
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 85,
  format: "jpeg",
  progressive: true,
};

/**
 * Optimize an image buffer
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    let pipeline = sharp(inputBuffer);

    // Get image metadata
    const metadata = await pipeline.metadata();

    // Resize if needed
    if (metadata.width && metadata.height) {
      const shouldResize =
        metadata.width > opts.maxWidth || metadata.height > opts.maxHeight;

      if (shouldResize) {
        pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }
    }

    // Convert to desired format with optimization
    switch (opts.format) {
      case "jpeg":
        pipeline = pipeline.jpeg({
          quality: opts.quality,
          progressive: opts.progressive,
          mozjpeg: true, // Use mozjpeg for better compression
        });
        break;
      case "png":
        pipeline = pipeline.png({
          quality: opts.quality,
          compressionLevel: 9,
        });
        break;
      case "webp":
        pipeline = pipeline.webp({
          quality: opts.quality,
        });
        break;
    }

    const optimizedBuffer = await pipeline.toBuffer();

    logger.debug("Image optimized", {
      type: "image_optimization",
      originalSize: inputBuffer.length,
      optimizedSize: optimizedBuffer.length,
      reduction: ((1 - optimizedBuffer.length / inputBuffer.length) * 100).toFixed(2) + "%",
      format: opts.format,
    });

    return optimizedBuffer;
  } catch (error) {
    logger.error("Image optimization failed", error);
    // Return original buffer if optimization fails
    return inputBuffer;
  }
}

/**
 * Optimize image based on MIME type
 */
export async function optimizeImageByMimeType(
  inputBuffer: Buffer,
  mimeType: string,
  options: ImageOptimizationOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  let format: "jpeg" | "png" | "webp" = "jpeg";
  let extension = "jpg";

  // Determine format based on MIME type
  if (mimeType === "image/png") {
    format = "png";
    extension = "png";
  } else if (mimeType === "image/webp") {
    format = "webp";
    extension = "webp";
  } else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    format = "jpeg";
    extension = "jpg";
  } else if (mimeType === "image/gif") {
    // GIFs are converted to JPEG for optimization
    format = "jpeg";
    extension = "jpg";
  }

  const optimizedBuffer = await optimizeImage(inputBuffer, {
    ...options,
    format,
  });

  // Determine output MIME type
  const outputMimeType =
    format === "png"
      ? "image/png"
      : format === "webp"
      ? "image/webp"
      : "image/jpeg";

  return {
    buffer: optimizedBuffer,
    mimeType: outputMimeType,
    extension,
  };
}

/**
 * Get optimal format based on file type
 * Converts GIF to JPEG, keeps PNG/JPEG/WebP as-is but optimizes them
 */
export function getOptimalFormat(mimeType: string): "jpeg" | "png" | "webp" {
  if (mimeType === "image/png") {
    return "png";
  } else if (mimeType === "image/webp") {
    return "webp";
  } else {
    // Convert GIF and JPEG to optimized JPEG
    return "jpeg";
  }
}

