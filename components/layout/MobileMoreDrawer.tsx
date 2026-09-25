"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { 
  X, 
  CalendarClock, 
  FileText, 
  BarChart3, 
  History, 
  Settings, 
  Briefcase, 
  Package, 
  CreditCard,
  Banknote,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Users,
  Cpu,
  Truck
} from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface MobileMoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMoreDrawer({ open, onOpenChange }: MobileMoreDrawerProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "ADMIN";

  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isEngineering = ["SUPER_ADMIN", "ADMIN", "ENGINEERING", "OPERATIONS"].includes(role);

  const menuSections = [
    {
      title: "Business & Sales",
      items: [
        { label: "Quotations", href: "/quotations", icon: FileText, desc: "Estimates & cost proposals" },
        { label: "Invoices & Bills", href: "/invoices", icon: FileText, desc: "GST tax invoices & billing" },
        { label: "Payments", href: "/payments", icon: CreditCard, desc: "Collections & ledger entries" },
        { label: "Customers", href: "/clients", icon: Users, desc: "Client directory & balances" },
        { label: "Website Leads", href: "/submissions", icon: Briefcase, desc: "Public website inquiries" },
        { label: "Products & Stock", href: "/products", icon: Package, desc: "Catalog inventory & pricing" },
      ],
    },
    {
      title: "Daily Operations",
      items: [
        { label: "BOM / Assemblies", href: "/bom", icon: Cpu, desc: "Robotics kits & recipe assembly" },
        { label: "Delivery Challans", href: "/challans", icon: Truck, desc: "Gate passes & dispatches" },
        { label: "Follow-ups", href: "/followups", icon: CalendarClock, desc: "Pending calls & visits" },
        { label: "Projects", href: "/projects", icon: Briefcase, desc: "Active robotics work" },
        { label: "Expenses", href: "/finance", icon: Banknote, desc: "Operational expenses & ledger" },
        { label: "HR & Team", href: "/hr", icon: Users, desc: "Staff directory & payroll" },
        { label: "Job Applications", href: "/applications", icon: FileText, desc: "Candidate applications" },
      ],
    },
    {
      title: "Intelligence & System",
      items: [
        { label: "Reports", href: "/reports", icon: BarChart3, desc: "Revenue & sales metrics" },
        ...(isSuperAdmin
          ? [
              { label: "Audit Logs", href: "/audit", icon: History, desc: "System activity trail" },
              { label: "Company Settings", href: "/settings", icon: Settings, desc: "Business & invoice profile" },
            ]
          : []),
      ],
    },
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 top-16 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col focus:outline-none animate-in slide-in-from-bottom duration-200">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface rounded-t-2xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-xs text-brand">
                {session?.user?.name?.charAt(0) || "T"}
              </div>
              <div>
                <p className="text-sm font-bold text-ink-primary leading-none">{session?.user?.name || "TamizhTech User"}</p>
                <span className="text-[10px] text-ink-secondary flex items-center gap-1 mt-0.5 font-medium uppercase">
                  <ShieldCheck className="w-3 h-3 text-green-600" /> {role}
                </span>
              </div>
            </div>

            <DialogPrimitive.Close className="p-2 text-ink-muted hover:text-ink-primary rounded-full hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Menu Sections List */}
          <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
            {menuSections.map((section, sIdx) => (
              <div key={sIdx}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary px-2 mb-2">
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.items.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-surface active:bg-surface border border-transparent active:border-border transition-colors min-h-[48px]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface border border-border text-ink-primary">
                          <item.icon className="w-4 h-4 text-brand" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{item.label}</p>
                          <p className="text-xs text-ink-secondary">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-muted" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Logout Row */}
            <div className="pt-2 border-t border-border">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-sm font-medium min-h-[48px]"
              >
                <div className="p-2 rounded-lg bg-red-50 text-red-600">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
