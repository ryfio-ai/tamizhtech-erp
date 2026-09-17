"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  CalendarClock, 
  Package, 
  Banknote, 
  Briefcase, 
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileCheck,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  overdueCount?: number;
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  overdueCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "ADMIN";

  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isFinance = ["SUPER_ADMIN", "ADMIN", "FINANCE"].includes(role);
  const isSales = ["SUPER_ADMIN", "ADMIN", "SALES", "MANAGER"].includes(role);
  const isOps = ["SUPER_ADMIN", "ADMIN", "OPERATIONS", "ENGINEERING"].includes(role);

  const navigationGroups = [
    {
      title: "Core",
      items: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
      ],
    },
    {
      title: "BUSINESS",
      items: [
        { name: "Customers", href: "/clients", icon: Users },
        { name: "Quotations", href: "/quotations", icon: FileCheck },
        { name: "Products & Stock", href: "/products", icon: Package },
        { name: "Bills", href: "/invoices", icon: FileText },
        { name: "Payments", href: "/payments", icon: CreditCard },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        { name: "Follow-ups", href: "/followups", icon: CalendarClock, badge: overdueCount },
        { name: "Projects", href: "/projects", icon: Briefcase },
        { name: "Expenses", href: "/finance", icon: Banknote },
        { name: "Reports", href: "/reports", icon: BarChart3 },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            title: "SYSTEM",
            items: [
              { name: "Audit Trail", href: "/audit", icon: History },
              { name: "Settings", href: "/settings", icon: Settings },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-navy text-white fixed left-0 top-0 border-r border-navy-light shrink-0 z-50 transition-all duration-200 select-none",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Brand Header with TTRC Logo */}
      <div className="h-16 flex items-center justify-between px-4 bg-navy-dark border-b border-navy-light shrink-0">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <img
            src="/assets/ttrc-logo.png"
            alt="Tamizh Tech Logo"
            className="w-8 h-8 rounded object-contain shrink-0 bg-white/10 p-0.5"
          />
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold tracking-tight text-white truncate">
                TamizhTech ERP
              </span>
              <span className="text-[10px] text-gray-400 truncate">Robotics & Automation</span>
            </div>
          )}
        </Link>

        {/* Collapse Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-navy-light transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-2 space-y-5 overflow-y-auto overscroll-contain">
        {navigationGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <h5 className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                {group.title}
              </h5>
            )}

            {group.items.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group",
                    collapsed ? "justify-center px-0" : "",
                    isActive
                      ? "bg-brand text-white shadow-sm font-semibold"
                      : "text-gray-300 hover:bg-navy-light hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 shrink-0 transition-colors",
                      isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                    )}
                  />

                  {!collapsed && <span className="truncate">{item.name}</span>}

                  {/* Notification Badge */}
                  {item.badge && item.badge > 0 && (
                    <span
                      className={cn(
                        "bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full text-center",
                        collapsed ? "absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center" : "ml-auto"
                      )}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-navy-light bg-navy-dark/70 shrink-0">
        <div className={cn("flex items-center gap-3 mb-2", collapsed ? "justify-center" : "px-2")}>
          <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-brand font-bold text-xs shrink-0">
            {session?.user?.name?.charAt(0) || "T"}
          </div>

          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-white truncate">
                {session?.user?.name || "TamizhTech Admin"}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-green-400" /> {role}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-gray-400 rounded-md hover:bg-navy-light hover:text-red-400 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
