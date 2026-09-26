"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Search,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  FileText,
  DollarSign,
  Package,
  Layers,
  ChevronRight,
  X,
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

function ProcurementPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSupplierFilter = searchParams.get("supplierId") || "";

  const [activeTab, setActiveTab] = useState<"pos" | "requests" | "grns">("pos");
  const [loading, setLoading] = useState(true);

  // Dashboard Metrics
  const [metrics, setMetrics] = useState<any>({
    openOrders: 0,
    awaitingReceipt: 0,
    partiallyReceived: 0,
    overdueDeliveries: 0,
    pendingSupplierBills: 0,
    outstandingPayables: 0,
  });

  // Data lists
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Create PO Modal
  const [createPoOpen, setCreatePoOpen] = useState(false);
  const [savingPo, setSavingPo] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierId: initialSupplierFilter,
    projectId: "",
    salesOrderId: "",
    expectedDeliveryDate: "",
    paymentTerms: "Net 30",
    shippingTerms: "FOB Destination",
    notes: "",
    items: [
      {
        productId: "",
        description: "",
        quantity: 1,
        unitPurchasePrice: 0,
        taxRate: 18,
      },
    ],
  });

  // Create GRN Modal
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<any>(null);
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [savingGrn, setSavingGrn] = useState(false);

  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetch("/api/procurement/dashboard");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch {
      // Ignore background metrics failure
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());
      if (initialSupplierFilter) params.append("supplierId", initialSupplierFilter);

      const res = await fetch(`/api/purchase-orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      } else {
        toast.error(data.error || "Failed to load purchase orders");
      }
    } catch {
      toast.error("Network error loading purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/procurement-requests");
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      }
    } catch {}
  };

  const fetchGrns = async () => {
    try {
      const res = await fetch("/api/goods-receipts");
      const data = await res.json();
      if (data.success) {
        setGrns(data.data || []);
      }
    } catch {}
  };

  const loadSupportingData = async () => {
    try {
      const [supRes, prodRes, projRes] = await Promise.all([
        fetch("/api/suppliers?status=ACTIVE"),
        fetch("/api/products"),
        fetch("/api/projects"),
      ]);
      const [supData, prodData, projData] = await Promise.all([
        supRes.json(),
        prodRes.json(),
        projRes.json(),
      ]);

      if (supData.success) {
        const supList = Array.isArray(supData.data)
          ? supData.data
          : Array.isArray(supData.data?.suppliers)
          ? supData.data.suppliers
          : [];
        setSuppliers(supList);
      }
      if (prodData.success) setProducts(prodData.data || []);
      if (projData.success) setProjects(projData.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchDashboardMetrics();
    loadSupportingData();
  }, []);

  useEffect(() => {
    if (activeTab === "pos") fetchOrders();
    if (activeTab === "requests") fetchRequests();
    if (activeTab === "grns") fetchGrns();
  }, [activeTab, statusFilter]);

  // Line item helpers for PO creation
  const addPoItem = () => {
    setPoForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          description: "",
          quantity: 1,
          unitPurchasePrice: 0,
          taxRate: 18,
        },
      ],
    }));
  };

  const removePoItem = (index: number) => {
    if (poForm.items.length <= 1) return;
    setPoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updatePoItem = (index: number, field: string, value: any) => {
    setPoForm((prev) => {
      const updated = [...prev.items];
      if (field === "productId") {
        const prod = products.find((p) => p.id === value);
        updated[index] = {
          ...updated[index],
          productId: value,
          description: prod ? `${prod.name} (${prod.sku})` : updated[index].description,
          unitPurchasePrice: prod?.costPrice || updated[index].unitPurchasePrice,
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      return { ...prev, items: updated };
    });
  };

  const calculatePoTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    for (const it of poForm.items) {
      const lineCost = (Number(it.quantity) || 0) * (Number(it.unitPurchasePrice) || 0);
      const lineTax = lineCost * ((Number(it.taxRate) || 0) / 100);
      subtotal += lineCost;
      taxAmount += lineTax;
    }
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((subtotal + taxAmount) * 100) / 100,
    };
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    setSavingPo(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(poForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Purchase Order ${data.data.poNo} created in DRAFT status!`);
        setCreatePoOpen(false);
        fetchOrders();
        fetchDashboardMetrics();
      } else {
        toast.error(data.error || "Failed to create Purchase Order");
      }
    } catch {
      toast.error("Error creating purchase order");
    } finally {
      setSavingPo(false);
    }
  };

  // Open Quick GRN
  const openGrnModal = (po: any) => {
    setSelectedPoForGrn(po);
    const initialItems = (po.items || []).map((it: any) => {
      const remaining = it.remainingQuantity ?? Math.max(0, it.quantity - (it.receivedQuantity || 0));
      return {
        productId: it.productId,
        description: it.description,
        quantityOrdered: it.quantity,
        quantityRemaining: remaining,
        quantityReceived: remaining, // default to receiving the remaining
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
    if (!selectedPoForGrn) return;

    setSavingGrn(true);
    try {
      const res = await fetch("/api/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: selectedPoForGrn.id,
          supplierId: selectedPoForGrn.vendorId || selectedPoForGrn.supplierId,
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
        toast.success(`GRN ${data.data.grnNo} confirmed! Inventory updated atomically.`);
        setGrnModalOpen(false);
        fetchOrders();
        fetchDashboardMetrics();
      } else {
        toast.error(data.error || "Failed to confirm Goods Receipt");
      }
    } catch {
      toast.error("Error recording goods receipt");
    } finally {
      setSavingGrn(false);
    }
  };

  const totals = calculatePoTotals();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
                Procurement & Purchase Orders
              </h1>
              <p className="text-sm text-ink-muted">
                Demand requests, purchase orders, goods receipts (GRN), and inventory receiving
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "pos") fetchOrders();
              if (activeTab === "requests") fetchRequests();
              if (activeTab === "grns") fetchGrns();
              fetchDashboardMetrics();
            }}
            disabled={loading}
            className="h-10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreatePoOpen(true)}
            className="h-10 bg-brand hover:bg-brand-dark text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Purchase Order
          </Button>
        </div>
      </div>

      {/* Operational Dashboard KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-border shadow-sm">
          <span className="text-xs text-ink-muted block font-medium">Open POs</span>
          <span className="text-xl font-bold text-ink-primary mt-1 block">
            {metrics.openOrders}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-border shadow-sm">
          <span className="text-xs text-ink-muted block font-medium">Awaiting Receipt</span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">
            {metrics.awaitingReceipt}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-border shadow-sm">
          <span className="text-xs text-ink-muted block font-medium">Partially Received</span>
          <span className="text-xl font-bold text-blue-600 mt-1 block">
            {metrics.partiallyReceived}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-border shadow-sm">
          <span className="text-xs text-ink-muted block font-medium">Overdue Deliveries</span>
          <span className="text-xl font-bold text-red-600 mt-1 block">
            {metrics.overdueDeliveries}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-border shadow-sm">
          <span className="text-xs text-ink-muted block font-medium">Pending Bills</span>
          <span className="text-xl font-bold text-ink-primary mt-1 block">
            {metrics.pendingSupplierBills}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-border shadow-sm">
          <span className="text-xs text-ink-muted block font-medium">Outstanding Payables</span>
          <span className="text-base font-bold text-amber-900 mt-1 block truncate">
            ₹{Math.round(metrics.outstandingPayables).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-white rounded-t-xl px-4 pt-2 gap-4">
        <button
          onClick={() => setActiveTab("pos")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "pos"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Purchase Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "requests"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Procurement Demands / Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab("grns")}
          className={`py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "grns"
              ? "border-brand text-brand"
              : "border-transparent text-ink-muted hover:text-ink-primary"
          }`}
        >
          Goods Receipts / GRNs ({grns.length})
        </button>
      </div>

      {/* Main Tab View */}
      <div className="bg-white rounded-b-xl border border-t-0 border-border p-4 shadow-sm space-y-4">
        {activeTab === "pos" && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
                  placeholder="Search PO number or supplier name..."
                  className="pl-9 h-10 text-sm"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["ALL", "DRAFT", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        statusFilter === status
                          ? "bg-brand text-white"
                          : "bg-ink-faint/30 text-ink-muted hover:bg-ink-faint"
                      }`}
                    >
                      {status.replace("_", " ")}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-brand mx-auto mb-3" />
                <p className="text-sm text-ink-muted">Loading purchase orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center max-w-md mx-auto">
                <ClipboardList className="w-12 h-12 text-ink-muted/40 mx-auto mb-3" />
                <h3 className="font-semibold text-ink-primary">No purchase orders yet.</h3>
                <p className="text-sm text-ink-muted mb-4">
                  Create a commercial purchase order against an approved supplier.
                </p>
                <Button onClick={() => setCreatePoOpen(true)} className="bg-brand text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Purchase Order
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="py-3 px-3">PO No</th>
                      <th className="py-3 px-3">Supplier</th>
                      <th className="py-3 px-3">Order Date</th>
                      <th className="py-3 px-3">Expected Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Ordered / Received / Rem</th>
                      <th className="py-3 px-3 text-right">Total Amount</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((po) => {
                      const f = po.fulfillment || { totalOrdered: 0, totalReceived: 0, totalRemaining: 0 };
                      return (
                        <tr key={po.id} className="hover:bg-ink-faint/20 transition-colors">
                          <td className="py-3 px-3">
                            <Link
                              href={`/procurement/${po.id}`}
                              className="font-bold text-brand hover:underline font-mono"
                            >
                              {po.poNo}
                            </Link>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-ink-primary">
                              {po.vendor?.name || po.supplierName || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-ink-muted">
                            {new Date(po.orderDate).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-xs text-ink-muted">
                            {po.expectedDeliveryDate
                              ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN")
                              : "—"}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                po.status === "CONFIRMED"
                                  ? "bg-blue-50 text-blue-700"
                                  : po.status === "RECEIVED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : po.status === "PARTIALLY_RECEIVED"
                                  ? "bg-amber-50 text-amber-700"
                                  : po.status === "CANCELLED"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs">
                            <span className="font-medium text-ink-primary">{f.totalOrdered}</span> ord /{" "}
                            <span className="font-semibold text-emerald-600">{f.totalReceived}</span> rec /{" "}
                            <span className="text-amber-700">{f.totalRemaining}</span> rem
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-ink-primary">
                            ₹{Math.round(po.totalAmount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-right space-x-2">
                            {(po.status === "CONFIRMED" || po.status === "PARTIALLY_RECEIVED") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openGrnModal(po)}
                                className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              >
                                <Truck className="w-3 h-3 mr-1" />
                                Receive Goods
                              </Button>
                            )}
                            <Link href={`/procurement/${po.id}`}>
                              <Button size="sm" variant="ghost" className="h-8 text-xs text-brand">
                                Details <ChevronRight className="w-3 h-3 ml-0.5" />
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
          </>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No procurement requests found. Demands can be created manually or triggered from BOM shortages / Project requirements.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Request No</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Items Count</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-ink-faint/20">
                        <td className="py-2.5 px-3 font-mono font-semibold text-brand">{r.requestNo}</td>
                        <td className="py-2.5 px-3 text-xs">{r.sourceType}</td>
                        <td className="py-2.5 px-3 text-xs font-semibold">{r.priority}</td>
                        <td className="py-2.5 px-3 text-xs">{r.items?.length || 0} line items</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                            {r.status}
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

        {/* GRNs Tab */}
        {activeTab === "grns" && (
          <div className="space-y-3">
            {grns.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">
                No goods receipts recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink-faint/40 border-b border-border text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">GRN No</th>
                      <th className="py-2.5 px-3">Received At</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Accepted Units</th>
                      <th className="py-2.5 px-3">Rejected Units</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {grns.map((g) => {
                      const accepted = g.items?.reduce((s: number, i: any) => s + (i.quantityAccepted || 0), 0);
                      const rejected = g.items?.reduce((s: number, i: any) => s + (i.quantityRejected || 0), 0);
                      return (
                        <tr key={g.id} className="hover:bg-ink-faint/20">
                          <td className="py-2.5 px-3 font-mono font-bold text-ink-primary">{g.grnNo}</td>
                          <td className="py-2.5 px-3 text-xs text-ink-muted">
                            {new Date(g.receivedAt).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                              {g.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-bold text-emerald-600">
                            {accepted} units
                          </td>
                          <td className="py-2.5 px-3 text-xs text-red-600">
                            {rejected} units
                          </td>
                          <td className="py-2.5 px-3 text-xs text-ink-muted truncate max-w-xs">
                            {g.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Purchase Order Dialog */}
      <Dialog open={createPoOpen} onOpenChange={setCreatePoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Authoritative commercial order (TTRC-PO-YYYY-XXXX). Inventory will NOT mutate until goods are physically received.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Supplier / Vendor *
                </label>
                <select
                  required
                  value={poForm.supplierId}
                  onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input text-sm bg-white"
                >
                  <option value="">Select an active supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.legalName} ({s.supplierCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Expected Delivery Date
                </label>
                <Input
                  type="date"
                  value={poForm.expectedDeliveryDate}
                  onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Linked Engineering Project
                </label>
                <select
                  value={poForm.projectId}
                  onChange={(e) => setPoForm({ ...poForm, projectId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input text-sm bg-white"
                >
                  <option value="">None / General Sourcing</option>
                  {projects.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name} ({pr.projectCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Payment Terms
                </label>
                <Input
                  value={poForm.paymentTerms}
                  onChange={(e) => setPoForm({ ...poForm, paymentTerms: e.target.value })}
                  placeholder="e.g. Net 30"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-border rounded-xl p-3 bg-ink-faint/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Order Line Items
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPoItem}
                  className="h-8 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-2">
                {poForm.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-border items-center text-xs"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <select
                        value={it.productId}
                        onChange={(e) => updatePoItem(idx, "productId", e.target.value)}
                        className="w-full h-8 px-2 rounded border border-input bg-white text-xs"
                      >
                        <option value="">Select Product from Catalog</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-12 sm:col-span-3">
                      <Input
                        required
                        placeholder="Item description"
                        value={it.description}
                        onChange={(e) => updatePoItem(idx, "description", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => updatePoItem(idx, "quantity", Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit Price ₹"
                        value={it.unitPurchasePrice}
                        onChange={(e) =>
                          updatePoItem(idx, "unitPurchasePrice", Number(e.target.value))
                        }
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePoItem(idx)}
                        disabled={poForm.items.length <= 1}
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2 text-xs space-y-1">
                <div className="w-48 space-y-1 text-right">
                  <div className="flex justify-between text-ink-muted">
                    <span>Subtotal:</span>
                    <span>₹{totals.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>GST (Est. 18%):</span>
                    <span>₹{totals.taxAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink-primary border-t pt-1">
                    <span>Total Order:</span>
                    <span>₹{totals.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreatePoOpen(false)}
                disabled={savingPo}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingPo} className="bg-brand text-white">
                {savingPo ? "Creating Draft..." : "Create Purchase Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Goods Receipt (GRN) Dialog */}
      <Dialog open={grnModalOpen} onOpenChange={setGrnModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Goods Receipt Note (GRN)</DialogTitle>
            <DialogDescription>
              Record physical incoming items against PO {selectedPoForGrn?.poNo}.
              Confirmed quantities will be added to inventory and rolling WAC recalculated.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmGrn} className="space-y-4">
            <div className="border border-border rounded-xl p-3 bg-ink-faint/10 space-y-2">
              <span className="text-xs font-bold text-ink-muted uppercase">Received Items</span>

              <div className="space-y-3">
                {grnItems.map((git, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-lg border border-border space-y-2 text-xs"
                  >
                    <div className="font-semibold text-ink-primary text-sm">
                      {git.description}
                    </div>
                    <div className="flex gap-4 text-ink-muted">
                      <span>Ordered: <b>{git.quantityOrdered}</b></span>
                      <span>Remaining: <b>{git.quantityRemaining}</b></span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block text-ink-muted font-medium mb-0.5">
                          Received Now:
                        </label>
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
                        <label className="block text-emerald-700 font-medium mb-0.5">
                          Accepted (Stock):
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={git.quantityReceived}
                          value={git.quantityAccepted}
                          onChange={(e) => {
                            const acc = Number(e.target.value) || 0;
                            const updated = [...grnItems];
                            updated[idx].quantityAccepted = acc;
                            updated[idx].quantityRejected = Math.max(
                              0,
                              updated[idx].quantityReceived - acc
                            );
                            setGrnItems(updated);
                          }}
                          className="h-8 text-xs border-emerald-300 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-red-700 font-medium mb-0.5">
                          Rejected (Quarantine):
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={git.quantityReceived}
                          value={git.quantityRejected}
                          onChange={(e) => {
                            const rej = Number(e.target.value) || 0;
                            const updated = [...grnItems];
                            updated[idx].quantityRejected = rej;
                            updated[idx].quantityAccepted = Math.max(
                              0,
                              updated[idx].quantityReceived - rej
                            );
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setGrnModalOpen(false)}
                disabled={savingGrn}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingGrn} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {savingGrn ? "Recording Receipt..." : "Confirm Receipt & Update Inventory"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProcurementPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
      <ProcurementPageInner />
    </Suspense>
  );
}
