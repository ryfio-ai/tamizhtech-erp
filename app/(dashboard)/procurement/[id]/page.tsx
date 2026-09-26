"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ClipboardList,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  Ban,
  FileText,
  DollarSign,
  AlertCircle,
  Plus,
  RefreshCw,
  AlertTriangle,
  Receipt,
  CreditCard,
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

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"items" | "grns" | "bills">("items");

  // Confirming / Cancelling
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // GRN Modal
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [savingGrn, setSavingGrn] = useState(false);

  // Bill Modal
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billForm, setBillForm] = useState({
    supplierInvoiceNo: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    notes: "",
  });
  const [savingBill, setSavingBill] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        toast.error(data.error || "Failed to load Purchase Order");
      }
    } catch {
      toast.error("Error loading order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const handleConfirmOrder = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Purchase Order ${order.poNo} confirmed! Ready for receipt.`);
        fetchOrder();
      } else {
        toast.error(data.error || "Failed to confirm order");
      }
    } catch {
      toast.error("Network error confirming order");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this Purchase Order?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User requested cancellation" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Purchase Order ${order.poNo} cancelled.`);
        fetchOrder();
      } else {
        toast.error(data.error || "Failed to cancel order");
      }
    } catch {
      toast.error("Network error cancelling order");
    } finally {
      setCancelling(false);
    }
  };

  const openGrnModal = () => {
    if (!order) return;
    const initialItems = (order.items || []).map((it: any) => {
      const remaining = it.remainingQuantity ?? Math.max(0, it.quantity - (it.receivedQuantity || 0));
      return {
        productId: it.productId,
        description: it.description,
        quantityOrdered: it.quantity,
        quantityRemaining: remaining,
        quantityReceived: remaining,
        quantityAccepted: remaining,
        quantityRejected: 0,
        unitCost: it.unitCost,
        notes: "",
      };
    });
    setGrnItems(initialItems);
    setGrnModalOpen(true);
  };

  const handleConfirmGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGrn(true);
    try {
      const res = await fetch("/api/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: order.id,
          supplierId: order.vendorId || order.supplierId,
          items: grnItems.map((g) => ({
            productId: g.productId,
            description: g.description,
            quantityOrdered: g.quantityOrdered,
            quantityReceived: Number(g.quantityReceived) || 0,
            quantityAccepted: Number(g.quantityAccepted) || 0,
            quantityRejected: Number(g.quantityRejected) || 0,
            notes: g.notes,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`GRN ${data.data.grnNo} recorded! Stock updated atomically.`);
        setGrnModalOpen(false);
        fetchOrder();
      } else {
        toast.error(data.error || "Failed to record GRN");
      }
    } catch {
      toast.error("Network error recording receipt");
    } finally {
      setSavingGrn(false);
    }
  };

  const openBillModal = () => {
    setBillForm({
      supplierInvoiceNo: "",
      billDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      subtotal: Math.round(order.totalAmount * 0.847 * 100) / 100,
      taxAmount: Math.round(order.totalAmount * 0.153 * 100) / 100,
      totalAmount: Math.round(order.totalAmount * 100) / 100,
      notes: "",
    });
    setBillModalOpen(true);
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.supplierInvoiceNo.trim()) {
      toast.error("Supplier Invoice Number is required");
      return;
    }

    setSavingBill(true);
    try {
      const res = await fetch("/api/supplier-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: order.id,
          supplierId: order.vendorId || order.supplierId,
          ...billForm,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Supplier Bill ${data.data.billNo} recorded!`);
        setBillModalOpen(false);
        fetchOrder();
      } else {
        toast.error(data.error || "Failed to record bill");
      }
    } catch {
      toast.error("Network error recording bill");
    } finally {
      setSavingBill(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-brand mx-auto mb-3" />
        <p className="text-sm text-ink-muted">Loading purchase order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-ink-primary mb-2">Purchase Order Not Found</h2>
        <Link href="/procurement">
          <Button variant="outline">Back to Procurement</Button>
        </Link>
      </div>
    );
  }

  const fulfillment = order.fulfillment || { totalOrdered: 0, totalReceived: 0, totalRemaining: 0 };
  const goodsReceipts = order.goodsReceipts || [];
  const supplierBills = order.supplierBills || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/procurement">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-primary font-mono">
                {order.poNo}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  order.status === "CONFIRMED"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : order.status === "RECEIVED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : order.status === "PARTIALLY_RECEIVED"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : order.status === "CANCELLED"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Ordered on {new Date(order.orderDate).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {order.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="h-9 text-red-600 hover:bg-red-50"
              >
                <Ban className="w-3.5 h-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmOrder}
                disabled={confirming}
                className="h-9 bg-brand hover:bg-brand-dark text-white font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Confirm Order
              </Button>
            </>
          )}

          {(order.status === "CONFIRMED" || order.status === "PARTIALLY_RECEIVED") && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={openBillModal}
                className="h-9"
              >
                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                Add Supplier Bill
              </Button>
              <Button
                size="sm"
                onClick={openGrnModal}
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <Truck className="w-3.5 h-3.5 mr-1.5" />
                Receive Goods (GRN)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier Card */}
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Supplier Information
          </h3>
          <div className="text-sm">
            <Link
              href={`/suppliers/${order.vendorId || order.supplierId}`}
              className="font-bold text-brand hover:underline block text-base"
            >
              {order.vendor?.name || order.supplierName || "Supplier"}
            </Link>
            <p className="text-xs font-mono text-ink-muted mt-1">
              Code: {order.vendor?.code || "—"}
            </p>
            {order.vendor?.gstin && (
              <p className="text-xs text-ink-muted mt-0.5">
                GSTIN: <span className="font-mono">{order.vendor.gstin}</span>
              </p>
            )}
          </div>
        </div>

        {/* Commercial & Terms */}
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Delivery & Commercials
          </h3>
          <div className="space-y-1.5 text-xs text-ink-muted">
            <div>
              <span className="font-semibold text-ink-primary">Expected Delivery:</span>{" "}
              {order.expectedDeliveryDate
                ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN")
                : "Not specified"}
            </div>
            <div>
              <span className="font-semibold text-ink-primary">Payment Terms:</span>{" "}
              {order.paymentTerms || "Net 30"}
            </div>
            {order.projectId && (
              <div>
                <span className="font-semibold text-ink-primary">Linked Project:</span>{" "}
                <span className="text-brand font-mono">{order.projectId}</span>
              </div>
            )}
            {order.salesOrderId && (
              <div>
                <span className="font-semibold text-ink-primary">Linked Sales Order:</span>{" "}
                <span className="text-brand font-mono">{order.salesOrderId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fulfillment Summary */}
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Fulfillment & Amount
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 bg-ink-faint/30 rounded-lg">
              <span className="text-xs text-ink-muted block">Ordered</span>
              <span className="text-base font-bold text-ink-primary">{fulfillment.totalOrdered}</span>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="text-xs text-emerald-800 block">Received</span>
              <span className="text-base font-bold text-emerald-700">{fulfillment.totalReceived}</span>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
              <span className="text-xs text-amber-800 block">Remaining</span>
              <span className="text-base font-bold text-amber-700">{fulfillment.totalRemaining}</span>
            </div>
          </div>
          <div className="text-right pt-2 border-t border-border">
            <span className="text-xs text-ink-muted block">Total Commitment:</span>
            <span className="text-lg font-bold text-ink-primary">
              ₹{Math.round(order.totalAmount).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-white rounded-t-xl px-4 pt-2 gap-4">
        <button
          onClick={() => setActiveTab("items")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "items"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Line Items ({order.items?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("grns")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "grns"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Goods Receipts / GRNs ({goodsReceipts.length})
        </button>
        <button
          onClick={() => setActiveTab("bills")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "bills"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Supplier Bills ({supplierBills.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-b-xl border border-t-0 border-border p-5 shadow-sm">
        {/* Line Items */}
        {activeTab === "items" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Ordered</th>
                  <th className="py-2.5 px-3 text-center">Received</th>
                  <th className="py-2.5 px-3 text-center">Remaining</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items?.map((it: any, idx: number) => (
                  <tr key={idx} className="hover:bg-ink-faint/20">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-ink-primary">{it.description}</div>
                      {it.productId && (
                        <div className="text-xs font-mono text-ink-muted">{it.productId}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-medium">{it.quantity}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">
                      {it.receivedQuantity || 0}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-amber-700">
                      {it.remainingQuantity ?? Math.max(0, it.quantity - (it.receivedQuantity || 0))}
                    </td>
                    <td className="py-3 px-3 text-right">
                      ₹{Number(it.unitCost || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      ₹{Number(it.totalCost || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Goods Receipts */}
        {activeTab === "grns" && (
          <div>
            {goodsReceipts.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No goods receipts recorded against this Purchase Order yet.
              </p>
            ) : (
              <div className="space-y-3">
                {goodsReceipts.map((grn: any) => (
                  <div key={grn.id} className="p-4 bg-ink-faint/20 rounded-xl border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono font-bold text-ink-primary text-base">
                          {grn.grnNo}
                        </span>
                        <p className="text-xs text-ink-muted">
                          Received on {new Date(grn.receivedAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {grn.status}
                      </span>
                    </div>

                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-left text-xs">
                        <thead className="text-ink-muted border-b">
                          <tr>
                            <th className="py-1">Description</th>
                            <th className="py-1 text-center">Received</th>
                            <th className="py-1 text-center">Accepted</th>
                            <th className="py-1 text-center">Rejected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grn.items?.map((gi: any, gIdx: number) => (
                            <tr key={gIdx} className="border-b border-border/50">
                              <td className="py-1.5 font-medium">{gi.description}</td>
                              <td className="py-1.5 text-center">{gi.quantityReceived}</td>
                              <td className="py-1.5 text-center font-bold text-emerald-600">
                                {gi.quantityAccepted}
                              </td>
                              <td className="py-1.5 text-center text-red-600">
                                {gi.quantityRejected}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Supplier Bills */}
        {activeTab === "bills" && (
          <div>
            {supplierBills.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No supplier bills recorded yet. Add a supplier bill when the vendor invoice arrives.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Bill No</th>
                      <th className="py-2.5 px-3">Vendor Invoice #</th>
                      <th className="py-2.5 px-3">Bill Date</th>
                      <th className="py-2.5 px-3">Three-Way Match</th>
                      <th className="py-2.5 px-3 text-right">Bill Amount</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {supplierBills.map((b: any) => (
                      <tr key={b.id} className="hover:bg-ink-faint/20">
                        <td className="py-2.5 px-3 font-mono font-semibold text-xs">{b.billNo}</td>
                        <td className="py-2.5 px-3 font-mono text-xs">{b.supplierInvoiceNo}</td>
                        <td className="py-2.5 px-3 text-xs text-ink-muted">
                          {new Date(b.billDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              b.threeWayMatch?.matchStatus === "MATCHED"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {b.threeWayMatch?.matchStatus || "MATCHED"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          ₹{Math.round(b.totalAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-800">
                          ₹{Math.round(b.balanceAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GRN Dialog */}
      <Dialog open={grnModalOpen} onOpenChange={setGrnModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Goods Receipt Note (GRN)</DialogTitle>
            <DialogDescription>
              Record physical incoming items against PO {order.poNo}. Accepted items update usable inventory and rolling WAC.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmGrn} className="space-y-4">
            <div className="border border-border rounded-xl p-3 bg-ink-faint/10 space-y-2">
              <span className="text-xs font-bold text-ink-muted uppercase">Line Receiving</span>

              <div className="space-y-3">
                {grnItems.map((git, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-border space-y-2 text-xs">
                    <div className="font-semibold text-ink-primary text-sm">{git.description}</div>
                    <div className="flex gap-4 text-ink-muted">
                      <span>Ordered: <b>{git.quantityOrdered}</b></span>
                      <span>Remaining: <b>{git.quantityRemaining}</b></span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block text-ink-muted font-medium mb-0.5">Received Now:</label>
                        <Input
                          type="number"
                          min="0"
                          max={git.quantityRemaining}
                          value={git.quantityReceived}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const updated = [...grnItems];
                            updated[idx].quantityReceived = val;
                            updated[idx].quantityAccepted = val;
                            updated[idx].quantityRejected = 0;
                            setGrnItems(updated);
                          }}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-emerald-700 font-medium mb-0.5">Accepted (Stock):</label>
                        <Input
                          type="number"
                          min="0"
                          max={git.quantityReceived}
                          value={git.quantityAccepted}
                          onChange={(e) => {
                            const acc = Number(e.target.value) || 0;
                            const updated = [...grnItems];
                            updated[idx].quantityAccepted = acc;
                            updated[idx].quantityRejected = Math.max(0, updated[idx].quantityReceived - acc);
                            setGrnItems(updated);
                          }}
                          className="h-8 text-xs border-emerald-300 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-red-700 font-medium mb-0.5">Rejected (Quarantine):</label>
                        <Input
                          type="number"
                          min="0"
                          max={git.quantityReceived}
                          value={git.quantityRejected}
                          onChange={(e) => {
                            const rej = Number(e.target.value) || 0;
                            const updated = [...grnItems];
                            updated[idx].quantityRejected = rej;
                            updated[idx].quantityAccepted = Math.max(0, updated[idx].quantityReceived - rej);
                            setGrnItems(updated);
                          }}
                          className="h-8 text-xs border-red-300 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGrnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingGrn} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {savingGrn ? "Committing Stock..." : "Confirm Receipt & Update Inventory"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      <Dialog open={billModalOpen} onOpenChange={setBillModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Supplier Bill</DialogTitle>
            <DialogDescription>
              Record invoice from vendor. 3-way match will verify totals against PO and GRN.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBill} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-ink-primary block mb-1">
                Supplier Invoice / Bill # *
              </label>
              <Input
                required
                placeholder="e.g. INV-2026-9812"
                value={billForm.supplierInvoiceNo}
                onChange={(e) => setBillForm({ ...billForm, supplierInvoiceNo: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">Bill Date</label>
                <Input
                  type="date"
                  value={billForm.billDate}
                  onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">Due Date</label>
                <Input
                  type="date"
                  value={billForm.dueDate}
                  onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-primary block mb-1">
                Total Bill Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                value={billForm.totalAmount}
                onChange={(e) => setBillForm({ ...billForm, totalAmount: Number(e.target.value) })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setBillModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingBill} className="bg-brand text-white">
                {savingBill ? "Recording..." : "Record Bill"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
