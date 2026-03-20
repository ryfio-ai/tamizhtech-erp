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
  X 
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Follow-ups', href: '/followups', icon: CalendarClock },
  { name: 'Applications', href: '/applications', icon: ClipboardList },
];

export default function MobileNav({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const pathname = usePathname();

  return (
    <div className={cn(
      "fixed inset-0 z-[100] md:hidden transition-opacity duration-300",
      isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
    )}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sidebar Content */}
      <aside className={cn(
        "absolute left-0 top-0 bottom-0 w-72 bg-navy text-white transition-transform duration-300 ease-in-out shadow-2xl flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 bg-brand">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-white rounded flex items-center justify-center text-brand font-bold text-xl">
              T
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TamizhTech</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center space-x-4 px-4 py-4 rounded-xl transition-all",
                  isActive 
                    ? "bg-brand text-white shadow-lg" 
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <item.icon className={cn("h-6 w-6", isActive ? "text-white" : "text-gray-500")} />
                <span className="font-semibold text-lg">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-gray-800">
           <button
            onClick={() => {
              signOut();
              onClose();
            }}
            className="w-full bg-brand/10 hover:bg-brand text-brand hover:text-white px-4 py-3 rounded-xl font-bold transition-all border border-brand/20"
          >
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
}
