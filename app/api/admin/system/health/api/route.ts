import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const baseUrl = request.nextUrl.origin;
    const cookie = request.headers.get("cookie") || "";

    // Helper function for endpoint checks (GET)
    const checkEndpoint = async (name: string, path: string) => {
      const startTime = Date.now();
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          headers: { Cookie: cookie },
        });
        const responseTime = Date.now() - startTime;
        return {
          name,
          path,
          status: response.ok ? "healthy" : "unhealthy",
          statusCode: response.status,
          responseTime,
          error: response.ok ? null : `HTTP ${response.status}`,
        };
      } catch (error: any) {
        return {
          name,
          path,
          status: "unhealthy",
          statusCode: 0,
          responseTime: Date.now() - startTime,
          error: error.message,
        };
      }
    };

    // Special check for Order Creation (POST)
    const checkOrderCreation = async () => {
      const name = "Order Creation";
      const path = "/api/orders";
      const startTime = Date.now();
      try {
        // Dummy payload for POST (minimal valid order, adjust as needed)
        const payload = {
          csrfToken: "dummy",
          idempotencyKey: `health-check-${Date.now()}`,
          // Add other required fields if needed by your API
        };
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: JSON.stringify(payload),
        });
        const responseTime = Date.now() - startTime;
        // Accept 201/200/403/422 as healthy (endpoint reachable, logic enforced)
        const healthyStatuses = [200, 201, 403, 422];
        return {
          name,
          path,
          status: healthyStatuses.includes(response.status) ? "healthy" : "unhealthy",
          statusCode: response.status,
          responseTime,
          error: healthyStatuses.includes(response.status) ? null : `HTTP ${response.status}`,
        };
      } catch (error: any) {
        return {
          name,
          path,
          status: "unhealthy",
          statusCode: 0,
          responseTime: Date.now() - startTime,
          error: error.message,
        };
      }
    };

    // Check Gmail/Email Service
    const checkEmailService = async () => {
      const startTime = Date.now();
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER || process.env.GMAIL_USER,
            pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD,
          },
        });

        await transporter.verify();
        const responseTime = Date.now() - startTime;
        return {
          name: "Email Service (Gmail)",
          path: "SMTP Connection",
          status: "healthy",
          statusCode: 200,
          responseTime,
          error: null,
        };
      } catch (error: any) {
        return {
          name: "Email Service (Gmail)",
          path: "SMTP Connection",
          status: "unhealthy",
          statusCode: 0,
          responseTime: Date.now() - startTime,
          error: error.message,
        };
      }
    };

    // Check Redis (disabled - Redis not installed)
    const checkRedis = async () => {
      const startTime = Date.now();
      return {
        name: "Redis Cache",
        path: "Redis Connection",
        status: "disabled",
        statusCode: 0,
        responseTime: Date.now() - startTime,
        error: "Redis not installed (optional feature)",
      };
    };

    // Check Authentication
    const checkAuth = async () => {
      const startTime = Date.now();
      try {
        // Verify current session is valid
        const testSession = await getServerSession(authOptions);
        const responseTime = Date.now() - startTime;

        if (testSession?.user) {
          return {
            name: "Authentication System",
            path: "NextAuth Session",
            status: "healthy",
            statusCode: 200,
            responseTime,
            error: null,
          };
        } else {
          return {
            name: "Authentication System",
            path: "NextAuth Session",
            status: "unhealthy",
            statusCode: 401,
            responseTime,
            error: "Session validation failed",
          };
        }
      } catch (error: any) {
        return {
          name: "Authentication System",
          path: "NextAuth Session",
          status: "unhealthy",
          statusCode: 0,
          responseTime: Date.now() - startTime,
          error: error.message,
        };
      }
    };

    // Run all checks in parallel
    const checks = await Promise.all([
      // Original checks
      checkEndpoint("Products API", "/api/admin/products"),
      checkEndpoint("Orders API", "/api/admin/orders"),
      checkEndpoint("Users API", "/api/admin/users"),
      checkEndpoint("Dashboard Stats", "/api/admin/dashboard/stats"),

      // New critical checks
      checkEmailService(),
      checkOrderCreation(),
      checkEndpoint("Cart Operations", "/api/cart"),
      checkAuth(),
      checkRedis(),
      checkEndpoint("CSRF Token", "/api/csrf-token"),
    ]);

    return NextResponse.json({
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking API health:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

