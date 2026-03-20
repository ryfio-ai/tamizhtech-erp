'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, Menu, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { signOut, useSession } from 'next-auth/react';

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const getPageTitle = () => {
    const path = pathname.split('/')[1] || 'Dashboard';
    return path.charAt(0) ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard';
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 md:left-64 z-30 shadow-sm">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-6 w-6 text-navy" />
        </Button>
        <h2 className="text-xl font-bold text-navy truncate">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Global Search */}
        <div className="hidden sm:flex items-center relative max-w-xs">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search clients, invoices..." 
            className="pl-9 bg-gray-50 border-gray-100 focus:bg-white transition-all w-64"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-brand">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-brand rounded-full border-2 border-white"></span>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-gray-100 p-0 overflow-hidden border">
              {session?.user?.image ? (
                <img src={session.user.image} alt="User" className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-gray-400" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 overflow-hidden">
               <p className="text-sm font-medium truncate">{session?.user?.name || 'Admin'}</p>
               <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
