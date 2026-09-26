"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Package,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Plus,
  RefreshCw,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pos" | "grns" | "bills" | "payments" | "products">("pos");

  // Edit status modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      const data = await res.json();
      if (data.success) {
        setSupplier(data.data);
        setSelectedStatus(data.data.status);
      } else {
        toast.error(data.error || "Failed to load supplier");
      }
    } catch {
      toast.error("Error loading supplier details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchSupplier();
  }, [id]);

  const handleUpdateStatus = async () => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Supplier status updated to ${selectedStatus}`);
        setStatusModalOpen(false);
        fetchSupplier();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error updating status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-brand mx-auto mb-3" />
        <p className="text-sm text-ink-muted">Loading supplier profile...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-ink-primary mb-2">Supplier Not Found</h2>
        <p className="text-sm text-ink-muted mb-6">
          The requested vendor record could not be found or may have been deleted.
        </p>
        <Link href="/suppliers">
          <Button variant="outline">Back to Suppliers</Button>
        </Link>
      </div>
    );
  }

  const { metrics, purchaseOrders = [], goodsReceipts = [], supplierBills = [], payments = [], productsPurchased = [] } = supplier;

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/suppliers">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
                {supplier.legalName}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  supplier.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : supplier.status === "BLOCKED"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                {supplier.status}
              </span>
            </div>
            <p className="text-xs font-mono text-ink-muted mt-0.5">{supplier.supplierCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusModalOpen(true)}
            className="h-9"
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Change Status
          </Button>
          <Link href={`/procurement?supplierId=${supplier.id}`}>
            <Button size="sm" className="h-9 bg-brand hover:bg-brand-dark text-white font-medium">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Purchase Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Supplier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Info Card */}
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Contact & Business Info
          </h3>
          <div className="space-y-2 text-sm">
            {supplier.contactPerson && (
              <div>
                <span className="text-xs text-ink-muted block">Contact Person</span>
                <span className="font-semibold text-ink-primary">{supplier.contactPerson}</span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2 text-ink-primary">
                <Phone className="w-4 h-4 text-ink-muted shrink-0" />
                <span>{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2 text-ink-primary">
                <Mail className="w-4 h-4 text-ink-muted shrink-0" />
                <span>{supplier.email}</span>
              </div>
            )}
            {supplier.billingAddress && (
              <div className="flex items-start gap-2 text-ink-primary">
                <MapPin className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{supplier.billingAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Commercial Terms Card */}
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Tax & Commercial Terms
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-ink-muted block">GSTIN</span>
              <span className="font-mono text-xs font-semibold text-ink-primary">
                {supplier.GSTIN || "Unregistered / Not Provided"}
              </span>
            </div>
            {supplier.PAN && (
              <div>
                <span className="text-xs text-ink-muted block">PAN</span>
                <span className="font-mono text-xs font-semibold text-ink-primary">
                  {supplier.PAN}
                </span>
              </div>
            )}
            <div>
              <span className="text-xs text-ink-muted block">Payment Terms</span>
              <span className="font-semibold text-ink-primary">
                {supplier.paymentTerms || "Net 30"}
              </span>
            </div>
            {supplier.bankDetailsReference && (
              <div>
                <span className="text-xs text-ink-muted block">Bank Identifier</span>
                <span className="font-mono text-xs text-ink-muted">
                  {supplier.bankDetailsReference}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Procurement Financials
          </h3>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-ink-faint/30 rounded-lg">
              <span className="text-xs text-ink-muted block">Orders Placed</span>
              <span className="text-lg font-bold text-ink-primary">{metrics?.ordersPlaced || 0}</span>
            </div>
            <div className="p-3 bg-ink-faint/30 rounded-lg">
              <span className="text-xs text-ink-muted block">Orders Received</span>
              <span className="text-lg font-bold text-emerald-600">{metrics?.ordersReceived || 0}</span>
            </div>
            <div className="p-3 bg-ink-faint/30 rounded-lg">
              <span className="text-xs text-ink-muted block">Total Spend</span>
              <span className="text-base font-bold text-ink-primary">
                ₹{Math.round(metrics?.totalSpend || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
              <span className="text-xs text-amber-800 block font-medium">Outstanding</span>
              <span className="text-base font-bold text-amber-900">
                ₹{Math.round(metrics?.outstandingPayable || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border bg-white rounded-t-xl px-4 pt-2 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("pos")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "pos"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Purchase Orders ({purchaseOrders.length})
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
        <button
          onClick={() => setActiveTab("payments")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "payments"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Supplier Payments ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "products"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Products Purchased ({productsPurchased.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-b-xl border border-t-0 border-border p-5 shadow-sm">
        {/* Purchase Orders Tab */}
        {activeTab === "pos" && (
          <div>
            {purchaseOrders.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No purchase orders yet for this supplier.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">PO Number</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Ordered / Received</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchaseOrders.map((po: any) => (
                      <tr key={po.id} className="hover:bg-ink-faint/20">
                        <td className="py-2.5 px-3 font-semibold text-brand font-mono">
                          {po.poNo}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-ink-muted">
                          {new Date(po.orderDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                            {po.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          {po.fulfillment?.totalReceived || 0} / {po.fulfillment?.totalOrdered || 0} units
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          ₹{Math.round(po.totalAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link href={`/procurement/${po.id}`} className="text-xs text-brand hover:underline">
                            View PO
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

        {/* Goods Receipts Tab */}
        {activeTab === "grns" && (
          <div>
            {goodsReceipts.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No goods receipts recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">GRN No</th>
                      <th className="py-2.5 px-3">Received Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Accepted Qty</th>
                      <th className="py-2.5 px-3">Rejected Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {goodsReceipts.map((grn: any) => (
                      <tr key={grn.id} className="hover:bg-ink-faint/20">
                        <td className="py-2.5 px-3 font-semibold text-ink-primary font-mono">
                          {grn.grnNo}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-ink-muted">
                          {new Date(grn.receivedAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                            {grn.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-emerald-600">
                          {grn.items?.reduce((s: number, i: any) => s + (i.quantityAccepted || 0), 0)} units
                        </td>
                        <td className="py-2.5 px-3 text-xs text-red-600">
                          {grn.items?.reduce((s: number, i: any) => s + (i.quantityRejected || 0), 0)} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Supplier Bills Tab */}
        {activeTab === "bills" && (
          <div>
            {supplierBills.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No supplier bills found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Bill No</th>
                      <th className="py-2.5 px-3">Supplier Invoice #</th>
                      <th className="py-2.5 px-3">Bill Date</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Paid Amount</th>
                      <th className="py-2.5 px-3">Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {supplierBills.map((b: any) => (
                      <tr key={b.id} className="hover:bg-ink-faint/20">
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold">{b.billNo}</td>
                        <td className="py-2.5 px-3 text-xs font-mono">{b.supplierInvoiceNo}</td>
                        <td className="py-2.5 px-3 text-xs text-ink-muted">
                          {new Date(b.billDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          ₹{Math.round(b.totalAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-600">
                          ₹{Math.round(b.paidAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-amber-700">
                          ₹{Math.round(b.balanceAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              b.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
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

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div>
            {payments.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No supplier payments recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Payment No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Reference / UTR</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-ink-faint/20">
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold text-ink-primary">
                          {p.paymentNo}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-ink-muted">
                          {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-xs">{p.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-xs font-mono">{p.referenceNo || "—"}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                          ₹{Math.round(p.amount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Products Purchased Tab */}
        {activeTab === "products" && (
          <div>
            {productsPurchased.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No distinct products purchased yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {productsPurchased.map((prod: any, idx: number) => (
                  <div key={idx} className="p-3 bg-ink-faint/20 rounded-lg border border-border">
                    <h4 className="font-semibold text-ink-primary text-sm">{prod.name}</h4>
                    <p className="text-xs font-mono text-ink-muted mb-2">{prod.sku}</p>
                    <div className="text-xs flex justify-between text-ink-muted">
                      <span>Last Purchase:</span>
                      <span className="font-medium text-ink-primary">
                        {new Date(prod.lastPurchaseDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <div className="text-xs flex justify-between text-ink-muted mt-1">
                      <span>Total Qty Sourced:</span>
                      <span className="font-semibold text-brand">{prod.totalQuantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Status Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Supplier Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-ink-muted">
              Note: Historical procurement records remain intact regardless of status.
            </p>
            <div className="space-y-2">
              {["ACTIVE", "INACTIVE", "BLOCKED"].map((st) => (
                <label
                  key={st}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedStatus === st ? "border-brand bg-brand/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="supplierStatus"
                    value={st}
                    checked={selectedStatus === st}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  />
                  <div>
                    <span className="font-semibold text-sm text-ink-primary">{st}</span>
                    <p className="text-xs text-ink-muted">
                      {st === "ACTIVE"
                        ? "Allowed to receive purchase orders"
                        : st === "INACTIVE"
                        ? "Temporarily suspended from new orders"
                        : "Blocked due to commercial or quality issues"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
              className="bg-brand text-white"
            >
              {updatingStatus ? "Saving..." : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
