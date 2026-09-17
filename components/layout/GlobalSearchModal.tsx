"use client";

import React, { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, X, Users, FileText, CreditCard, Package, Briefcase, CalendarClock, ArrowRight } from "lucide-react";
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
  category: "Customer" | "Invoice" | "Payment" | "Product" | "Project" | "Follow-up";
  href: string;
}

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
      setTimeout(() => inputRef.current?.focus(), 50);
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
          // Fallback static search items based on keywords if endpoint is still caching
          setResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
        setSelectedIndex(0);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      case "Invoice":
        return <FileText className="w-4 h-4 text-brand" />;
      case "Payment":
        return <CreditCard className="w-4 h-4 text-green-600" />;
      case "Product":
        return <Package className="w-4 h-4 text-purple-600" />;
      case "Project":
        return <Briefcase className="w-4 h-4 text-amber-600" />;
      default:
        return <CalendarClock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-[50%] top-[15%] translate-x-[-50%] z-50 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-border p-0 overflow-hidden focus:outline-none"
        >
          {/* Search Header */}
          <div className="flex items-center px-4 border-b border-border bg-white">
            <Search className="w-5 h-5 text-ink-muted shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers, invoices, products, projects..."
              className="w-full h-14 text-sm sm:text-base bg-transparent border-none focus:outline-none text-ink-primary placeholder:text-ink-muted"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1.5 text-ink-muted hover:text-ink-primary rounded-full hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block text-[11px] font-medium bg-surface text-ink-muted px-2 py-0.5 rounded border border-border ml-2">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="p-8 text-center text-xs text-ink-muted">Searching across TamizhTech ERP...</div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => handleSelect(item.href)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm",
                      selectedIndex === idx ? "bg-brand-50 text-brand" : "hover:bg-surface text-ink-primary"
                    )}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-2 rounded-md bg-surface shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-ink-primary truncate">{item.title}</p>
                        <p className="text-xs text-ink-muted truncate">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-surface border border-border text-ink-secondary">
                        {item.category}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-ink-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                No matching results for "{query}".
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-ink-muted">
                Quickly jump to records across customers, invoices, products, and projects.
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2.5 bg-surface border-t border-border flex items-center justify-between text-[11px] text-ink-muted">
            <div className="flex items-center gap-3">
              <span>Use <kbd className="px-1 py-0.5 rounded bg-white border">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-white border">↓</kbd> to navigate</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white border">Enter</kbd> to select</span>
            </div>
            <span>Global Search</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
