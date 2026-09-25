"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { QuickActionMenu } from "./QuickActionMenu";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  // Read saved sidebar preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tt_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tt_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Fetch pending followups / overdue badge count once
  useEffect(() => {
    fetch("/api/followups")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const now = new Date();
          const count = data.data.filter(
            (f: any) => f.status === "Pending" && f.date && new Date(f.date) < now
          ).length;
          setOverdueCount(count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        overdueCount={overdueCount}
      />

      {/* Main Workspace Container */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-200",
          collapsed ? "md:ml-[72px]" : "md:ml-64"
        )}
      >
        {/* Top Header */}
        <TopBar overdueCount={overdueCount} />

        {/* Content Region: clean spacing, safe mobile bottom clearance */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-32 md:pb-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile App Bottom Navigation (5 tabs) */}
      <MobileNav overdueCount={overdueCount} />

      {/* Mobile Floating Quick Action Button */}
      <QuickActionMenu isMobileFloating />
    </div>
  );
}
