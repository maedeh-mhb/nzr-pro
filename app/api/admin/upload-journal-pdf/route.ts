import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { generateSafeFilename } from "@/lib/utils/fileValidation";
import { requireAdmin } from "@/lib/middleware/auth";
import { errorResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) return authResult.response!;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return errorResponse("No file provided", "فایل ارسال نشده است", 400);

    if (file.type !== "application/pdf")
      return errorResponse("Only PDF files are allowed", "فقط فایل PDF مجاز است", 400);

    if (file.size > MAX_FILE_SIZE)
      return errorResponse("File size exceeds 1MB limit", "حجم فایل بیشتر از ۱ مگابایت است", 400);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate PDF magic bytes
    const isValidPdf = PDF_MAGIC.every((byte, i) => buffer[i] === byte);
    if (!isValidPdf)
      return errorResponse("Invalid PDF file", "فایل PDF نامعتبر است", 400);

    const uploadsDir = join(process.cwd(), "public", "uploads", "journal-pdfs");
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const fileName = generateSafeFilename("journal", "application/pdf").replace(/\.[^.]+$/, ".pdf");
    await writeFile(join(uploadsDir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/journal-pdfs/${fileName}` });
  } catch (error) {
    return handleApiError(error, "Failed to upload PDF", "خطا در آپلود فایل PDF");
  }
}
