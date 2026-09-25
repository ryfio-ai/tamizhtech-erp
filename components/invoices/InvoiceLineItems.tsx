"use client";

import React, { useEffect, useState } from "react";
import { useFieldArray, Control, UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { InvoiceFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package, Wrench, Layers, Boxes, Tag } from "lucide-react";

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

  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      setValue(`items.${index}.productId`, "");
      return;
    }

    const selected = products.find((p) => p.id === productId);
    if (selected) {
      setValue(`items.${index}.productId`, selected.id);
      setValue(`items.${index}.description`, selected.name);
      setValue(`items.${index}.unitPrice`, selected.basePrice !== null ? Number(selected.basePrice) : 0);
    }
  };

  // Group products into standard ERP classifications
  const services = products.filter((p) => p.type === "SERVICE");
  const finishedProducts = products.filter(
    (p) => p.type === "FINISHED_PRODUCT" || p.type === "PHYSICAL_PRODUCT"
  );
  const rawMaterials = products.filter((p) => p.type === "RAW_MATERIAL");
  const components = products.filter((p) => p.type === "COMPONENT");
  const consumables = products.filter((p) => p.type === "CONSUMABLE");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div>
          <h3 className="text-sm font-bold text-navy flex items-center gap-2">
            <Package className="w-4 h-4 text-brand" />
            Line Items & Products
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select items from your inventory catalog or enter custom service/product details.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => append({ description: "", qty: 1, unitPrice: 0, productId: "", configurationNotes: "" })}
          className="h-8 gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Line Item
        </Button>
      </div>

      {/* MOBILE VIEW (< 768px): Card-based Touch Editor */}
      <div className="md:hidden divide-y divide-gray-100">
        {fields.length === 0 && (
          <div className="py-8 px-4 text-center bg-gray-50/50">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-navy">No line items added</p>
            <p className="text-[11px] text-gray-500 mt-0.5 mb-3">Add at least one item or service to create this bill.</p>
            <Button
              type="button"
              size="sm"
              onClick={() => append({ description: "", qty: 1, unitPrice: 0, productId: "", configurationNotes: "" })}
              className="gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold h-8 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Line Item
            </Button>
          </div>
        )}

        {fields.map((field, index) => {
          const currentItem = watchItems[index];
          const qty = Number(currentItem?.qty) || 0;
          const price = Number(currentItem?.unitPrice) || 0;
          const lineTotal = qty * price;
          const selectedProduct = products.find((p) => p.id === currentItem?.productId);
          const catalogPrice =
            selectedProduct?.basePrice !== null && selectedProduct?.basePrice !== undefined
              ? Number(selectedProduct.basePrice)
              : null;

          return (
            <div key={field.id} className="p-4 space-y-3 bg-white">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold text-navy">Item #{index + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Remove</span>
                </Button>
              </div>

              {/* Product Catalog Picker */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600">Product Catalog</label>
                <select
                  value={currentItem?.productId || ""}
                  onChange={(e) => handleProductSelect(index, e.target.value)}
                  className="w-full h-9 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand shadow-2xs"
                >
                  <option value="">✍️ Custom Item / Service (Manual)</option>
                  {services.length > 0 && (
                    <optgroup label="── Services ──">
                      {services.map((p) => (
                        <option key={p.id} value={p.id}>
                          [Service] {p.name} {p.basePrice ? `• ₹${p.basePrice}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {finishedProducts.length > 0 && (
                    <optgroup label="── Finished Products ──">
                      {finishedProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          [Finished] {p.name} ({p.sku || "No SKU"}) • {p.stockQuantity} in stock
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {rawMaterials.length > 0 && (
                    <optgroup label="── Raw Materials ──">
                      {rawMaterials.map((p) => (
                        <option key={p.id} value={p.id}>
                          [Raw Material] {p.name} • {p.stockQuantity} {p.unit || "units"}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {components.length > 0 && (
                    <optgroup label="── Components ──">
                      {components.map((p) => (
                        <option key={p.id} value={p.id}>
                          [Component] {p.name} • {p.stockQuantity} in stock
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {consumables.length > 0 && (
                    <optgroup label="── Consumables ──">
                      {consumables.map((p) => (
                        <option key={p.id} value={p.id}>
                          [Consumable] {p.name} • {p.stockQuantity} in stock
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {selectedProduct && selectedProduct.type !== "SERVICE" && (
                  <p className="text-[10px] text-emerald-700 font-medium">
                    Stock: {selectedProduct.stockQuantity} {selectedProduct.unit || "units"} available
                  </p>
                )}
              </div>

              {/* Title & Notes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-600">Description & Notes</label>
                <Input
                  {...register(`items.${index}.description`)}
                  placeholder="Item name / Title (required)"
                  className="h-9 text-xs bg-white font-medium"
                />
                <Input
                  {...register(`items.${index}.configurationNotes`)}
                  placeholder="Specifications, notes (optional)"
                  className="h-7 text-[11px] bg-gray-50 border-gray-200 text-gray-600 placeholder:text-gray-400"
                />
                {errors?.items?.[index]?.description && (
                  <p className="text-[10px] text-red-500">{errors.items[index].description.message}</p>
                )}
              </div>

              {/* Quantity, Rate & Total Row */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-0.5">Qty</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    {...register(`items.${index}.qty`, { valueAsNumber: true })}
                    className="h-8 text-center text-xs bg-white font-semibold"
                  />
                  {errors?.items?.[index]?.qty && (
                    <p className="text-[9px] text-red-500">{errors.items[index].qty.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-0.5">Rate (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    className="h-8 text-right text-xs bg-white font-semibold"
                  />
                  {errors?.items?.[index]?.unitPrice && (
                    <p className="text-[9px] text-red-500">{errors.items[index].unitPrice.message}</p>
                  )}
                </div>

                <div className="text-right">
                  <label className="text-[10px] uppercase text-gray-500 font-semibold block mb-0.5">Total</label>
                  <div className="h-8 flex items-center justify-end font-bold text-navy text-xs">
                    ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW (>= 768px): Standard Tabular Grid */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3 min-w-[280px]">Item / Product Catalog</th>
              <th className="py-3 px-3 min-w-[220px]">Description & Specifications</th>
              <th className="py-3 px-3 w-24 text-right">Qty</th>
              <th className="py-3 px-3 w-32 text-right">Rate (₹)</th>
              <th className="py-3 px-3 w-32 text-right">Amount (₹)</th>
              <th className="py-3 px-3 w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {fields.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center bg-gray-50/50">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold text-xs text-navy">No line items added</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 mb-3">Add at least one item or service to create this bill.</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => append({ description: "", qty: 1, unitPrice: 0, productId: "", configurationNotes: "" })}
                    className="gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold h-8 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line Item
                  </Button>
                </td>
              </tr>
            )}
            {fields.map((field, index) => {
              const currentItem = watchItems[index];
              const qty = Number(currentItem?.qty) || 0;
              const price = Number(currentItem?.unitPrice) || 0;
              const lineTotal = qty * price;
              const selectedProduct = products.find((p) => p.id === currentItem?.productId);
              const catalogPrice =
                selectedProduct?.basePrice !== null && selectedProduct?.basePrice !== undefined
                  ? Number(selectedProduct.basePrice)
                  : null;

              return (
                <tr key={field.id} className="hover:bg-gray-50/50 transition-colors align-top">
                  {/* # */}
                  <td className="py-3 px-3 text-center text-gray-400 font-semibold pt-4">
                    {index + 1}
                  </td>

                  {/* Item / Catalog Selector */}
                  <td className="py-3 px-3 space-y-1.5">
                    <select
                      value={currentItem?.productId || ""}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full h-9 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand shadow-2xs"
                    >
                      <option value="">✍️ Custom Item / Service (Manual)</option>

                      {services.length > 0 && (
                        <optgroup label="── Services (No Physical Stock) ──">
                          {services.map((p) => (
                            <option key={p.id} value={p.id}>
                              [Service] {p.name} {p.basePrice ? `• ₹${p.basePrice}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {finishedProducts.length > 0 && (
                        <optgroup label="── Finished Products ──">
                          {finishedProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              [Finished] {p.name} ({p.sku || "No SKU"}) • {p.stockQuantity} in stock {p.basePrice ? `• ₹${p.basePrice}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {rawMaterials.length > 0 && (
                        <optgroup label="── Raw Materials ──">
                          {rawMaterials.map((p) => (
                            <option key={p.id} value={p.id}>
                              [Raw Material] {p.name} ({p.sku || "No SKU"}) • {p.stockQuantity} {p.unit || "units"} {p.basePrice ? `• ₹${p.basePrice}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {components.length > 0 && (
                        <optgroup label="── Components ──">
                          {components.map((p) => (
                            <option key={p.id} value={p.id}>
                              [Component] {p.name} ({p.sku || "No SKU"}) • {p.stockQuantity} in stock {p.basePrice ? `• ₹${p.basePrice}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {consumables.length > 0 && (
                        <optgroup label="── Consumables ──">
                          {consumables.map((p) => (
                            <option key={p.id} value={p.id}>
                              [Consumable] {p.name} ({p.sku || "No SKU"}) • {p.stockQuantity} in stock {p.basePrice ? `• ₹${p.basePrice}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {/* Stock / Category Status Indicator */}
                    {selectedProduct ? (
                      selectedProduct.type === "SERVICE" ? (
                        <div className="text-[11px] text-purple-700 flex items-center gap-1 font-medium">
                          <Wrench className="w-3 h-3" />
                          <span>Service • Zero stock movement</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                          <Package className="w-3 h-3" />
                          <span>
                            Stock: <b>{selectedProduct.stockQuantity} {selectedProduct.unit || "units"} available</b>
                            {selectedProduct.sku ? ` (${selectedProduct.sku})` : ""}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="text-[11px] text-gray-400">
                        Manual entry • Custom item or service
                      </div>
                    )}
                  </td>

                  {/* Description & Custom Specs */}
                  <td className="py-3 px-3 space-y-1.5">
                    <Input
                      {...register(`items.${index}.description`)}
                      placeholder="Item name / Title (required)"
                      className="h-9 text-xs bg-white font-medium"
                    />
                    <Input
                      {...register(`items.${index}.configurationNotes`)}
                      placeholder="Specifications, dimensions, notes (optional)"
                      className="h-7 text-[11px] bg-gray-50 border-gray-200 text-gray-600 placeholder:text-gray-400"
                    />
                    {errors?.items?.[index]?.description && (
                      <p className="text-[10px] text-red-500">{errors.items[index].description.message}</p>
                    )}
                  </td>

                  {/* Qty */}
                  <td className="py-3 px-3">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      {...register(`items.${index}.qty`, { valueAsNumber: true })}
                      className="h-9 text-right text-xs bg-white font-semibold"
                    />
                    {errors?.items?.[index]?.qty && (
                      <p className="text-[10px] text-red-500 text-right">{errors.items[index].qty.message}</p>
                    )}
                  </td>

                  {/* Unit Price / Rate */}
                  <td className="py-3 px-3 space-y-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      className="h-9 text-right text-xs bg-white font-semibold"
                    />
                    {catalogPrice !== null && catalogPrice !== price && (
                      <div className="text-[10px] text-right text-gray-400">
                        Cat: ₹{catalogPrice}
                      </div>
                    )}
                    {errors?.items?.[index]?.unitPrice && (
                      <p className="text-[10px] text-red-500 text-right">{errors.items[index].unitPrice.message}</p>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-3 px-3 text-right pt-4">
                    <span className="font-bold text-navy text-xs">
                      ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Action / Delete */}
                  <td className="py-3 px-3 text-center pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-lg gap-1.5 font-medium shadow-2xs transition-colors cursor-pointer"
                      title="Remove this item"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Global Line Item Error Notice */}
      {errors?.items?.message && (
        <div className="p-3 bg-red-50 border-t border-red-200 text-red-600 text-xs font-medium flex items-center gap-2">
          <span>⚠️ {errors.items.message}</span>
        </div>
      )}

      {/* Footer Add Row Action */}
      <div className="p-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ description: "", qty: 1, unitPrice: 0, productId: "", configurationNotes: "" })}
          className="gap-1.5 bg-white text-brand hover:text-brand-dark border-gray-200 text-xs font-semibold h-8 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Another Item
        </Button>
        <span className="text-xs text-gray-500 font-medium">
          {fields.length} {fields.length === 1 ? "line item" : "line items"}
        </span>
      </div>
    </div>
  );
}
