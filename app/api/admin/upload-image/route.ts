import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { validateImageFile, generateSafeFilename } from "@/lib/utils/fileValidation";
import { optimizeImageByMimeType } from "@/lib/utils/imageOptimization";
import { logger } from "@/lib/utils/logger";
import { requireAdmin } from "@/lib/middleware/auth";
import { errorResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
export const dynamic = "force-dynamic";

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Disable body parsing for file uploads
export const runtime = "nodejs";

// Upload image (hero images)
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      logger.warn("No file provided in formData", { type: "image_upload" });
      return errorResponse("No file provided", "فایل ارسال نشده است", 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(
        "File size exceeds 5MB limit.",
        "حجم فایل بیشتر از 5 مگابایت است",
        400
      );
    }

    // Convert File to Buffer for validation
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate file type and magic bytes (file signature)
    const validation = validateImageFile(file, buffer, ALLOWED_MIME_TYPES);
    if (!validation.isValid) {
      return errorResponse(validation.error || "Invalid file type", "نوع فایل نامعتبر است", 400);
    }

    // Optimize image
    const { buffer: optimizedBuffer, extension } = await optimizeImageByMimeType(
      buffer,
      file.type,
      {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 85,
      }
    );

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "hero");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate safe filename without using user input
    const fileName = generateSafeFilename("hero", `image/${extension}`);
    const filePath = join(uploadsDir, fileName);
    
    try {
      // Save optimized file
      await writeFile(filePath, optimizedBuffer);
    } catch (writeError) {
      logger.error("Error writing file", writeError);
      return errorResponse("Failed to save file to disk", "خطا در ذخیره فایل", 500);
    }

    logger.info("Hero image uploaded and optimized", {
      type: "image_upload",
      fileName,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      userId: authResult.session?.user?.id,
    });

    // Return the public URL
    const publicUrl = `/uploads/hero/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    logger.error("Error uploading image", error);
    return handleApiError(error, "Failed to upload image", "خطا در آپلود تصویر");
  }
}

