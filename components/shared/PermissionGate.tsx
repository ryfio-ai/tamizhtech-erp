"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { hasPermission, Permission } from "@/lib/rbac";

export interface PermissionGateProps {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Enterprise Permission Gate component.
 * Conditionally renders children if the authenticated user possesses the required RBAC permission.
 */
export function PermissionGate({
  permission,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  if (!hasPermission(role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
