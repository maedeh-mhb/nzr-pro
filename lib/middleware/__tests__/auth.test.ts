const { TextEncoder, TextDecoder } = require("util");
(globalThis as any).TextEncoder = TextEncoder;
(globalThis as any).TextDecoder = TextDecoder;

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    })),
  },
  NextRequest: class {},
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/services/permissions", () => ({
  hasAnyPermission: jest.fn(),
  hasPermission: jest.fn(),
  hasAllPermissions: jest.fn(),
}));

import { getServerSession } from "next-auth";
import { hasAnyPermission } from "@/lib/services/permissions";
import { requireAdmin, requireAdminWithPermissions } from "../auth";

describe("requireAdminWithPermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows superadmins without checking permission rows", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "super-1", role: "superadmin" },
    });

    const result = await requireAdminWithPermissions({ url: "http://localhost/api" } as any, "edit_users");

    expect(result.authorized).toBe(true);
    expect(hasAnyPermission).not.toHaveBeenCalled();
  });

  it("blocks admins that do not have the required permission", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "admin-1", role: "admin" },
    });
    (hasAnyPermission as jest.Mock).mockResolvedValue(false);

    const result = await requireAdminWithPermissions({ url: "http://localhost/api" } as any, "delete_users");

    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(403);
  });

  it("blocks admins from route-based admin actions without the mapped permission", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "admin-1", role: "admin" },
    });
    (hasAnyPermission as jest.Mock).mockResolvedValue(false);

    const result = await requireAdmin({
      url: "http://localhost/api/admin/products",
      method: "GET",
      nextUrl: { pathname: "/api/admin/products" },
    } as any);

    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(403);
    expect(hasAnyPermission).toHaveBeenCalledWith("admin-1", ["view_products"]);
  });
});
