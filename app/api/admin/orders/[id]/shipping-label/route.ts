import { NextRequest, NextResponse } from "next/server";
import { generateShippingLabelPDF } from "@/lib/services/shippingLabel";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders/[id]/shipping-label
 * Generate and download shipping label PDF for an order (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "view_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;

    // Generate PDF shipping label
    const pdfBuffer = await generateShippingLabelPDF(id);

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: "Failed to generate shipping label" },
        { status: 500 }
      );
    }

    // Return PDF as response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="shipping-label-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating shipping label:", error);
    return NextResponse.json(
      { error: "Failed to generate shipping label" },
      { status: 500 }
    );
  }
}

