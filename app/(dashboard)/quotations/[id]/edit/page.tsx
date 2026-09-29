"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  FileCheck,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Package,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { roundMoney, safeAdd, formatINR } from "@/lib/money";
import { toast } from "sonner";

interface QuotationLineInput {
  id: string;
  productId: string;
  itemType: "PHYSICAL_PRODUCT" | "SERVICE";
  description: string;
  configurationNotes: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
}

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [defaultGstRate, setDefaultGstRate] = useState<number>(18);

  // Form State
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<QuotationLineInput[]>([]);

  useEffect(() => {
    // Load clients
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setClients(data.data || []);
      })
      .catch((err) => console.error("Error loading clients:", err));

    // Load products
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProducts(data.data || []);
      })
      .catch((err) => console.error("Error loading products:", err));

    // Load system settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings?.DEFAULT_GST_RATE) {
          setDefaultGstRate(data.settings.DEFAULT_GST_RATE);
        }
      })
      .catch((err) => console.error("Error loading settings:", err));

    // Load current quotation details
    if (quotationId) {
      fetch(`/api/quotations/${quotationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.quotation) {
            const q = data.quotation;
            setQuotation(q);
            setClientId(q.clientId || "");
            setStatus(q.status || "DRAFT");
            setNotes(q.notes || "");
            setTerms(q.terms || "");

            if (q.validUntil) {
              const d = new Date(q.validUntil);
              setValidUntil(d.toISOString().split("T")[0]);
            }

            if (q.items && q.items.length > 0) {
              setItems(
                q.items.map((it: any) => ({
                  id: it.id || Math.random().toString(),
                  productId: it.productId || "",
                  itemType: it.itemType || "PHYSICAL_PRODUCT",
                  description: it.description || it.name || "",
                  configurationNotes: it.configurationNotes || "",
                  qty: it.qty || 1,
                  unitPrice: it.unitPrice || 0,
                  discountPercent: it.discountPercent || 0,
                  taxRate: typeof it.taxRate === "number" ? it.taxRate : 18,
                }))
              );
            } else {
              setItems([
                {
                  id: "1",
                  productId: "",
                  itemType: "PHYSICAL_PRODUCT",
                  description: "",
                  configurationNotes: "",
                  qty: 1,
                  unitPrice: 0,
                  discountPercent: 0,
                  taxRate: 18,
                },
              ]);
            }
          } else {
            toast.error(data.error || "Failed to load quotation details");
          }
        })
        .catch((err) => {
          console.error("Error loading quotation:", err);
          toast.error("Failed to load quotation");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [quotationId]);

  const handleProductSelect = (index: number, productId: string) => {
    const selected = products.find((p) => p.id === productId);
    const updated = [...items];
    if (selected) {
      updated[index].productId = selected.id;
      updated[index].itemType = selected.type === "SERVICE" ? "SERVICE" : "PHYSICAL_PRODUCT";
      updated[index].description = selected.name;
      updated[index].unitPrice = selected.basePrice ?? 0;
      updated[index].configurationNotes = selected.configurationNotes || "";
      updated[index].taxRate = selected.taxRate || defaultGstRate;
    } else {
      updated[index].productId = "";
    }
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof QuotationLineInput, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        productId: "",
        itemType: "PHYSICAL_PRODUCT",
        description: "",
        configurationNotes: "",
        qty: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: defaultGstRate,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("At least one line item is required.");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Authoritative calculations via exact money functions
  let calculatedSubtotal = 0;
  let calculatedDiscount = 0;
  let calculatedTax = 0;

  for (const item of items) {
    const gross = roundMoney(item.qty * item.unitPrice);
    const disc = roundMoney(gross * (item.discountPercent / 100));
    const net = roundMoney(gross - disc);
    const tax = roundMoney(net * (item.taxRate / 100));

    calculatedSubtotal = safeAdd(calculatedSubtotal, gross);
    calculatedDiscount = safeAdd(calculatedDiscount, disc);
    calculatedTax = safeAdd(calculatedTax, tax);
  }

  const calculatedTotal = safeAdd(
    roundMoney(calculatedSubtotal - calculatedDiscount),
    calculatedTax
  );

  const isConverted =
    Boolean(quotation?.convertedToInvoiceId) ||
    Boolean(quotation?.orders && quotation.orders.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Please select a customer.");
      return;
    }

    if (items.some((it) => !it.description || it.qty <= 0)) {
      toast.error("Please ensure every item has a valid description and quantity > 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          validUntil,
          status,
          items,
          notes,
          terms,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Quotation ${quotation.quotationNo} updated successfully!`);
        router.push(`/quotations/${quotationId}`);
      } else {
        toast.error(data.error || "Failed to update quotation");
      }
    } catch (err: any) {
      console.error("Failed to update quotation:", err);
      toast.error(err.message || "An unexpected error occurred while saving quotation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 max-w-5xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
        Loading quotation details for editing...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-12 text-center text-gray-500 max-w-5xl mx-auto">
        <h2 className="text-lg font-bold text-gray-800">Quotation Not Found</h2>
        <Link href="/quotations" className="text-primary hover:underline mt-2 inline-block">
          &larr; Back to Quotations
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/quotations/${quotationId}`}
            className="p-2 text-gray-500 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Quotation"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-primary" />
                Edit Quotation
              </h1>
              <span className="text-primary font-mono font-bold bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20 text-sm">
                {quotation.quotationNo}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Update line items, quantities, pricing, customer, or offer terms. Quotation number is preserved.
            </p>
          </div>
        </div>

        <Link
          href={`/quotations/${quotationId}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-navy px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors w-fit"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Live Proposal
        </Link>
      </div>

      {/* Warning banner if quotation is converted */}
      {isConverted && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Downstream Conversion Detected</span>
            This quotation has already been converted to an Invoice or Sales Order. Modifying line items is locked to maintain audit integrity with downstream records.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Document Information */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Customer / Client *
            </label>
            <div className="relative">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                disabled={isConverted}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
              >
                <option value="">Select customer...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || c.mobileNormalized}) {c.company ? `— ${c.company}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Valid Until Date *
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Proposal validity period for client acceptance.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Quotation Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
            >
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent to Client</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Current state in the sales pipeline.
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-navy flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Quotation Line Items
            </h2>
            {!isConverted && (
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 text-xs bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navy-dark transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            )}
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => {
              const lineGross = roundMoney(item.qty * item.unitPrice);
              const lineDisc = roundMoney(lineGross * (item.discountPercent / 100));
              const lineNet = roundMoney(lineGross - lineDisc);
              const lineTax = roundMoney(lineNet * (item.taxRate / 100));
              const lineTotal = safeAdd(lineNet, lineTax);

              return (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    {/* Catalog Picker */}
                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Catalog Item (Optional Preset)
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        disabled={isConverted}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-60"
                      >
                        <option value="">Custom Item / Service</option>
                        {products.map((p) => {
                          const tag =
                            p.type === "SERVICE"
                              ? "SERVICE"
                              : p.type === "RAW_MATERIAL"
                              ? "RAW MAT"
                              : p.type === "COMPONENT"
                              ? "COMPONENT"
                              : p.type === "CONSUMABLE"
                              ? "CONSUMABLE"
                              : "FINISHED";
                          return (
                            <option key={p.id} value={p.id}>
                              [{tag}] {p.name} {p.sku ? `(${p.sku})` : ""} {p.basePrice ? `— ₹${p.basePrice}` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-5">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Item / Service Title *
                      </label>
                      <input
                        type="text"
                        placeholder="Item name / title"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        required
                        disabled={isConverted}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium disabled:opacity-60"
                      />
                    </div>

                    {/* Item Type */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Type
                      </label>
                      <select
                        value={item.itemType}
                        onChange={(e) => handleItemChange(idx, "itemType", e.target.value)}
                        disabled={isConverted}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-60"
                      >
                        <option value="PHYSICAL_PRODUCT">Physical Product</option>
                        <option value="SERVICE">Service</option>
                      </select>
                    </div>

                    {/* Delete */}
                    <div className="md:col-span-1 flex justify-end pt-5">
                      {!isConverted && items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          title="Remove Line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Custom Configuration Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Custom Specification & Requirement Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 24V 250W BLDC Motor with Hall Sensors, includes custom mounting bracket"
                      value={item.configurationNotes}
                      onChange={(e) => handleItemChange(idx, "configurationNotes", e.target.value)}
                      disabled={isConverted}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 disabled:opacity-60"
                    />
                  </div>

                  {/* Numbers Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, "qty", parseFloat(e.target.value) || 0)}
                        disabled={isConverted}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">
                        Quoted Rate (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        disabled={isConverted}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={item.discountPercent}
                        onChange={(e) =>
                          handleItemChange(idx, "discountPercent", parseFloat(e.target.value) || 0)
                        }
                        disabled={isConverted}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">GST Rate %</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.taxRate}
                        onChange={(e) =>
                          handleItemChange(idx, "taxRate", parseFloat(e.target.value) || 0)
                        }
                        disabled={isConverted}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Line Total</label>
                      <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-navy text-right">
                        {formatINR(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Financial Totals Box */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <div className="w-80 space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
              <div className="flex justify-between text-gray-600 text-xs">
                <span>Gross Subtotal:</span>
                <span className="font-semibold text-gray-800">{formatINR(calculatedSubtotal)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 text-xs">
                  <span>Total Discount:</span>
                  <span className="font-semibold">-{formatINR(calculatedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 text-xs">
                <span>Tax (GST):</span>
                <span className="font-semibold text-gray-800">{formatINR(calculatedTax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-navy border-t border-gray-200 pt-2">
                <span>Total Quoted:</span>
                <span>{formatINR(calculatedTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Customer Notes / Description
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Quotation Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/quotations/${quotationId}`}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
