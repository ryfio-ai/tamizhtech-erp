"use client";

import React, { useEffect, useState } from "react";
import { useFieldArray, Control, UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { InvoiceFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package } from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  type: string;
  basePrice: number;
  stockQuantity: number;
}

interface InvoiceLineItemsProps {
  control: Control<InvoiceFormValues>;
  register: UseFormRegister<InvoiceFormValues>;
  watch: UseFormWatch<InvoiceFormValues>;
  setValue: UseFormSetValue<InvoiceFormValues>;
  errors: any;
}

export function InvoiceLineItems({ control, register, watch, setValue, errors }: InvoiceLineItemsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const [products, setProducts] = useState<ProductOption[]>([]);
  const watchItems = watch("items") || [];

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products?saleable=true");
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

  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      setValue(`items.${index}.productId`, "");
      return;
    }

    const selected = products.find((p) => p.id === productId);
    if (selected) {
      setValue(`items.${index}.productId`, selected.id);
      setValue(`items.${index}.description`, selected.name);
      setValue(`items.${index}.unitPrice`, selected.basePrice);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-navy">Line Items & Products</h3>
          <p className="text-xs text-ink-secondary">Select from catalog to auto-populate price and track inventory, or enter custom service.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ description: "", qty: 1, unitPrice: 0, productId: "" })}
          className="h-8 gap-1 bg-white hover:bg-gray-50 text-brand border-gray-200"
        >
          <Plus className="w-3.5 h-3.5" /> Add Item
        </Button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="hidden md:grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Catalog Product</div>
          <div className="col-span-4">Description</div>
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

            return (
              <div key={field.id} className="p-3 md:p-0 rounded-lg md:rounded-none bg-gray-50/50 md:bg-transparent border md:border-0 border-border grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                {/* 1. Catalog Dropdown */}
                <div className="md:col-span-3 space-y-1">
                  <label className="md:hidden text-[11px] font-semibold text-ink-secondary uppercase">Product</label>
                  <select
                    value={currentItem?.productId || ""}
                    onChange={(e) => handleProductSelect(index, e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-white px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-brand truncate"
                  >
                    <option value="">Custom Service / Manual</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku || "No SKU"}) {p.type === "SERVICE" ? "• Service" : `• ${p.stockQuantity} in stock`}
                      </option>
                    ))}
                  </select>
                  {selectedProduct && selectedProduct.type !== "SERVICE" && (
                    <div className="flex items-center gap-1 text-[11px] text-ink-secondary">
                      <Package className="w-3 h-3 text-brand" />
                      <span>Available: <b>{selectedProduct.stockQuantity} units</b></span>
                    </div>
                  )}
                  {selectedProduct && selectedProduct.type === "SERVICE" && (
                    <div className="flex items-center gap-1 text-[11px] text-purple-700">
                      <span>Stock: <b>N/A (Service)</b></span>
                    </div>
                  )}
                </div>

                {/* 2. Description & Configuration Notes */}
                <div className="md:col-span-4 space-y-1">
                  <label className="md:hidden text-[11px] font-semibold text-ink-secondary uppercase">Description & Configuration</label>
                  <Input
                    {...register(`items.${index}.description`)}
                    placeholder="e.g. TTRC DGJ 300RPM Motor or 3D Printing Service"
                    className="h-9 text-xs bg-white"
                  />
                  <Input
                    {...register(`items.${index}.configurationNotes`)}
                    placeholder="Configuration / Requirement (e.g. 11.1V battery charger, 2-layer FR4)"
                    className="h-7 text-[11px] bg-gray-50/70 border-dashed border-gray-300 text-ink-secondary"
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
                    className="h-9 text-right text-xs bg-white font-semibold"
                  />
                  {errors?.items?.[index]?.qty && (
                    <p className="text-[10px] text-red-500">{errors.items[index].qty.message}</p>
                  )}
                </div>

                {/* 4. Unit Price */}
                <div className="md:col-span-2 space-y-1">
                  <label className="md:hidden text-[11px] font-semibold text-ink-secondary uppercase">Unit Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    className="h-9 text-right text-xs bg-white"
                  />
                  {errors?.items?.[index]?.unitPrice && (
                    <p className="text-[10px] text-red-500">{errors.items[index].unitPrice.message}</p>
                  )}
                </div>

                {/* 5. Delete Action */}
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
            No items added. Click &quot;Add Item&quot; above.
          </div>
        )}
      </div>
    </div>
  );
}
