import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInvoiceData, generateInvoiceHTML } from "@/lib/services/invoice";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders/[id]/invoice
 * Generate and download invoice HTML file for an order (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    // Validate order ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }

    const invoiceData = await getInvoiceData(id);
    if (!invoiceData) {
      return NextResponse.json(
        { error: "Order not found or failed to generate invoice" },
        { status: 404 }
      );
    }

    const htmlContent = generateInvoiceHTML(invoiceData);

    // Clean the order ID for filename (remove # and other special characters)
    const cleanId = id.replace(/[#\[\]]/g, '');

    // Return HTML file for download with explicit .html extension
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoice-${cleanId}.html"`,
        "Content-Length": Buffer.byteLength(htmlContent, 'utf-8').toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

  } catch (error) {
    console.error("Error generating invoice:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to generate invoice",
        message: "An internal server error occurred while generating the invoice. Please try again later."
      },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function POST() {
  return NextResponse.json(
    { 
      error: "Method not allowed",
      message: "POST method is not supported. Use GET to download invoice."
    },
    { 
      status: 405,
      headers: {
        "Allow": "GET"
      }
    }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      error: "Method not allowed",
      message: "PUT method is not supported. Use GET to download invoice."
    },
    { 
      status: 405,
      headers: {
        "Allow": "GET"
      }
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      error: "Method not allowed",
      message: "DELETE method is not supported. Use GET to download invoice."
    },
    { 
      status: 405,
      headers: {
        "Allow": "GET"
      }
    }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { 
      error: "Method not allowed",
      message: "PATCH method is not supported. Use GET to download invoice."
    },
    { 
      status: 405,
      headers: {
        "Allow": "GET"
      }
    }
  );
}
