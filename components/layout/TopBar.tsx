"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";
import { useSession } from "next-auth/react";

const getPageTitle = (pathname: string | null) => {
  if (!pathname || pathname === "/") return "Dashboard";
  if (pathname.startsWith("/clients")) return "Clients";
  if (pathname.startsWith("/invoices")) return "Invoices";
  if (pathname.startsWith("/payments")) return "Payments";
  if (pathname.startsWith("/followups")) return "Follow-ups";
  if (pathname.startsWith("/applications")) return "Applications";
  return "Overview";
};

export function TopBar({ onMenuClick, overdueCount = 0 }: { onMenuClick?: () => void, overdueCount?: number }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      
      {/* Mobile Menu & Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-navy truncate">{title}</h1>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        
        {/* Search */}
        <div className="hidden sm:flex relative items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3" />
          <input 
            type="text" 
            placeholder="Search across app..." 
            className="h-9 w-64 pl-9 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          {overdueCount > 0 && (
             <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* Profile Avatar */}
        <div className="h-8 w-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
           {session?.user?.image ? (
             <img src={session.user.image} alt="User" className="h-full w-full rounded-full object-cover" />
           ) : (
             <span className="text-xs font-bold text-brand">{session?.user?.name?.charAt(0) || 'A'}</span>
           )}
        </div>
      </div>
    </header>
  );
}
