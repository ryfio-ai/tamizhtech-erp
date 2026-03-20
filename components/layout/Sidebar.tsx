'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  CalendarClock, 
  ClipboardList,
  LogOut
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Follow-ups', href: '/followups', icon: CalendarClock, badge: 0 },
  { name: 'Applications', href: '/applications', icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-navy h-screen fixed left-0 top-0 text-white shadow-xl z-50">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 p-6 bg-brand h-16">
        <div className="h-8 w-8 bg-white rounded flex items-center justify-center text-brand font-bold text-xl">
          T
        </div>
        <span className="text-xl font-bold tracking-tight">TamizhTech</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg transition-all group",
                isActive 
                  ? "bg-brand text-white shadow-lg" 
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "group-hover:text-brand")} />
                <span className="font-medium">{item.name}</span>
              </div>
              {item.badge ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-gray-800 bg-navy/50">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="h-8 w-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-bold text-white uppercase">
            {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'A'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{session?.user?.name || 'Admin'}</span>
            <span className="text-[10px] text-gray-500 truncate">{session?.user?.email}</span>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-3 w-full px-4 py-2 text-gray-400 hover:text-white hover:bg-red-900/20 rounded-lg transition-all group"
        >
          <LogOut className="h-5 w-5 group-hover:text-brand" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
