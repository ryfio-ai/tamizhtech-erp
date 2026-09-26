"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Ban,
  Package,
  Cpu,
  Truck,
  FileText,
  CreditCard,
  Plus,
  RefreshCw,
  ExternalLink,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Building,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SalesOrderDetailViewProps {
  order: any;
  userRole?: string;
}

export function SalesOrderDetailView({
  order: initialOrder,
  userRole = "ADMIN",
}: SalesOrderDetailViewProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [activeTab, setActiveTab] = useState<"items" | "execution" | "finance" | "timeline">("items");

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Create Project dialog
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState(
    `${order.client?.name} — ${order.items[0]?.description || "Custom Engineering"}`
  );
  const [projectTemplate, setProjectTemplate] = useState<"CUSTOM_ROBOTICS" | "PCB_ENGINEERING" | "AUTOMATION" | "BLANK">("CUSTOM_ROBOTICS");
  const [projectBudget, setProjectBudget] = useState(order.totalAmount);

  // Fulfill dialog
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillQuantities, setFulfillQuantities] = useState<Record<string, number>>({});

  const handleConfirmOrder = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm sales order.");
      }
      toast.success(`Sales Order ${order.orderNo} confirmed.`);
      setOrder(data.data);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel order.");
      }
      toast.success(`Sales Order ${order.orderNo} cancelled.`);
      setOrder(data.data);
      setCancelOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReserveStock = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}/reserve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reserve stock.");
      }
      toast.success("Stock reserved for order items.");
      setOrder(data.data);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reserve stock");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseReservation = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}/release-reservation`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to release reservation.");
      }
      toast.success("Stock reservation released.");
      setOrder(data.data);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to release reservation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenFulfill = () => {
    const initialQty: Record<string, number> = {};
    for (const item of order.items) {
      initialQty[item.id] = item.remainingQuantity || item.quantity;
    }
    setFulfillQuantities(initialQty);
    setFulfillOpen(true);
  };

  const handleExecuteFulfill = async () => {
    setActionLoading(true);
    try {
      const itemsPayload = Object.entries(fulfillQuantities).map(([itemId, qty]) => ({
        itemId,
        quantityFulfilled: Number(qty) || 0,
      }));

      const res = await fetch(`/api/sales-orders/${order.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record fulfillment.");
      }
      toast.success("Order fulfillment updated.");
      setOrder(data.data);
      setFulfillOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to fulfill order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}/create-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          projectTemplate,
          budget: Number(projectBudget),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create project.");
      }
      toast.success(`Project ${data.data.projectCode} initialized.`);
      setProjectOpen(false);
      router.push(`/projects`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setActionLoading(false);
    }
  };

  const isCancelled = order.status === "CANCELLED";
  const isFulfilled = order.status === "FULFILLED";
  const isPending = order.status === "PENDING";
  const isInProgress = order.status === "IN_PROGRESS";

  const orderDateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const deliveryDateStr = order.deliveryDate
    ? new Date(order.deliveryDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not specified";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/orders"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {order.orderNo}
              </h1>
              {isFulfilled ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Fulfilled
                </span>
              ) : isInProgress ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                  In Progress
                </span>
              ) : isCancelled ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                  Cancelled
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                  Pending Confirmation
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                {order.orderType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer: <span className="font-semibold text-slate-800">{order.client?.name}</span> • Placed: {orderDateStr}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {isPending && (
            <Button
              size="sm"
              onClick={handleConfirmOrder}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Confirm Order
            </Button>
          )}

          {(isInProgress || isPending) && (
            <>
              {order.orderType !== "PRODUCT" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setProjectOpen(true)}
                  disabled={actionLoading}
                  className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50 h-9"
                >
                  <Cpu className="w-4 h-4 mr-1.5 text-amber-600" />
                  Create Project
                </Button>
              )}

              {order.orderType !== "ENGINEERING" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReserveStock}
                    disabled={actionLoading}
                    className="text-xs h-9"
                  >
                    <Package className="w-4 h-4 mr-1.5 text-slate-600" />
                    Reserve Stock
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleOpenFulfill}
                    disabled={actionLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
                  >
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    Record Fulfillment
                  </Button>
                </>
              )}
            </>
          )}

          {!isCancelled && !isFulfilled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCancelOpen(true)}
              disabled={actionLoading}
              className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 h-9"
            >
              <Ban className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold">This Sales Order is Cancelled</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Reason: {order.cancelReason || "Cancelled by user"}
            </p>
          </div>
        </div>
      )}

      {/* Fulfillment Progress & Metrics Card */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Fulfillment Status
            </span>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-xl font-bold text-slate-900">
                {order.metrics?.fulfillmentProgress || 0}% Fulfilled
              </span>
              <span className="text-xs text-slate-500">
                ({order.metrics?.totalFulfilledQty || 0} / {order.metrics?.totalOrderedQty || 0} units completed)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center sm:text-right">
            <div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase">Ordered</span>
              <span className="text-sm font-bold text-slate-800">{order.metrics?.totalOrderedQty || 0}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase">Reserved</span>
              <span className="text-sm font-bold text-amber-700">{order.metrics?.totalReservedQty || 0}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase">Remaining</span>
              <span className="text-sm font-bold text-rose-700">{order.metrics?.remainingQty || 0}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              order.metrics?.fulfillmentProgress === 100 ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${order.metrics?.fulfillmentProgress || 0}%` }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold space-x-6">
        <button
          onClick={() => setActiveTab("items")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "items"
              ? "border-amber-600 text-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Order Line Items ({order.items?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("execution")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "execution"
              ? "border-amber-600 text-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Engineering & Delivery ({order.projects?.length || 0} Projects / {order.challans?.length || 0} Challans)
        </button>
        <button
          onClick={() => setActiveTab("finance")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "finance"
              ? "border-amber-600 text-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Invoices & Billing ({order.invoices?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "timeline"
              ? "border-amber-600 text-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Traceability Timeline
        </button>
      </div>

      {/* Tab 1: Line Items Table */}
      {activeTab === "items" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-4 text-center">Ordered</th>
                  <th className="py-3 px-4 text-center">Fulfilled</th>
                  <th className="py-3 px-4 text-center">Remaining</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-sm">
                      <div>{item.description}</div>
                      {item.product && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.product.sku}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-700">
                      {item.fulfilledQuantity || 0}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-rose-700">
                      {item.remainingQuantity || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                      ₹{Math.round(item.unitPrice).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{Math.round(item.totalAmount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/50 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right">Total Order Value:</td>
                  <td className="py-3 px-4 text-right text-sm">
                    ₹{Math.round(order.totalAmount).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Execution (Projects & Delivery Challans) */}
      {activeTab === "execution" && (
        <div className="space-y-6">
          {/* Linked Projects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-amber-600" />
                <span>Linked Engineering Projects</span>
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProjectOpen(true)}
                className="text-xs h-7"
              >
                <Plus className="w-3 h-3 mr-1" />
                New Project
              </Button>
            </div>

            {order.projects?.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                No engineering projects linked to this order yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {order.projects?.map((prj: any) => (
                  <div
                    key={prj.id}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {prj.projectCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {prj.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">{prj.name}</h4>
                    <p className="text-xs text-slate-500">
                      {prj.tasks?.length || 0} Engineering Tasks Scheduled
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <Link href={`/projects`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                          View Project <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Delivery Challans */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Linked Delivery Challans & Dispatches</span>
              </h3>
              <Link href={`/challans`}>
                <Button size="sm" variant="outline" className="text-xs h-7">
                  <Plus className="w-3 h-3 mr-1" />
                  Create Challan
                </Button>
              </Link>
            </div>

            {order.challans?.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                No delivery challans recorded for this order yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {order.challans?.map((ch: any) => (
                  <div
                    key={ch.id}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {ch.challanNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {ch.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">Purpose: {ch.purpose}</p>
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <Link href={`/challans/${ch.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                          View Challan <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Finance & Invoices */}
      {activeTab === "finance" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Linked Invoices</span>
            </h3>
            <Link href={`/invoices`}>
              <Button size="sm" variant="outline" className="text-xs h-7">
                <Plus className="w-3 h-3 mr-1" />
                Issue New Bill
              </Button>
            </Link>
          </div>

          {order.invoices?.length === 0 ? (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
              No invoices generated for this order yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Invoice No</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                    <th className="py-2.5 px-4 text-right">Balance Due</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.invoices?.map((inv: any) => (
                    <tr key={inv.id}>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoiceNo}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {new Date(inv.date || inv.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2.5 px-4 font-semibold">{inv.status}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        ₹{(inv.total / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-700 font-bold">
                        ₹{(inv.balance / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Traceability Timeline */}
      {activeTab === "timeline" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Authoritative Business Lifecycle & Traceability</span>
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {order.timeline?.map((step: any, idx: number) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-amber-600 group-hover:scale-110 transition" />
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{step.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(step.date).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{step.description}</p>
                  {step.href && (
                    <Link
                      href={step.href}
                      className="inline-flex items-center text-[11px] font-semibold text-amber-700 hover:text-amber-800 mt-2"
                    >
                      View Record <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center space-x-2">
              <Ban className="w-5 h-5" />
              <span>Cancel Sales Order {order.orderNo}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cancelling will release any reserved inventory. Orders with active issued invoices or dispatches cannot be cancelled directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Reason for Cancellation *
            </label>
            <Textarea
              rows={3}
              placeholder="e.g., Customer requested change in project scope or budget cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(false)}
              disabled={actionLoading}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelOrder}
              disabled={actionLoading}
            >
              {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-slate-900">
              <Cpu className="w-5 h-5 text-amber-600" />
              <span>Create Engineering Project</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Initialize a dedicated engineering execution space with scheduled tasks and milestones linked to this Sales Order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Project Name *
              </label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Engineering Workflow Template
              </label>
              <select
                value={projectTemplate}
                onChange={(e) => setProjectTemplate(e.target.value as any)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
              >
                <option value="CUSTOM_ROBOTICS">Custom Robotics (Requirement, CAD, Embedded, Testing)</option>
                <option value="PCB_ENGINEERING">PCB Design & Prototyping (Schematic, Layout, Gerber, SMT)</option>
                <option value="BLANK">Blank Project (Manual Tasks)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Allocated Budget (₹)
              </label>
              <Input
                type="number"
                value={projectBudget}
                onChange={(e) => setProjectBudget(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProjectOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {actionLoading ? "Initializing..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Fulfillment Dialog */}
      <Dialog open={fulfillOpen} onOpenChange={setFulfillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-slate-900">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Record Line Item Fulfillment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Specify the quantities fulfilled in this shipment or execution milestone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {order.items?.map((item: any) => (
              <div key={item.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900 mb-1">{item.description}</div>
                <div className="flex items-center justify-between text-slate-500 text-[11px] mb-2">
                  <span>Ordered: {item.quantity}</span>
                  <span>Currently Fulfilled: {item.fulfilledQuantity || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-slate-700 font-medium">Add Fulfilled:</label>
                  <Input
                    type="number"
                    min="0"
                    max={item.remainingQuantity || item.quantity}
                    value={fulfillQuantities[item.id] || 0}
                    onChange={(e) =>
                      setFulfillQuantities({
                        ...fulfillQuantities,
                        [item.id]: Number(e.target.value),
                      })
                    }
                    className="text-xs w-24 h-8 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFulfillOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteFulfill}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? "Updating..." : "Save Fulfillment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
