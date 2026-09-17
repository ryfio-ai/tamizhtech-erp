"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  SlidersHorizontal, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft,
  Edit3,
  Archive,
  PackagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { ResponsiveDrawer } from "@/components/shared/ResponsiveDrawer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SKU_CATEGORIES } from "@/lib/skuConfig";

interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  description: string | null;
  type: string;
  pricingMode?: string;
  status: string;
  basePrice: number | null;
  taxRate: number;
  stockQuantity: number;
  minStock?: number;
  configurationNotes?: string | null;
}

interface StockEntry {
  id: string;
  quantitySigned: number;
  type: string;
  referenceType?: string;
  notes?: string;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Product Creation Drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Motors",
    type: "PHYSICAL_PRODUCT",
    pricingMode: "FIXED",
    basePrice: "",
    initialStock: "1",
    description: "",
    configurationNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [createdSkuModal, setCreatedSkuModal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Product Edit Drawer
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    category: "Motors",
    pricingMode: "FIXED",
    basePrice: "",
    minStock: "5",
    description: "",
    configurationNotes: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  // Archive / Soft-delete confirmation
  const [archiveData, setArchiveData] = useState<{ open: boolean; product: Product | null; loading: boolean }>({
    open: false,
    product: null,
    loading: false,
  });

  // Stock Adjustment Drawer
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustData, setAdjustData] = useState({
    type: "ADJUSTMENT" as "PURCHASE" | "ADJUSTMENT" | "DAMAGE" | "RETURN",
    quantityChange: "",
    notes: "",
  });
  const [adjusting, setAdjusting] = useState(false);

  // Stock History Drawer
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyEntries, setHistoryEntries] = useState<StockEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Inbound Sourcing Drawer
  const [sourcingProduct, setSourcingProduct] = useState<Product | null>(null);
  const [sourcingData, setSourcingData] = useState({
    quantity: "1",
    sourceType: "ONLINE" as "ONLINE" | "OFFLINE" | "IN_HOUSE",
    unitCost: "",
    vendorName: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    initialPaidAmount: "",
    paymentMethod: "UPI",
    notes: "",
  });
  const [sourcingSaving, setSourcingSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const json = await res.json();
      if (json.success) {
        setProducts(json.data || []);
      }
    } catch {
      toast.error("Network error fetching products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          type: formData.type,
          pricingMode: formData.pricingMode,
          basePrice: formData.pricingMode === "FIXED" ? parseFloat(formData.basePrice) || 0 : null,
          initialStock: formData.type === "PHYSICAL_PRODUCT" ? parseInt(formData.initialStock) || 0 : 0,
          description: formData.description.trim() || null,
          configurationNotes: formData.configurationNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Product created successfully");
        setIsCreateOpen(false);
        setCreatedSkuModal(json.data.sku);
        setFormData({
          name: "",
          category: "Motors",
          type: "PHYSICAL_PRODUCT",
          pricingMode: "FIXED",
          basePrice: "",
          initialStock: "1",
          description: "",
          configurationNotes: "",
        });
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to create product");
      }
    } catch {
      toast.error("Network error creating product");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const qty = parseInt(adjustData.quantityChange);
    if (isNaN(qty) || qty === 0) {
      toast.error("Please enter a non-zero quantity change");
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch(`/api/products/${adjustingProduct.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityChange: qty,
          type: adjustData.type,
          notes: adjustData.notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Stock adjusted (${qty > 0 ? "+" : ""}${qty})`);
        setAdjustingProduct(null);
        setAdjustData({ type: "ADJUSTMENT", quantityChange: "", notes: "" });
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to adjust stock");
      }
    } catch {
      toast.error("Network error adjusting stock");
    } finally {
      setAdjusting(false);
    }
  };

  const handleSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcingProduct) return;

    const qty = parseInt(sourcingData.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    const unitCost = parseFloat(sourcingData.unitCost);
    if (isNaN(unitCost) || unitCost < 0) {
      toast.error("Please enter a valid unit cost (₹)");
      return;
    }

    setSourcingSaving(true);
    try {
      const res = await fetch("/api/inventory/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: sourcingProduct.id,
          quantity: qty,
          sourceType: sourcingData.sourceType,
          unitCost: unitCost,
          vendorName: sourcingData.vendorName.trim() || null,
          purchaseDate: sourcingData.purchaseDate,
          initialPaidAmount: parseFloat(sourcingData.initialPaidAmount) || 0,
          paymentMethod: sourcingData.paymentMethod,
          notes: sourcingData.notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Inbound sourcing recorded (+${qty} units at ₹${unitCost}/unit)`);
        setSourcingProduct(null);
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to record sourcing");
      }
    } catch {
      toast.error("Network error recording sourcing");
    } finally {
      setSourcingSaving(false);
    }
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setEditFormData({
      name: p.name,
      category: p.category || "General",
      pricingMode: p.pricingMode || "FIXED",
      basePrice: p.basePrice !== null && p.basePrice !== undefined ? String(p.basePrice) : "",
      minStock: String(p.minStock ?? 5),
      description: p.description || "",
      configurationNotes: p.configurationNotes || "",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editFormData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          category: editFormData.category,
          pricingMode: editFormData.pricingMode,
          basePrice: editFormData.pricingMode === "FIXED" ? parseFloat(editFormData.basePrice) || 0 : null,
          minStock: parseInt(editFormData.minStock) || 0,
          description: editFormData.description.trim() || null,
          configurationNotes: editFormData.configurationNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Product updated successfully");
        setEditingProduct(null);
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to update product");
      }
    } catch {
      toast.error("Network error updating product");
    } finally {
      setEditSaving(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveData.product) return;
    setArchiveData((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/products/${archiveData.product.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Product archived successfully");
        setArchiveData({ open: false, product: null, loading: false });
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to archive product");
        setArchiveData((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      toast.error("Network error archiving product");
      setArchiveData((prev) => ({ ...prev, loading: false }));
    }
  };

  const openHistory = async (product: Product) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}/history`);
      const json = await res.json();
      if (json.success) {
        setHistoryEntries(json.data || []);
      }
    } catch {
      toast.error("Failed to load stock history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("SKU copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const lowStockCount = products.filter((p) => p.type === "PHYSICAL_PRODUCT" && (p.stockQuantity || 0) < (p.minStock || 5)).length;
  const inStockCount = products.filter((p) => p.type === "PHYSICAL_PRODUCT" && (p.stockQuantity || 0) >= (p.minStock || 5)).length;

  const getStockStatus = (p: Product) => {
    if (p.type === "SERVICE") return "SERVICE";
    const qty = p.stockQuantity || 0;
    const min = p.minStock || 5;
    if (qty <= 0) return "OUT_OF_STOCK";
    if (qty < min) return "LOW_STOCK";
    return "IN_STOCK";
  };

  const columns: ColumnDef<Product>[] = [
    {
      header: "Product",
      accessorKey: "name",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink-primary">{row.name}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
              row.type === "SERVICE" 
                ? "bg-purple-50 text-purple-700 border-purple-200" 
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {row.type === "SERVICE" ? "SERVICE" : "PHYSICAL PRODUCT"}
            </span>
          </div>
          {row.description && <div className="text-xs text-ink-secondary truncate max-w-xs mt-0.5">{row.description}</div>}
        </div>
      ),
    },
    {
      header: "SKU",
      accessorKey: "sku",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded border border-border text-ink-primary">
          {row.sku || "-"}
        </span>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-ink-secondary">
          {row.category || "General"}
        </span>
      ),
    },
    {
      header: "Price",
      accessorKey: "basePrice",
      sortable: true,
      cell: (row) => {
        if (row.pricingMode === "REQUIREMENT_BASED" || row.basePrice === null || row.basePrice === undefined) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Based on requirement
            </span>
          );
        }
        return (
          <span className="font-semibold text-ink-primary">
            ₹{Number(row.basePrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      header: "Available Stock",
      accessorKey: "stockQuantity",
      sortable: true,
      cell: (row) => {
        if (row.type === "SERVICE") {
          return <span className="text-xs text-ink-secondary font-medium italic">N/A</span>;
        }
        const qty = row.stockQuantity || 0;
        const min = row.minStock || 5;
        return (
          <span className={`font-bold text-sm ${qty <= 0 ? "text-red-600" : qty < min ? "text-amber-600" : "text-green-700"}`}>
            {qty} units
          </span>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusBadge status={getStockStatus(row)} />,
    },
    {
      header: "Actions",
      accessorKey: "id",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.type === "PHYSICAL_PRODUCT" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSourcingProduct(row);
                setSourcingData({
                  quantity: "1",
                  sourceType: "ONLINE",
                  unitCost: row.basePrice ? String(row.basePrice) : "",
                  vendorName: "",
                  purchaseDate: new Date().toISOString().split("T")[0],
                  initialPaidAmount: "",
                  paymentMethod: "UPI",
                  notes: "",
                });
              }}
              className="h-8 px-2 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              title="Inbound Sourcing & Rolling WAC"
            >
              <PackagePlus className="w-3.5 h-3.5 mr-1" />
              Source
            </Button>
          )}
          {row.type === "PHYSICAL_PRODUCT" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdjustingProduct(row);
                setAdjustData({ type: "ADJUSTMENT", quantityChange: "", notes: "" });
              }}
              className="h-8 px-2 text-xs text-brand hover:bg-brand-50"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
              Adjust
            </Button>
          )}
          {row.type === "PHYSICAL_PRODUCT" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openHistory(row)}
              className="h-8 px-2 text-xs text-ink-secondary hover:text-ink-primary"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              History
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            className="h-8 px-2 text-xs text-ink-secondary hover:text-brand"
            title="Edit Details"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArchiveData({ open: true, product: row, loading: false })}
            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Archive Product"
          >
            <Archive className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // Mobile App Card Transformation (< 768px)
  const renderMobileCard = (p: Product) => {
    const qty = p.stockQuantity || 0;
    const min = p.minStock || 5;
    const isPhysical = p.type === "PHYSICAL_PRODUCT";

    return (
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-ink-primary text-base leading-snug">{p.name}</h4>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                p.type === "SERVICE" 
                  ? "bg-purple-50 text-purple-700 border-purple-200" 
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
                {p.type === "SERVICE" ? "SERVICE" : "PHYSICAL"}
              </span>
            </div>
            {p.sku && (
              <span className="inline-block mt-1 font-mono text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded border border-border text-ink-primary">
                {p.sku}
              </span>
            )}
          </div>
          <StatusBadge status={getStockStatus(p)} />
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <div>
            <span className="text-ink-secondary block">Price</span>
            {p.pricingMode === "REQUIREMENT_BASED" || p.basePrice === null || p.basePrice === undefined ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Based on requirement
              </span>
            ) : (
              <span className="font-bold text-ink-primary text-sm">
                ₹{Number(p.basePrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-ink-secondary block">Stock</span>
            {isPhysical ? (
              <span className={`font-bold text-sm ${qty <= 0 ? "text-red-600" : qty < min ? "text-amber-600" : "text-green-700"}`}>
                {qty} units
              </span>
            ) : (
              <span className="text-xs text-ink-secondary font-medium italic">N/A</span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border flex flex-col gap-2">
          {isPhysical && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdjustingProduct(p);
                  setAdjustData({ type: "ADJUSTMENT", quantityChange: "", notes: "" });
                }}
                className="flex-1 h-9 text-xs text-brand font-semibold"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                Adjust Stock
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openHistory(p)}
                className="flex-1 h-9 text-xs text-ink-secondary hover:text-ink-primary border border-border"
              >
                <History className="w-3.5 h-3.5 mr-1" />
                History
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEdit(p)}
              className="flex-1 h-9 text-xs text-ink-primary font-medium"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1 text-ink-secondary" />
              Edit Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveData({ open: true, product: p, loading: false })}
              className="h-9 px-3 text-xs text-red-600 hover:bg-red-50 border-red-200"
            >
              <Archive className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Products & Stock"
        description="Maintain inventory levels, product catalog, and immutable stock ledger movements."
        actionLabel="Add Product"
        onAction={() => setIsCreateOpen(true)}
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Catalog Products"
          value={products.length}
          subtitle="Physical items & services"
          icon={Package}
        />

        <StatCard
          title="In Stock"
          value={inStockCount}
          subtitle="Healthy stock level"
          icon={CheckCircle2}
          badgeVariant="success"
        />

        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount}
          subtitle="Items requiring replenishment"
          icon={AlertTriangle}
          badge={lowStockCount > 0 ? "Attention Needed" : "Optimal"}
          badgeVariant={lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* 3. DataTable & Mobile Cards */}
      <DataTable
        data={products}
        columns={columns}
        loading={loading}
        searchKey="name,sku,category"
        searchPlaceholder="Search products by name, SKU, or category..."
        emptyTitle="No products found"
        emptyDesc="Click 'Add Product' to create your first catalog item. SKU will be auto-generated."
        renderMobileCard={renderMobileCard}
      />

      {/* 4. Add Product Drawer (No Manual SKU Input) */}
      <ResponsiveDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add Product"
        description="Record a new product or service. SKU is automatically assigned upon save."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. TTRC DGJ 300RPM"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {SKU_CATEGORIES.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.label} ({cat.prefix})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Product Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="PHYSICAL_PRODUCT">Physical Product (Stock Managed)</option>
                <option value="SERVICE">Service (No Stock Movement)</option>
              </select>
            </div>
          </div>

          {/* Auto SKU Banner */}
          <div className="p-3 bg-brand-50/60 border border-brand/20 rounded-lg flex items-center justify-between text-xs">
            <span className="font-semibold text-brand">SKU Code</span>
            <span className="font-mono text-ink-secondary">Will be generated automatically</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Pricing Mode
              </label>
              <select
                value={formData.pricingMode}
                onChange={(e) => setFormData({ ...formData, pricingMode: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="FIXED">Fixed Standard Price (₹)</option>
                <option value="REQUIREMENT_BASED">Based on Customer Requirement / Quotation</option>
              </select>
            </div>

            {formData.pricingMode === "FIXED" && (
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            )}

            {formData.type === "PHYSICAL_PRODUCT" && (
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                  Initial Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  placeholder="1"
                  className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Configuration / Requirement Guidance (Optional)
            </label>
            <input
              type="text"
              value={formData.configurationNotes}
              onChange={(e) => setFormData({ ...formData, configurationNotes: e.target.value })}
              placeholder="e.g. For chargers: 'Spec determined by customer battery requirement'"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Technical specifications, dimensions, or usage notes..."
              className="w-full p-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="h-11 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 px-6 text-xs font-semibold shadow-sm"
            >
              {saving ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 5. Post-Save SKU Confirmation Modal */}
      {createdSkuModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-border text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink-primary">Product Created!</h3>
              <p className="text-xs text-ink-secondary mt-1">
                Your sequential SKU has been assigned:
              </p>
            </div>

            <div className="p-3 bg-gray-50 border border-border rounded-xl flex items-center justify-between">
              <span className="font-mono text-base font-bold text-brand">
                {createdSkuModal}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(createdSkuModal)}
                className="h-8 px-2 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <Button
              onClick={() => setCreatedSkuModal(null)}
              className="w-full h-10 text-xs font-semibold"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* 6. Adjust Stock Drawer */}
      <ResponsiveDrawer
        open={!!adjustingProduct}
        onOpenChange={(open) => {
          if (!open) setAdjustingProduct(null);
        }}
        title={`Adjust Stock: ${adjustingProduct?.name || ""}`}
        description={`Current Stock: ${adjustingProduct?.stockQuantity || 0} units (${adjustingProduct?.sku || ""})`}
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Movement Type *
            </label>
            <select
              value={adjustData.type}
              onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value as any })}
              className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="PURCHASE">Purchase / Stock In (+)</option>
              <option value="ADJUSTMENT">Physical Inventory Adjustment (Correction)</option>
              <option value="DAMAGE">Damage / Scrap Out (-)</option>
              <option value="RETURN">Customer Return (+)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Quantity Change (+ / -) *
            </label>
            <input
              type="number"
              required
              value={adjustData.quantityChange}
              onChange={(e) => setAdjustData({ ...adjustData, quantityChange: e.target.value })}
              placeholder="e.g. 10 for addition, -2 for reduction"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            <p className="text-[11px] text-ink-secondary mt-1">
              Use positive numbers to add stock, or negative numbers to deduct.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Reason / Reference Notes
            </label>
            <input
              type="text"
              value={adjustData.notes}
              onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
              placeholder="e.g. Received shipment from vendor, or broken during testing"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustingProduct(null)}
              className="h-11 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={adjusting}
              className="h-11 px-6 text-xs font-semibold shadow-sm"
            >
              {adjusting ? "Updating..." : "Confirm Adjustment"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 7. Stock Movement History Drawer */}
      <ResponsiveDrawer
        open={!!historyProduct}
        onOpenChange={(open) => {
          if (!open) setHistoryProduct(null);
        }}
        title={`Stock Ledger: ${historyProduct?.name || ""}`}
        description={`Immutable audit trail for SKU ${historyProduct?.sku || ""}`}
      >
        {historyLoading ? (
          <div className="py-12 text-center text-ink-secondary text-sm">
            Loading movement history...
          </div>
        ) : historyEntries.length === 0 ? (
          <div className="py-12 text-center text-ink-secondary text-sm">
            No stock movements recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {historyEntries.map((entry) => {
              const isInbound = entry.quantitySigned > 0;
              return (
                <div
                  key={entry.id}
                  className="p-3 bg-white border border-border rounded-xl flex items-center justify-between text-xs shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        isInbound ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isInbound ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-ink-primary">{entry.type}</div>
                      <div className="text-[11px] text-ink-secondary">
                        {new Date(entry.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                      {entry.notes && <div className="text-[11px] text-ink-secondary mt-0.5">{entry.notes}</div>}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        isInbound ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {isInbound ? `+${entry.quantitySigned}` : entry.quantitySigned} units
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ResponsiveDrawer>

      {/* 8. Edit Product Drawer */}
      <ResponsiveDrawer
        open={!!editingProduct}
        onOpenChange={(open) => {
          if (!open) setEditingProduct(null);
        }}
        title={`Edit: ${editingProduct?.name || ""}`}
        description={`Update catalog details for SKU ${editingProduct?.sku || ""}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Product / Service Name *
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {SKU_CATEGORIES.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.label} ({cat.prefix})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Pricing Mode
              </label>
              <select
                value={editFormData.pricingMode}
                onChange={(e) => setEditFormData({ ...editFormData, pricingMode: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="FIXED">Fixed Standard Price</option>
                <option value="REQUIREMENT_BASED">Based on Requirement</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Standard Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                disabled={editFormData.pricingMode === "REQUIREMENT_BASED"}
                value={editFormData.pricingMode === "REQUIREMENT_BASED" ? "" : editFormData.basePrice}
                onChange={(e) => setEditFormData({ ...editFormData, basePrice: e.target.value })}
                placeholder={editFormData.pricingMode === "REQUIREMENT_BASED" ? "Based on requirement" : "0.00"}
                className={`w-full h-11 px-3.5 text-sm rounded-lg border focus:outline-none ${
                  editFormData.pricingMode === "REQUIREMENT_BASED"
                    ? "bg-gray-100 text-ink-muted border-dashed border-border cursor-not-allowed"
                    : "bg-white border-border focus:ring-2 focus:ring-brand/30 focus:border-brand"
                }`}
              />
            </div>

            {editingProduct?.type === "PHYSICAL_PRODUCT" && (
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.minStock}
                  onChange={(e) => setEditFormData({ ...editFormData, minStock: e.target.value })}
                  className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              General Description
            </label>
            <textarea
              rows={2}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full p-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Configuration / Requirement Notes
            </label>
            <textarea
              rows={2}
              value={editFormData.configurationNotes}
              onChange={(e) => setEditFormData({ ...editFormData, configurationNotes: e.target.value })}
              placeholder="e.g. Voltage, connector type, fabrication lead time..."
              className="w-full p-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingProduct(null)}
              className="h-11 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editSaving}
              className="h-11 px-6 text-xs font-semibold shadow-sm"
            >
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 9. Inbound Sourcing Drawer */}
      <ResponsiveDrawer
        open={!!sourcingProduct}
        onOpenChange={(open) => {
          if (!open) setSourcingProduct(null);
        }}
        title={`Inbound Sourcing: ${sourcingProduct?.name || ""}`}
        description={`Procure new stock for ${sourcingProduct?.sku || ""}. Updates physical stock and dynamically computes rolling WAC.`}
      >
        <form onSubmit={handleSourceSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Source Type *
              </label>
              <select
                value={sourcingData.sourceType}
                onChange={(e) => setSourcingData({ ...sourcingData, sourceType: e.target.value as any })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="ONLINE">Online Procurement (E-Commerce / Portal)</option>
                <option value="OFFLINE">Offline Procurement (Local Supplier)</option>
                <option value="IN_HOUSE">In-House Production / 3D Print / Assembly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                {sourcingData.sourceType === "IN_HOUSE" ? "Production Unit / Lab" : "Vendor / Supplier Name"}
              </label>
              <input
                type="text"
                placeholder={sourcingData.sourceType === "IN_HOUSE" ? "TamizhTech Lab / In-House" : "e.g. Robu.in, Quartz Components"}
                value={sourcingData.vendorName}
                onChange={(e) => setSourcingData({ ...sourcingData, vendorName: e.target.value })}
                className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Quantity (Units) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={sourcingData.quantity}
                onChange={(e) => setSourcingData({ ...sourcingData, quantity: e.target.value })}
                className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Inbound Unit Cost (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={sourcingData.unitCost}
                onChange={(e) => setSourcingData({ ...sourcingData, unitCost: e.target.value })}
                className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Purchase / Incurred Date *
              </label>
              <input
                type="date"
                required
                value={sourcingData.purchaseDate}
                onChange={(e) => setSourcingData({ ...sourcingData, purchaseDate: e.target.value })}
                className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            {sourcingData.sourceType !== "IN_HOUSE" && (
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                  Initial Payment Made (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00 (leave 0 if unpaid/credit)"
                  value={sourcingData.initialPaidAmount}
                  onChange={(e) => setSourcingData({ ...sourcingData, initialPaidAmount: e.target.value })}
                  className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            )}
          </div>

          {sourcingData.sourceType !== "IN_HOUSE" && parseFloat(sourcingData.initialPaidAmount) > 0 && (
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={sourcingData.paymentMethod}
                onChange={(e) => setSourcingData({ ...sourcingData, paymentMethod: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</option>
                <option value="CREDIT_CARD">Credit Card / Debit Card</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Procurement Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Order ID, invoice reference, batch details..."
              value={sourcingData.notes}
              onChange={(e) => setSourcingData({ ...sourcingData, notes: e.target.value })}
              className="w-full p-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSourcingProduct(null)}
              className="h-11 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sourcingSaving}
              className="h-11 px-6 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {sourcingSaving ? "Recording..." : "Record Inbound Sourcing"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 10. Archive Product Confirmation Dialog */}
      <ConfirmDialog
        open={archiveData.open}
        onOpenChange={(open) => setArchiveData((prev) => ({ ...prev, open }))}
        title={`Archive ${archiveData.product?.name || "Product"}?`}
        description={
          archiveData.product
            ? `Are you sure you want to archive SKU "${archiveData.product.sku || archiveData.product.name}"? Historical stock ledgers and past invoices will remain 100% intact.`
            : "Are you sure you want to archive this product?"
        }
        loading={archiveData.loading}
        onConfirm={handleConfirmArchive}
      />
    </div>
  );
}
