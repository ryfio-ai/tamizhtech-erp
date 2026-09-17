"use client";

import React, { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Plus, Users, FileText, CreditCard, Briefcase, Package, Calendar } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface QuickActionMenuProps {
  isMobileFloating?: boolean;
}

export function QuickActionMenu({ isMobileFloating = false }: QuickActionMenuProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "ADMIN";

  const isFinanceAllowed = ["SUPER_ADMIN", "ADMIN", "FINANCE"].includes(role);
  const isSalesAllowed = ["SUPER_ADMIN", "ADMIN", "SALES", "MANAGER"].includes(role);
  const isEngineeringAllowed = ["SUPER_ADMIN", "ADMIN", "ENGINEERING", "OPERATIONS"].includes(role);

  const actions = [
    { label: "Add Bill", href: "/invoices/new", icon: FileText, color: "text-brand" },
    { label: "Add Customer", href: "/clients?new=true", icon: Users, color: "text-blue-600" },
    { label: "Add Product", href: "/products", icon: Package, color: "text-amber-600" },
    { label: "Record Payment", href: "/payments/new", icon: CreditCard, color: "text-green-600" },
    { label: "Schedule Follow-up", href: "/followups?new=true", icon: Calendar, color: "text-gray-600" },
    ...(isEngineeringAllowed
      ? [
          { label: "New Project", href: "/projects/new", icon: Briefcase, color: "text-purple-600" },
        ]
      : []),
  ];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {isMobileFloating ? (
          <button
            aria-label="Quick Actions"
            className="md:hidden fixed right-4 bottom-20 z-40 h-14 w-14 rounded-full bg-brand text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform border border-white/20 focus:outline-none"
          >
            <Plus className="w-6 h-6" />
          </button>
        ) : (
          <button
            aria-label="Quick Actions"
            className="h-10 px-3 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create</span>
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={isMobileFloating ? "end" : "end"}
          sideOffset={8}
          className="z-50 min-w-[200px] bg-white rounded-xl shadow-xl border border-border p-1.5 focus:outline-none animate-in fade-in-50 zoom-in-95"
        >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary border-b border-border mb-1">
            Quick Actions
          </div>

          {actions.map((action, idx) => (
            <DropdownMenu.Item key={idx} asChild>
              <Link
                href={action.href}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-ink-primary hover:bg-surface hover:text-brand rounded-lg cursor-pointer transition-colors focus:bg-surface focus:outline-none"
              >
                <action.icon className={`w-4 h-4 ${action.color}`} />
                <span>{action.label}</span>
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
