"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, CalendarClock, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
  { name: "Dash", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Follow", href: "/followups", icon: CalendarClock, badge: true },
  { name: "Apps", href: "/applications", icon: ClipboardList },
];

export function MobileNav({ overdueCount = 0 }: { overdueCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 z-50 pb-safe shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.1)]">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 relative",
              isActive ? "text-brand" : "text-gray-500 hover:text-navy"
            )}
          >
            <div className="relative">
              <item.icon className={cn("w-5 h-5", isActive ? "fill-brand/10" : "")} />
              {item.badge && overdueCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            <span className={cn("text-[10px] font-medium", isActive ? "font-semibold" : "")}>
              {item.name}
            </span>
            
            {/* Active Indicator Top Bar */}
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand rounded-b-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
