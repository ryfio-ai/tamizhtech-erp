"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Ban,
  Package,
  Cpu,
  Layers,
  FileCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SalesOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Create Order Dialog
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [orderType, setOrderType] = useState<"PRODUCT" | "ENGINEERING" | "MIXED">("PRODUCT");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<
    Array<{ description: string; quantity: number; unitPrice: number }>
  >([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [creating, setCreating] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales-orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
      toast.error("Failed to load sales orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients?limit=100");
      const data = await res.json();
      if (data.success) {
        setClients(data.data || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenCreateModal = () => {
    fetchClients();
    setSelectedClientId("");
    setOrderType("PRODUCT");
    setDeliveryDate("");
    setNotes("");
    setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    setCreateModalOpen(true);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleLineItemChange = (index: number, field: string, val: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = val;
    setLineItems(updated);
  };

  const handleCreateOrder = async () => {
    if (!selectedClientId) {
      toast.error("Please select a customer.");
      return;
    }

    for (const item of lineItems) {
      if (!item.description.trim()) {
        toast.error("All line items must have a description.");
        return;
      }
      if (item.quantity <= 0) {
        toast.error("Quantity must be greater than zero.");
        return;
      }
    }

    setCreating(true);
    try {
      const res = await fetch("/api/sales-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          orderType,
          deliveryDate: deliveryDate || undefined,
          notes: notes.trim() || undefined,
          items: lineItems.map((item) => ({
            description: item.description.trim(),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create sales order.");
      }

      toast.success(`Sales Order ${data.data.orderNo} created.`);
      setCreateModalOpen(false);
      fetchOrders();
      router.push(`/orders/${data.data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setCreating(false);
    }
  };

  // KPIs
  const totalOrders = orders.length;
  const inProgressOrders = orders.filter(
    (o) => o.status === "IN_PROGRESS" || o.status === "PENDING"
  ).length;
  const fulfilledOrders = orders.filter((o) => o.status === "FULFILLED").length;
  const totalBookValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesType = typeFilter === "ALL" || o.orderType === typeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      o.orderNo?.toLowerCase().includes(q) ||
      o.client?.name?.toLowerCase().includes(q) ||
      o.quotation?.quotationNo?.toLowerCase().includes(q);
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShoppingCart className="w-7 h-7 text-amber-600" />
            <span>Sales Orders</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Commercial Orders, Inventory Reservation, Engineering Project Execution & Delivery Tracking
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleOpenCreateModal}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white h-9 shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Sales Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Orders</span>
            <ShoppingCart className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalOrders}</div>
          <p className="text-[10px] text-slate-400 mt-1">Order commitments recorded</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>In Execution</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-2">{inProgressOrders}</div>
          <p className="text-[10px] text-slate-400 mt-1">Awaiting fulfillment or project tasks</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Fulfilled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-2">{fulfilledOrders}</div>
          <p className="text-[10px] text-slate-400 mt-1">Ready or invoiced</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
            <span>Order Book Value</span>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            ₹{Math.round(totalBookValue).toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Confirmed customer commitments</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Search order no, customer, or quotation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 shadow-xs focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 shadow-xs focus:outline-hidden"
          >
            <option value="ALL">All Order Types</option>
            <option value="PRODUCT">Product Order</option>
            <option value="ENGINEERING">Engineering Project</option>
            <option value="MIXED">Mixed Order</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table of Sales Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading sales orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">
              {orders.length === 0
                ? "No sales orders yet."
                : "No sales orders match your filter."}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Confirmed customer orders will appear here.
            </p>
            {orders.length === 0 && (
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="mt-4 text-xs bg-slate-900 text-white"
              >
                Create Sales Order
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Quotation</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((o) => {
                  const dateStr = new Date(o.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/orders/${o.id}`}
                          className="hover:underline text-slate-900 hover:text-amber-600"
                        >
                          {o.orderNo}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {o.client?.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {o.quotation ? (
                          <Link
                            href={`/quotations/${o.quotation.id}`}
                            className="underline hover:text-slate-800"
                          >
                            {o.quotation.quotationNo}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {o.orderType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4">
                        {o.status === "FULFILLED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            Fulfilled
                          </span>
                        ) : o.status === "IN_PROGRESS" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            In Progress
                          </span>
                        ) : o.status === "CANCELLED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₹{Math.round(o.totalAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              o.progress === 100 ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${o.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {o.progress || 0}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link href={`/orders/${o.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-slate-600 hover:text-slate-900"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Sales Order Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-slate-900">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              <span>Create Official Sales Order</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record a confirmed commercial commitment. The order number will be atomically allocated from the TTRC-SO-YYYY-XXXX business sequence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Customer *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                >
                  <option value="">Select Customer...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.clientCode ? `(${c.clientCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Order Type *
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                >
                  <option value="PRODUCT">Product / Kit Order</option>
                  <option value="ENGINEERING">Engineering Project / Work Order</option>
                  <option value="MIXED">Mixed (Product + Engineering)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Requested Delivery Date
                </label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Internal Notes
                </label>
                <Input
                  placeholder="e.g., Confirmed via Purchase Order PO-982"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Order Line Items</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLineItem}
                  className="text-[11px] h-7"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200"
                  >
                    <div className="col-span-6">
                      <Input
                        placeholder="Description (e.g., Autonomous Rover Kit v2)"
                        value={item.description}
                        onChange={(e) =>
                          handleLineItemChange(idx, "description", e.target.value)
                        }
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          handleLineItemChange(idx, "quantity", Number(e.target.value))
                        }
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Price (₹)"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleLineItemChange(idx, "unitPrice", Number(e.target.value))
                        }
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="text-rose-500 hover:text-rose-700 text-sm font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateOrder}
              disabled={creating}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {creating ? "Creating..." : "Confirm & Save Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
