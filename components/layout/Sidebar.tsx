"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  CalendarClock, 
  ClipboardList, 
  LogOut,
  Hexagon,
  Package,
  Banknote,
  UserCog,
  Briefcase,
  LifeBuoy,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Follow-ups", href: "/followups", icon: CalendarClock, badge: true },
  { name: "Applications", href: "/applications", icon: ClipboardList },
  { name: "Products", href: "/products", icon: Package },
  { name: "Finance", href: "/finance", icon: Banknote },
  { name: "HR & Payroll", href: "/hr", icon: UserCog },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Support", href: "/support", icon: LifeBuoy },
  { name: "Audit Logs", href: "/audit", icon: History },
];

export function Sidebar({ overdueCount = 0 }: { overdueCount?: number }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-navy text-white fixed left-0 top-0 border-r border-navy-light shrink-0 z-50 shadow-xl shadow-navy/10">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 bg-brand shadow-md">
        <Link href="/" className="flex items-center gap-2 group">
          <Hexagon className="w-6 h-6 fill-white text-brand group-hover:rotate-12 transition-transform" />
          <span className="text-xl font-bold tracking-tight text-white">TamizhTech</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group",
                isActive 
                  ? "bg-brand text-white shadow-sm shadow-brand/20" 
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
              {item.name}
              
              {/* Overdue Badge */}
              {item.badge && overdueCount > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {overdueCount > 99 ? '99+' : overdueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div className="p-4 border-t border-navy-light bg-navy/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-xs shrink-0 ring-1 ring-brand/30">
            {session?.user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium text-white truncate">{session?.user?.name || 'Admin'}</span>
            <span className="text-xs text-gray-400 truncate">{session?.user?.email}</span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-white/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
