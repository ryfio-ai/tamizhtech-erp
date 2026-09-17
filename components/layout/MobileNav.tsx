"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Package, FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileMoreDrawer } from "./MobileMoreDrawer";

export function MobileNav({ overdueCount = 0 }: { overdueCount?: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const navTabs = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Customers", href: "/clients", icon: Users },
    { name: "Stock", href: "/products", icon: Package },
    { name: "Bills", href: "/invoices", icon: FileText },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around px-1 z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {navTabs.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] relative transition-colors",
                isActive ? "text-brand" : "text-ink-secondary hover:text-ink-primary"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
                {item.href === "/invoices" && overdueCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              <span className={cn("text-[10px] mt-1 tracking-tight", isActive ? "font-bold" : "font-normal")}>
                {item.name}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand rounded-b-full" />
              )}
            </Link>
          );
        })}

        {/* More Tab */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] relative text-ink-secondary hover:text-ink-primary transition-colors",
            moreOpen ? "text-brand" : ""
          )}
        >
          <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] mt-1 tracking-tight">More</span>
        </button>
      </nav>

      {/* Role-Aware More Drawer */}
      <MobileMoreDrawer open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
