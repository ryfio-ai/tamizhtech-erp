"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  AlertCircle,
  X,
  Package,
} from "lucide-react";

export default function ChallansPage() {
  const [challans, setChallans] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Challan Form State
  const [formData, setFormData] = useState({
    clientId: "",
    purpose: "DEMONSTRATION",
    referenceType: "MANUAL",
    referenceNo: "",
    destination: "",
    transportMode: "Hand Delivery / Road",
    vehicleNo: "",
    lrNumber: "",
    contactPerson: "",
    contactPhone: "",
    notes: "",
    status: "DRAFT",
    deductStock: false,
    items: [
      {
        productId: "",
        sku: "",
        description: "",
        quantity: 1,
        unit: "pcs",
        notes: "",
      },
    ],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchChallans();
    fetchClientsAndProducts();
  }, []);

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/challans");
      const json = await res.json();
      if (json.success) {
        setChallans(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch challans:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsAndProducts = async () => {
    try {
      const [clientsRes, productsRes] = await Promise.all([
        fetch("/api/clients?limit=200").catch(() => null),
        fetch("/api/products?limit=200").catch(() => null),
      ]);
      if (clientsRes) {
        const cJson = await clientsRes.json();
        setClients(cJson.clients || cJson.data || []);
      }
      if (productsRes) {
        const pJson = await productsRes.json();
        setProducts(pJson.products || pJson.data || []);
      }
    } catch (e) {
      console.error("Failed to load reference data:", e);
    }
  };

  const handleClientChange = (clientId: string) => {
    const selected = clients.find((c) => c.id === clientId);
    const dest = selected
      ? [selected.address, selected.city, selected.state, selected.pincode]
          .filter(Boolean)
          .join(", ")
      : "";
    setFormData((prev) => ({
      ...prev,
      clientId,
      contactPerson: selected?.name || "",
      contactPhone: selected?.phone || "",
      destination: dest || prev.destination,
    }));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...formData.items];
    if (prod) {
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        sku: prod.sku || "",
        description: prod.name,
      };
    } else {
      updated[index] = {
        ...updated[index],
        productId: "",
        sku: "",
      };
    }
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          sku: "",
          description: "",
          quantity: 1,
          unit: "pcs",
          notes: "",
        },
      ],
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.clientId) {
      setFormError("Please select a customer / consignee.");
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      if (!it.description.trim()) {
        setFormError(`Item #${i + 1} requires a valid description.`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setFormError(`Item #${i + 1} quantity must be greater than zero.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/challans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create delivery challan");
      }

      setShowCreateModal(false);
      fetchChallans();
      // Reset form
      setFormData({
        clientId: "",
        purpose: "DEMONSTRATION",
        referenceType: "MANUAL",
        referenceNo: "",
        destination: "",
        transportMode: "Hand Delivery / Road",
        vehicleNo: "",
        lrNumber: "",
        contactPerson: "",
        contactPhone: "",
        notes: "",
        status: "DRAFT",
        deductStock: false,
        items: [
          {
            productId: "",
            sku: "",
            description: "",
            quantity: 1,
            unit: "pcs",
            notes: "",
          },
        ],
      });
    } catch (err: any) {
      setFormError(err.message || "Failed to create Delivery Challan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredChallans = challans.filter((c) => {
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.challanNumber?.toLowerCase().includes(q) ||
      c.client?.name?.toLowerCase().includes(q) ||
      c.purpose?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-900 text-white shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Delivery Challans / Gate Passes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Authoritative internal goods movement, project-site deliveries, demo dispatch, and gate passes.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Delivery Challan
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "ISSUED", "DRAFT", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by challan no, customer, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {/* Challans Table / List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading delivery challans...</div>
        ) : filteredChallans.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No Delivery Challans found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Create a Delivery Challan to record non-financial dispatches, demonstration samples, or gate passes for customer sites.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Delivery Challan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3 sm:p-4">Challan No</th>
                  <th className="p-3 sm:p-4">Customer</th>
                  <th className="p-3 sm:p-4">Purpose</th>
                  <th className="p-3 sm:p-4">Date</th>
                  <th className="p-3 sm:p-4 text-center">Items / Qty</th>
                  <th className="p-3 sm:p-4 text-center">Status</th>
                  <th className="p-3 sm:p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChallans.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 sm:p-4 font-mono font-bold text-slate-900">
                      <Link href={`/challans/${c.id}`} className="hover:underline text-indigo-600">
                        {c.challanNumber}
                      </Link>
                    </td>
                    <td className="p-3 sm:p-4">
                      <p className="font-semibold text-slate-900">{c.client?.name || "—"}</p>
                      {c.client?.company && (
                        <p className="text-[11px] text-slate-500">{c.client.company}</p>
                      )}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {c.purpose?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-slate-600 text-xs">
                      {new Date(c.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-xs">
                      <span className="font-semibold text-slate-900">{c.itemCount} items</span>
                      <span className="text-slate-400 block text-[11px]">
                        ({c.totalQuantity} units)
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      {c.status === "ISSUED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> ISSUED
                        </span>
                      ) : c.status === "CANCELLED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                          <Ban className="w-3 h-3" /> CANCELLED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> DRAFT
                        </span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/challans/${c.id}`}
                          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={`/api/challans/${c.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Delivery Challan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">New Delivery Challan / Gate Pass</h3>
                <p className="text-xs text-slate-500">
                  Non-financial movement document for project deliveries, demonstrations, and dispatch.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Customer & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer / Consignee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white outline-none focus:border-slate-900"
                  >
                    <option value="">Select a Customer...</option>
                    {clients.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name} {cl.company ? `(${cl.company})` : ""} - {cl.clientCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purpose of Movement <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value as any })}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white outline-none focus:border-slate-900"
                  >
                    <option value="DEMONSTRATION">Demonstration / Client Demo</option>
                    <option value="PROJECT_DELIVERY">Project Stage Delivery</option>
                    <option value="CUSTOMER_SITE">Customer Site Deployment</option>
                    <option value="REPAIR_RETURN">Repair / Return Movement</option>
                    <option value="SAMPLE">Engineering Sample</option>
                    <option value="INTERNAL_TRANSFER">Internal Movement</option>
                    <option value="WORKSHOP_EQUIPMENT">Workshop Equipment</option>
                    <option value="OTHER">Other Movement</option>
                  </select>
                </div>
              </div>

              {/* Destination Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shipping / Destination Address
                </label>
                <textarea
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="Complete site/delivery address..."
                  rows={2}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-slate-900"
                />
              </div>

              {/* Transport Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Transport Mode
                  </label>
                  <input
                    type="text"
                    value={formData.transportMode}
                    onChange={(e) => setFormData({ ...formData, transportMode: e.target.value })}
                    placeholder="e.g. Road, Courier, Hand Carry"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleNo}
                    onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                    placeholder="e.g. TN 38 BX 1234"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    LR / Tracking No
                  </label>
                  <input
                    type="text"
                    value={formData.lrNumber}
                    onChange={(e) => setFormData({ ...formData, lrNumber: e.target.value })}
                    placeholder="e.g. DKT-987654"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Dispatched Items & Equipment
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs"
                    >
                      {/* Product Selector (optional link to catalog) */}
                      <div className="col-span-12 sm:col-span-4">
                        <select
                          value={it.productId || ""}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 bg-white outline-none"
                        >
                          <option value="">(Manual Description or Pick Product)</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.sku ? `[${p.sku}]` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="col-span-12 sm:col-span-4">
                        <input
                          type="text"
                          required
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="Item Description *"
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 outline-none"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 text-center font-bold"
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-6 sm:col-span-1">
                        <input
                          type="text"
                          value={it.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          placeholder="Unit"
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 text-center"
                        />
                      </div>

                      {/* Remove Row */}
                      <div className="col-span-2 sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={formData.items.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Deduction Toggle */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="deductStockCheck"
                  checked={formData.deductStock}
                  onChange={(e) => setFormData({ ...formData, deductStock: e.target.checked })}
                  className="rounded text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="deductStockCheck" className="text-xs text-slate-700 cursor-pointer">
                  <strong className="text-slate-900">Deduct Physical Inventory:</strong> Check this
                  ONLY if goods are physically dispatched directly under this Challan without a prior invoice.
                  Leave unchecked if an Invoice / Order already depleted stock.
                </label>
              </div>

              {/* Status choice */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Document State
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white outline-none"
                  >
                    <option value="DRAFT">DRAFT (Provisional number, can be edited)</option>
                    <option value="ISSUED">ISSUED (Allocates permanent TTRC-DC-YYYY-XXXX)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Return expected in 3 days, Site engineer Sathish"
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Delivery Challan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
