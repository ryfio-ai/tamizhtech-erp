"use client";

import React, { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { 
  Search, 
  X, 
  Users, 
  FileText, 
  CreditCard, 
  Package, 
  Briefcase, 
  CalendarClock, 
  ArrowRight, 
  Inbox, 
  FileCheck, 
  ShoppingCart, 
  Truck, 
  ClipboardList,
  Plus,
  Banknote,
  Sparkles,
  Command,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Customer" | "Invoice" | "Payment" | "Product" | "Project" | "Follow-up" | "Submission" | "Quotation" | "Order" | "Supplier" | "Procurement";
  href: string;
}

const QUICK_ACTIONS = [
  {
    title: "Create New Bill",
    subtitle: "Issue a new GST bill or draft invoice",
    icon: FileText,
    href: "/invoices/new",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    title: "New Customer",
    subtitle: "Add customer contact and GST details",
    icon: Users,
    href: "/clients?new=true",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    title: "Add Product",
    subtitle: "Create a new product or component in catalog",
    icon: Package,
    href: "/products",
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    title: "Record Payment",
    subtitle: "Log customer payment into ledger",
    icon: CreditCard,
    href: "/payments/new",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    title: "Record Expense",
    subtitle: "Log operational company expense",
    icon: Banknote,
    href: "/finance?new=true",
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
];

const NAVIGATION_SECTIONS = [
  { label: "Bills & Invoices", href: "/invoices" },
  { label: "Customers", href: "/clients" },
  { label: "Products & Stock", href: "/products" },
  { label: "Quotations", href: "/quotations" },
  { label: "Sales Orders", href: "/orders" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Payments", href: "/payments" },
  { label: "Finance & Expenses", href: "/finance" },
];

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setResults(data.data);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
        setSelectedIndex(0);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!query.trim()) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].href);
      }
    }
  };

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Customer":
        return <Users className="w-4 h-4 text-blue-600" />;
      case "Submission":
        return <Inbox className="w-4 h-4 text-indigo-600" />;
      case "Quotation":
        return <FileCheck className="w-4 h-4 text-teal-600" />;
      case "Order":
        return <ShoppingCart className="w-4 h-4 text-amber-600" />;
      case "Invoice":
        return <FileText className="w-4 h-4 text-orange-600" />;
      case "Payment":
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case "Product":
        return <Package className="w-4 h-4 text-purple-600" />;
      case "Project":
        return <Briefcase className="w-4 h-4 text-amber-600" />;
      case "Supplier":
        return <Truck className="w-4 h-4 text-emerald-600" />;
      case "Procurement":
        return <ClipboardList className="w-4 h-4 text-cyan-600" />;
      default:
        return <CalendarClock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Soft frosted overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-[50%] top-[10%] sm:top-[14%] translate-x-[-50%] z-50 w-[94vw] sm:w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-0 overflow-hidden focus:outline-none focus:ring-0 max-h-[85vh] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150"
        >
          {/* Top Search Input Bar (Zero browser outlines) */}
          <div className="flex items-center px-4 sm:px-5 h-16 border-b border-slate-100 bg-white gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 text-brand">
              <Search className="w-4 h-4 text-brand" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers, bills, products, projects, POs..."
              style={{ outline: "none", boxShadow: "none" }}
              className="w-full h-full text-sm sm:text-base bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-slate-900 placeholder:text-slate-400"
            />

            {loading && (
              <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />
            )}

            {query && !loading && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded-md transition-colors"
            >
              ESC
            </button>
          </div>

          {/* Modal Body: Either Search Results or Command Center */}
          <div className="max-h-[60vh] overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 scrollbar-thin">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 text-brand animate-spin" />
                <p className="text-xs font-medium">Searching TamizhTech ERP records...</p>
              </div>
            ) : query.trim() ? (
              results.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Results ({results.length})
                  </div>
                  {results.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => handleSelect(item.href)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm group",
                          isSelected
                            ? "bg-brand/5 border border-brand/20 shadow-xs"
                            : "hover:bg-slate-50 border border-transparent text-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            isSelected ? "bg-white border-brand/30 shadow-xs" : "bg-slate-100/80 border-slate-200/60"
                          )}>
                            {getCategoryIcon(item.category)}
                          </div>
                          <div className="min-w-0">
                            <p className={cn(
                              "font-semibold text-xs sm:text-sm truncate",
                              isSelected ? "text-brand" : "text-slate-900"
                            )}>
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
                            {item.category}
                          </span>
                          <ArrowRight className={cn(
                            "w-3.5 h-3.5 transition-transform",
                            isSelected ? "text-brand translate-x-0.5" : "text-slate-300"
                          )} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No results found</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No matching customer, bill, product, or project found for &quot;{query}&quot;. Try checking the spelling or keywords.
                  </p>
                </div>
              )
            ) : (
              /* Default Empty State: Command Center with Quick Actions & Navigation */
              <div className="space-y-4">
                {/* Quick Actions */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-brand" />
                      Quick Operations
                    </span>
                    <span>Shortcut</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {QUICK_ACTIONS.map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelect(action.href)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all group"
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", action.color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 group-hover:text-brand transition-colors">
                              {action.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {action.subtitle}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section Quick Jump */}
                <div className="pt-3 space-y-2">
                  <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Jump to Module
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {NAVIGATION_SECTIONS.map((sec, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelect(sec.href)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-brand/10 hover:text-brand border border-slate-200/80 hover:border-brand/30 rounded-lg transition-all"
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Keyboard Guide Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] shadow-2xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] shadow-2xs">↓</kbd>
                <span className="text-slate-400 ml-0.5">navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] shadow-2xs">↵</kbd>
                <span className="text-slate-400 ml-0.5">open</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] shadow-2xs">esc</kbd>
                <span className="text-slate-400 ml-0.5">close</span>
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Command className="w-3 h-3 text-brand" />
              <span>TamizhTech Spotlight</span>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
