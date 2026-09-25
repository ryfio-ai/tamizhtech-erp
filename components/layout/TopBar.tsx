"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu, Calendar, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { QuickActionMenu } from "./QuickActionMenu";
import { GlobalSearchModal } from "./GlobalSearchModal";

interface TopBarProps {
  onMobileMenuClick?: () => void;
  overdueCount?: number;
}

const getPageContext = (pathname: string | null) => {
  if (!pathname || pathname === "/") return { section: "Core", title: "Dashboard" };
  if (pathname.startsWith("/clients")) return { section: "Sales", title: "Customers" };
  if (pathname.startsWith("/leads")) return { section: "Sales", title: "Leads" };
  if (pathname.startsWith("/quotations")) return { section: "Sales", title: "Quotations" };
  if (pathname.startsWith("/orders")) return { section: "Sales", title: "Sales Orders" };
  if (pathname.startsWith("/invoices")) return { section: "Finance", title: "Invoices" };
  if (pathname.startsWith("/payments")) return { section: "Finance", title: "Payments" };
  if (pathname.startsWith("/finance")) return { section: "Finance", title: "Expenses" };
  if (pathname.startsWith("/products")) return { section: "Operations", title: "Products & Stock" };
  if (pathname.startsWith("/projects")) return { section: "Operations", title: "Projects" };
  if (pathname.startsWith("/followups")) return { section: "Sales", title: "Follow-ups" };
  if (pathname.startsWith("/documents")) return { section: "Tools", title: "Documents" };
  if (pathname.startsWith("/audit")) return { section: "System", title: "Audit Trail" };
  if (pathname.startsWith("/settings")) return { section: "System", title: "Company Settings" };
  return { section: "ERP", title: "Overview" };
};

export function TopBar({ onMobileMenuClick, overdueCount = 0 }: TopBarProps) {
  const pathname = usePathname();
  const { title, section } = getPageContext(pathname);
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [liveDateTime, setLiveDateTime] = useState<{ date: string; time: string }>({
    date: "",
    time: "",
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setLiveDateTime({
        date: now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        time: now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Ctrl + K listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-14 sm:h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shrink-0">
        {/* Left Side: Mobile Logo / Breadcrumb Title */}
        <div className="flex items-center gap-3">
          {/* Mobile App Branding */}
          <div className="md:hidden flex items-center gap-2">
            <img
              src="/assets/ttrc-logo.png"
              alt="Logo"
              className="w-7 h-7 object-contain rounded"
            />
            <span className="font-bold text-base text-ink-primary tracking-tight">
              {title}
            </span>
          </div>

          {/* Desktop Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-ink-secondary text-xs uppercase tracking-wider">{section}</span>
            <span className="text-ink-muted">/</span>
            <h2 className="text-base font-bold text-ink-primary tracking-tight">{title}</h2>
          </div>
        </div>

        {/* Center: Live Date & Clock Widget */}
        {liveDateTime.time && (
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs shadow-2xs">
            <div className="flex items-center gap-1.5 font-medium text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-brand" />
              <span>{liveDateTime.date}</span>
            </div>
            <span className="text-gray-300 font-light">|</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-brand">
              <Clock className="w-3.5 h-3.5 text-brand" />
              <span>{liveDateTime.time}</span>
            </div>
          </div>
        )}

        {/* Right Side: Live Clock (compact), Global Search, Quick Action, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Compact Live Clock for tablets (hidden on phones to prevent crowding) */}
          {liveDateTime.time && (
            <div className="hidden sm:flex lg:hidden items-center gap-1 font-mono text-[11px] font-bold text-brand bg-brand/5 px-2 py-1 rounded-lg border border-brand/20">
              <Clock className="w-3 h-3 text-brand" />
              <span>{liveDateTime.time}</span>
            </div>
          )}

          {/* Global Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-9 px-3 text-xs bg-surface border border-border text-ink-secondary hover:text-ink-primary hover:border-brand/40 rounded-lg transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block bg-white text-[10px] px-1.5 py-0.5 rounded border border-border text-ink-muted">
              Ctrl K
            </kbd>
          </button>

          {/* Quick Action Button (Desktop only here, mobile has FAB) */}
          <div className="hidden sm:block">
            <QuickActionMenu />
          </div>

          {/* Notifications */}
          <button
            aria-label="Notifications"
            className="relative p-2 text-ink-secondary hover:text-ink-primary hover:bg-surface rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <Bell className="w-4 h-4" />
            {overdueCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* User Profile Avatar */}
          <div className="h-8 w-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-xs text-brand shrink-0">
            {session?.user?.name?.charAt(0) || "T"}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
