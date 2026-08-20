import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { generateSafeFilename } from "@/lib/utils/fileValidation";
import { logger } from "@/lib/utils/logger";
import { requireAdmin } from "@/lib/middleware/auth";
import { errorResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a", "audio/mp4"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      logger.warn("No file provided in formData", { type: "audio_upload" });
      return errorResponse("No file provided", "فایل ارسال نشده است", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(
        "File size exceeds 20MB limit.",
        "حجم فایل بیشتر از 20 مگابایت است",
        400
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        "Invalid file type. Allowed: MP3, WAV, OGG, M4A",
        "نوع فایل نامعتبر است. فرمت‌های مجاز: MP3, WAV, OGG, M4A",
        400
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), "public", "uploads", "audio");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const extension = file.name.split('.').pop() || 'mp3';
    const fileName = generateSafeFilename("audio", file.type);
    const filePath = join(uploadsDir, fileName);

    try {
      await writeFile(filePath, buffer);
    } catch (writeError) {
      logger.error("Error writing audio file", writeError);
      return errorResponse("Failed to save file to disk", "خطا در ذخیره فایل", 500);
    }

    logger.info("Audio file uploaded", {
      type: "audio_upload",
      fileName,
      fileSize: buffer.length,
      userId: authResult.session?.user?.id,
    });

    const publicUrl = `/uploads/audio/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    logger.error("Error uploading audio", error);
    return handleApiError(error, "Failed to upload audio", "خطا در آپلود فایل صوتی");
  }
}
