"use client";

import React, { useEffect, useState, useRef } from "react";
import { useFieldArray, Control, UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { InvoiceFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Trash2, 
  Package, 
  Search, 
  Percent, 
  RotateCcw, 
  ChevronDown, 
  X, 
  Sparkles,
  Layers,
  Wrench,
  Boxes
} from "lucide-react";

export interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  type: string;
  basePrice: number | null;
  stockQuantity: number;
  unit?: string;
  description?: string;
}

interface InvoiceLineItemsProps {
  control: Control<InvoiceFormValues>;
  register: UseFormRegister<InvoiceFormValues>;
  watch: UseFormWatch<InvoiceFormValues>;
  setValue: UseFormSetValue<InvoiceFormValues>;
  errors: any;
}

function getTypeBadge(type: string) {
  switch (type) {
    case "FINISHED_PRODUCT":
    case "PHYSICAL_PRODUCT":
      return { 
        label: "Finished", 
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: Package
      };
    case "RAW_MATERIAL":
      return { 
        label: "Raw Material", 
        className: "bg-amber-50 text-amber-800 border-amber-200",
        icon: Boxes
      };
    case "COMPONENT":
      return { 
        label: "Component", 
        className: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Layers
      };
    case "CONSUMABLE":
      return { 
        label: "Consumable", 
        className: "bg-slate-100 text-slate-700 border-slate-200",
        icon: Layers
      };
    case "SERVICE":
      return { 
        label: "Service", 
        className: "bg-purple-50 text-purple-700 border-purple-200",
        icon: Wrench
      };
    default:
      return { 
        label: type, 
        className: "bg-gray-50 text-gray-700 border-gray-200",
        icon: Package
      };
  }
}

export function InvoiceLineItems({ control, register, watch, setValue, errors }: InvoiceLineItemsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [topSearchQuery, setTopSearchQuery] = useState("");
  const [isTopSearchOpen, setIsTopSearchOpen] = useState(false);
  const [activeRowCombobox, setActiveRowCombobox] = useState<number | null>(null);
  const [rowSearchQuery, setRowSearchQuery] = useState("");
  const [rowCategoryFilter, setRowCategoryFilter] = useState("ALL");
  const [activeDiscountRow, setActiveDiscountRow] = useState<number | null>(null);

  const topSearchRef = useRef<HTMLDivElement>(null);
  const rowComboboxRef = useRef<HTMLDivElement>(null);

  const watchItems = watch("items") || [];

  // Load ALL products (Finished products, Raw Materials, Components, Consumables, Services)
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        const json = await res.json();
        if (json.success) {
          setProducts(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load products in line items:", err);
      }
    }
    loadProducts();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (topSearchRef.current && !topSearchRef.current.contains(event.target as Node)) {
        setIsTopSearchOpen(false);
      }
      if (rowComboboxRef.current && !rowComboboxRef.current.contains(event.target as Node)) {
        setActiveRowCombobox(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      setValue(`items.${index}.productId`, "");
      setActiveRowCombobox(null);
      return;
    }

    const selected = products.find((p) => p.id === productId);
    if (selected) {
      setValue(`items.${index}.productId`, selected.id);
      setValue(`items.${index}.description`, selected.name);
      setValue(`items.${index}.unitPrice`, selected.basePrice !== null ? Number(selected.basePrice) : 0);
    }
    setActiveRowCombobox(null);
    setRowSearchQuery("");
  };

  const handleAddProductFromSearch = (product: ProductOption) => {
    // If we only have 1 item and it's empty, update it; otherwise append a new one
    const firstItem = watchItems[0];
    const isFirstEmpty = fields.length === 1 && (!firstItem?.description && !firstItem?.productId && (!firstItem?.unitPrice || firstItem.unitPrice === 0));

    const price = product.basePrice !== null ? Number(product.basePrice) : 0;

    if (isFirstEmpty) {
      setValue("items.0.productId", product.id);
      setValue("items.0.description", product.name);
      setValue("items.0.qty", 1);
      setValue("items.0.unitPrice", price);
    } else {
      append({
        productId: product.id,
        description: product.name,
        qty: 1,
        unitPrice: price,
        configurationNotes: "",
      });
    }

    setTopSearchQuery("");
    setIsTopSearchOpen(false);
  };

  const applyItemDiscount = (index: number, discountPct: number) => {
    const currentItem = watchItems[index];
    const selected = products.find((p) => p.id === currentItem?.productId);
    const base = selected?.basePrice !== null && selected?.basePrice !== undefined ? Number(selected.basePrice) : Number(currentItem?.unitPrice) || 0;
    
    if (base > 0) {
      const discounted = Math.max(0, Math.round(base * (1 - discountPct / 100) * 100) / 100);
      setValue(`items.${index}.unitPrice`, discounted);
    }
    setActiveDiscountRow(null);
  };

  const resetToCatalogPrice = (index: number) => {
    const currentItem = watchItems[index];
    const selected = products.find((p) => p.id === currentItem?.productId);
    if (selected && selected.basePrice !== null) {
      setValue(`items.${index}.unitPrice`, Number(selected.basePrice));
    }
  };

  // Filter products for top search
  const filteredTopProducts = topSearchQuery.trim()
    ? products.filter((p) => {
        const query = topSearchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          (p.sku && p.sku.toLowerCase().includes(query)) ||
          (p.category && p.category.toLowerCase().includes(query)) ||
          p.type.toLowerCase().includes(query)
        );
      }).slice(0, 8)
    : [];

  // Filter products for row combobox
  const filteredRowProducts = products.filter((p) => {
    if (rowCategoryFilter !== "ALL" && p.type !== rowCategoryFilter) {
      if (rowCategoryFilter === "FINISHED_PRODUCT" && p.type === "PHYSICAL_PRODUCT") {
        // match legacy
      } else {
        return false;
      }
    }
    if (!rowSearchQuery.trim()) return true;
    const q = rowSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header and Quick Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-navy flex items-center gap-2">
            <Package className="w-4 h-4 text-brand" />
            Line Items & Inventory Products
          </h3>
          <p className="text-xs text-ink-secondary">
            Search or select from all inventory items (Finished Goods, Services, Raw Materials, Components, Consumables) or type custom items. Prices can be edited freely.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", qty: 1, unitPrice: 0, productId: "", configurationNotes: "" })}
            className="h-8 gap-1 bg-white hover:bg-gray-50 text-brand border-gray-200 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Blank Row
          </Button>
        </div>
      </div>

      {/* ── TOP SEARCH TO ADD INVENTORY ITEM ── */}
      <div className="relative" ref={topSearchRef}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={topSearchQuery}
            onChange={(e) => {
              setTopSearchQuery(e.target.value);
              setIsTopSearchOpen(true);
            }}
            onFocus={() => setIsTopSearchOpen(true)}
            placeholder="🔍 Search inventory item by name, SKU, raw material, or service to quickly add to bill..."
            className="pl-9 pr-9 h-10 text-xs bg-white border-brand/30 shadow-xs focus:border-brand focus:ring-1 focus:ring-brand font-medium placeholder:text-gray-400"
          />
          {topSearchQuery && (
            <button
              type="button"
              onClick={() => {
                setTopSearchQuery("");
                setIsTopSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Suggestions */}
        {isTopSearchOpen && topSearchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {filteredTopProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No inventory item found matching &quot;{topSearchQuery}&quot;. You can still add a custom line item below.
              </div>
            ) : (
              filteredTopProducts.map((p) => {
                const badge = getTypeBadge(p.type);
                const BadgeIcon = badge.icon;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddProductFromSearch(p)}
                    className="p-3 hover:bg-brand/5 cursor-pointer flex items-center justify-between transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
                        <BadgeIcon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-navy flex items-center gap-1.5 truncate">
                          <span>{p.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                          {p.sku && <span>SKU: {p.sku}</span>}
                          {p.category && <span>• {p.category}</span>}
                          <span>•</span>
                          {p.type === "SERVICE" ? (
                            <span className="text-purple-600 font-medium">Service (No Physical Stock)</span>
                          ) : (
                            <span className={p.stockQuantity > 0 ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>
                              Available: {p.stockQuantity} {p.unit || "units"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <div className="font-bold text-navy text-sm">
                        ₹{(p.basePrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-brand font-medium flex items-center gap-0.5 justify-end">
                        <Plus className="w-3 h-3" /> Click to Add
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── LINE ITEMS TABLE ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white">
        <div className="hidden md:grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
          <div className="col-span-4">Inventory Item / Service</div>
          <div className="col-span-3">Description & Custom Notes</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit Price (₹)</div>
          <div className="col-span-1 text-center"></div>
        </div>

        <div className="p-3 space-y-4">
          {fields.map((field, index) => {
            const currentItem = watchItems[index];
            const qty = Number(currentItem?.qty) || 0;
            const price = Number(currentItem?.unitPrice) || 0;
            const lineTotal = qty * price;
            const selectedProduct = products.find((p) => p.id === currentItem?.productId);
            const catalogPrice = selectedProduct?.basePrice !== null && selectedProduct?.basePrice !== undefined ? Number(selectedProduct.basePrice) : null;
            const isDiscounted = catalogPrice !== null && catalogPrice > 0 && price < catalogPrice;
            const discountPct = isDiscounted ? Math.round(((catalogPrice - price) / catalogPrice) * 100) : 0;
            const isPriceChanged = catalogPrice !== null && price !== catalogPrice;

            return (
              <div
                key={field.id}
                className="p-3 md:p-2 rounded-lg bg-gray-50/50 md:bg-transparent border md:border-b md:border-gray-100 last:border-b-0 border-border grid grid-cols-1 md:grid-cols-12 gap-2 items-start"
              >
                {/* 1. Item Selector / Combobox */}
                <div className="md:col-span-4 space-y-1.5 relative">
                  <label className="md:hidden text-[11px] font-semibold text-ink-secondary uppercase">Item / Product</label>
                  
                  {/* Select button triggering rich searchable popup */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRowCombobox(activeRowCombobox === index ? null : index);
                        setRowSearchQuery("");
                        setRowCategoryFilter("ALL");
                      }}
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-2.5 py-1 text-xs shadow-xs hover:border-brand focus:outline-none focus:ring-1 focus:ring-brand text-left truncate"
                    >
                      {selectedProduct ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`text-[9px] px-1 py-0.2 rounded font-bold border ${getTypeBadge(selectedProduct.type).className}`}>
                            {getTypeBadge(selectedProduct.type).label}
                          </span>
                          <span className="font-semibold text-navy truncate">{selectedProduct.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">Custom Item / Manual Entry</span>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                    </button>

                    {selectedProduct && (
                      <button
                        type="button"
                        onClick={() => handleProductSelect(index, "")}
                        title="Clear link to inventory item"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Stock or Service info */}
                  {selectedProduct ? (
                    selectedProduct.type === "SERVICE" ? (
                      <div className="flex items-center gap-1 text-[11px] text-purple-700">
                        <Wrench className="w-3 h-3" />
                        <span>Service (No physical stock)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-ink-secondary">
                        <Package className="w-3 h-3 text-brand" />
                        <span>
                          Available: <b>{selectedProduct.stockQuantity} {selectedProduct.unit || "units"}</b>
                          {selectedProduct.sku ? ` • SKU: ${selectedProduct.sku}` : ""}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="text-[10px] text-gray-400">
                      Manual line item (no inventory tracking)
                    </div>
                  )}

                  {/* Rich Searchable Dropdown Popover */}
                  {activeRowCombobox === index && (
                    <div
                      ref={rowComboboxRef}
                      className="absolute left-0 top-full mt-1 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-2 space-y-2"
                    >
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          autoFocus
                          value={rowSearchQuery}
                          onChange={(e) => setRowSearchQuery(e.target.value)}
                          placeholder="Search product, service, raw material..."
                          className="h-8 pl-8 text-xs bg-gray-50"
                        />
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                        {[
                          { id: "ALL", label: "All Items" },
                          { id: "FINISHED_PRODUCT", label: "Finished" },
                          { id: "SERVICE", label: "Services" },
                          { id: "RAW_MATERIAL", label: "Raw Materials" },
                          { id: "COMPONENT", label: "Components" },
                          { id: "CONSUMABLE", label: "Consumables" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setRowCategoryFilter(cat.id)}
                            className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                              rowCategoryFilter === cat.id
                                ? "bg-navy text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Option for Custom Manual Entry */}
                      <button
                        type="button"
                        onClick={() => handleProductSelect(index, "")}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-100 text-xs flex items-center justify-between border border-dashed border-gray-200 text-gray-600"
                      >
                        <span className="italic font-medium">Use Custom / Manual Item</span>
                        <span className="text-[10px] text-gray-400">No Catalog Link</span>
                      </button>

                      {/* Filtered Items List */}
                      <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-gray-50">
                        {filteredRowProducts.length === 0 ? (
                          <div className="p-3 text-center text-xs text-gray-500">
                            No items found.
                          </div>
                        ) : (
                          filteredRowProducts.map((p) => {
                            const badge = getTypeBadge(p.type);
                            return (
                              <div
                                key={p.id}
                                onClick={() => handleProductSelect(index, p.id)}
                                className={`p-2 rounded-lg hover:bg-brand/5 cursor-pointer flex items-center justify-between transition-colors text-xs ${
                                  selectedProduct?.id === p.id ? "bg-brand/10 font-semibold" : ""
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold border ${badge.className}`}>
                                      {badge.label}
                                    </span>
                                    <span className="text-navy truncate">{p.name}</span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    {p.sku ? `SKU: ${p.sku}` : p.category || ""}
                                    {p.type !== "SERVICE" && ` • Stock: ${p.stockQuantity}`}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-bold text-navy text-xs">
                                    ₹{(p.basePrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Description & Custom Notes */}
                <div className="md:col-span-3 space-y-1">
                  <label className="md:hidden text-[11px] font-semibold text-ink-secondary uppercase">Description & Notes</label>
                  <Input
                    {...register(`items.${index}.description`)}
                    placeholder="e.g. DGJ 300RPM Motor or Custom 3D Print"
                    className="h-9 text-xs bg-white font-medium"
                  />
                  <Input
                    {...register(`items.${index}.configurationNotes`)}
                    placeholder="Specification / Notes (e.g. 12V 2A, Black PETG)"
                    className="h-7 text-[11px] bg-gray-50 border-dashed border-gray-200 text-ink-secondary placeholder:text-gray-400"
                  />
                  {errors?.items?.[index]?.description && (
                    <p className="text-[10px] text-red-500">{errors.items[index].description.message}</p>
                  )}
                </div>

                {/* 3. Quantity */}
                <div className="md:col-span-2 space-y-1">
                  <label className="md:hidden text-[11px] font-semibold text-ink-secondary uppercase">Qty</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    {...register(`items.${index}.qty`, { valueAsNumber: true })}
                    className="h-9 text-right text-xs bg-white font-bold"
                  />
                  {errors?.items?.[index]?.qty && (
                    <p className="text-[10px] text-red-500">{errors.items[index].qty.message}</p>
                  )}
                </div>

                {/* 4. Unit Price (Editable during billing with discount helper) */}
                <div className="md:col-span-2 space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-ink-secondary uppercase md:hidden">Unit Price</label>
                  </div>
                  
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      className="h-9 text-right text-xs bg-white font-bold pr-7"
                    />
                    {/* Item Discount Tool Button */}
                    <button
                      type="button"
                      onClick={() => setActiveDiscountRow(activeDiscountRow === index ? null : index)}
                      title="Apply Quick Discount % to this item"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand hover:bg-gray-100 p-1 rounded"
                    >
                      <Percent className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Catalog Reference & Price Status */}
                  {selectedProduct && catalogPrice !== null && (
                    <div className="flex items-center justify-end gap-1.5 text-[10px]">
                      {isPriceChanged ? (
                        <>
                          <span className={isDiscounted ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                            {isDiscounted ? `-${discountPct}% (Cat: ₹${catalogPrice})` : `Cat: ₹${catalogPrice}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => resetToCatalogPrice(index)}
                            title="Reset to catalog price"
                            className="text-gray-400 hover:text-navy p-0.5"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400">Catalog rate</span>
                      )}
                    </div>
                  )}

                  {/* Quick Item Discount Popover */}
                  {activeDiscountRow === index && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-2 w-48 space-y-1.5">
                      <div className="text-[10px] font-bold text-navy uppercase tracking-wider flex items-center justify-between">
                        <span>Item Discount</span>
                        <button
                          type="button"
                          onClick={() => setActiveDiscountRow(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Adjust unit price using preset discount:
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {[5, 10, 15, 20].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => applyItemDiscount(index, d)}
                            className="px-1.5 py-1 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-center"
                          >
                            -{d}%
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => resetToCatalogPrice(index)}
                        className="w-full text-center text-[10px] text-navy hover:underline pt-1"
                      >
                        Reset to Original Rate
                      </button>
                    </div>
                  )}

                  {errors?.items?.[index]?.unitPrice && (
                    <p className="text-[10px] text-red-500">{errors.items[index].unitPrice.message}</p>
                  )}
                </div>

                {/* 5. Line Total & Delete */}
                <div className="md:col-span-1 flex items-center justify-between md:justify-center md:h-9 pt-2 md:pt-0 border-t md:border-0 border-border">
                  <span className="md:hidden text-xs font-semibold text-ink-primary">
                    Total: ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {fields.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">
            No items added. Use the search bar above or click &quot;Add Blank Row&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
