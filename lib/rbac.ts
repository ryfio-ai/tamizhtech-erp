import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export type Permission =
  | "client.read"
  | "client.create"
  | "client.update"
  | "client.delete"
  | "quotation.read"
  | "quotation.create"
  | "quotation.update"
  | "quotation.approve"
  | "salesOrder.read"
  | "salesOrder.create"
  | "salesOrder.update"
  | "inventory.read"
  | "inventory.adjust"
  | "project.read"
  | "project.create"
  | "project.update"
  | "production.read"
  | "production.update"
  | "procurement.read"
  | "procurement.create"
  | "invoice.read"
  | "invoice.create"
  | "invoice.update"
  | "invoice.delete"
  | "payment.read"
  | "payment.record"
  | "reports.read"
  | "reports.export"
  | "audit.read"
  | "admin.users.manage"
  | "admin.settings.manage";

/**
 * Role-to-Permissions Mapping for TamizhTech ERP
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: [
    "client.read", "client.create", "client.update", "client.delete",
    "quotation.read", "quotation.create", "quotation.update", "quotation.approve",
    "salesOrder.read", "salesOrder.create", "salesOrder.update",
    "inventory.read", "inventory.adjust",
    "project.read", "project.create", "project.update",
    "production.read", "production.update",
    "procurement.read", "procurement.create",
    "invoice.read", "invoice.create", "invoice.update", "invoice.delete",
    "payment.read", "payment.record",
    "reports.read", "reports.export",
    "audit.read",
    "admin.users.manage", "admin.settings.manage"
  ],
  ADMIN: [
    "client.read", "client.create", "client.update", "client.delete",
    "quotation.read", "quotation.create", "quotation.update", "quotation.approve",
    "salesOrder.read", "salesOrder.create", "salesOrder.update",
    "inventory.read", "inventory.adjust",
    "project.read", "project.create", "project.update",
    "production.read", "production.update",
    "procurement.read", "procurement.create",
    "invoice.read", "invoice.create", "invoice.update", "invoice.delete",
    "payment.read", "payment.record",
    "reports.read", "reports.export",
    "audit.read",
    "admin.users.manage", "admin.settings.manage"
  ],
  MANAGER: [
    "client.read", "client.create", "client.update",
    "quotation.read", "quotation.create", "quotation.update", "quotation.approve",
    "salesOrder.read", "salesOrder.create", "salesOrder.update",
    "inventory.read", "inventory.adjust",
    "project.read", "project.create", "project.update",
    "production.read", "production.update",
    "procurement.read", "procurement.create",
    "invoice.read", "invoice.create", "invoice.update",
    "payment.read", "payment.record",
    "reports.read", "reports.export"
  ],
  SALES: [
    "client.read", "client.create", "client.update",
    "quotation.read", "quotation.create", "quotation.update",
    "salesOrder.read", "salesOrder.create",
    "invoice.read", "invoice.create",
    "payment.read"
  ],
  FINANCE: [
    "client.read",
    "quotation.read",
    "salesOrder.read",
    "invoice.read", "invoice.create", "invoice.update",
    "payment.read", "payment.record",
    "procurement.read",
    "reports.read", "reports.export"
  ],
  ENGINEERING: [
    "project.read", "project.create", "project.update",
    "production.read", "production.update",
    "inventory.read",
    "procurement.read"
  ],
  OPERATIONS: [
    "client.read",
    "salesOrder.read",
    "inventory.read", "inventory.adjust",
    "project.read",
    "production.read", "production.update",
    "procurement.read", "procurement.create"
  ],
  VIEWER: [
    "client.read",
    "quotation.read",
    "salesOrder.read",
    "project.read",
    "inventory.read",
    "invoice.read",
    "payment.read",
    "reports.read"
  ]
};

export function hasPermission(role: UserRole | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const userRole = role as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Server-side guard to authenticate session and authorize granular permissions.
 */
export async function requireAuth(permission?: Permission): Promise<
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      success: false,
      response: NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 }),
    };
  }

  const role = (session.user as any).role as UserRole;
  if (permission && !hasPermission(role, permission)) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: `Forbidden: Missing required permission '${permission}'` },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    context: {
      userId: (session.user as any).id || "system",
      email: session.user.email || "",
      name: session.user.name || "",
      role,
    },
  };
}
