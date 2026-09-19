"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  SlidersHorizontal, 
  History, 
  Edit3,
  Archive,
  PackagePlus,
  Hammer,
  ReceiptText,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  Coins
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
  isSaleable?: boolean;
  pricingMode?: string;
  status: string;
  basePrice: number | null;
  taxRate: number;
  stockQuantity: number;
  minStock?: number;
  rollingWACRupees?: number;
  valuationRupees?: number;
  configurationNotes?: string | null;
}

interface StockEntry {
  id: string;
  quantitySigned: number;
  unitCost?: number | null;
  costAmount?: number | null;
  type: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

interface ProductionBatchItem {
  id: string;
  inputProductId: string;
  quantityConsumed: number;
  unitCostRupees: number;
  totalCostRupees: number;
  inputProduct?: { name: string; sku: string };
}

interface ProductionBatch {
  id: string;
  productionNo: string;
  quantityProduced: number;
  materialCostRupees: number;
  directCostRupees: number;
  totalProductionCostRupees: number;
  unitProductionCostRupees: number;
  productionDate: string;
  status: string;
  notes?: string;
  cancelledAt?: string;
  cancelReason?: string;
  finishedProduct?: { name: string; sku: string };
  items: ProductionBatchItem[];
  createdBy?: { name: string; email: string };
}

type TabType = "ALL" | "FINISHED_PRODUCT" | "RAW_MATERIAL" | "COMPONENT" | "CONSUMABLE" | "SERVICE";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("ALL");

  // Product Creation Drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Motors",
    type: "FINISHED_PRODUCT",
    isSaleable: true,
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
    type: "FINISHED_PRODUCT",
    isSaleable: true,
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

  // Fast Production Modal
  const [isProductionOpen, setIsProductionOpen] = useState(false);
  const [productionTarget, setProductionTarget] = useState<Product | null>(null);
  const [productionQty, setProductionQty] = useState<number>(1);
  const [productionDirectCost, setProductionDirectCost] = useState<string>("0");
  const [productionNotes, setProductionNotes] = useState<string>("");
  const [productionComponents, setProductionComponents] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [productionSubmitting, setProductionSubmitting] = useState(false);

  // Production Batches Drawer
  const [isProductionBatchesOpen, setIsProductionBatchesOpen] = useState(false);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [cancellingBatch, setCancellingBatch] = useState<ProductionBatch | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products?includeValuation=true");
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

  const fetchProductionBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await fetch("/api/production?limit=50");
      const json = await res.json();
      if (json.success) {
        setProductionBatches(json.data || []);
      }
    } catch {
      toast.error("Failed to load production batches");
    } finally {
      setBatchesLoading(false);
    }
  };

  const handleOpenProductionBatches = () => {
    setIsProductionBatchesOpen(true);
    fetchProductionBatches();
  };

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
          isSaleable: formData.isSaleable,
          pricingMode: formData.pricingMode,
          basePrice: formData.pricingMode === "FIXED" ? parseFloat(formData.basePrice) || 0 : null,
          initialStock: formData.type !== "SERVICE" ? parseInt(formData.initialStock) || 0 : 0,
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
          type: "FINISHED_PRODUCT",
          isSaleable: true,
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

  const openProductionModal = (targetProd?: Product) => {
    const finishedProducts = products.filter(
      (p) => p.type === "FINISHED_PRODUCT" || p.type === "PHYSICAL_PRODUCT"
    );
    const prod = targetProd || finishedProducts[0] || null;
    setProductionTarget(prod);
    setProductionQty(1);
    setProductionDirectCost("0");
    setProductionNotes("");

    // Pre-populate with first available component if any
    const availableComponents = products.filter(
      (p) => p.type === "COMPONENT" || p.type === "RAW_MATERIAL" || p.type === "CONSUMABLE"
    );
    if (availableComponents.length > 0) {
      setProductionComponents([{ productId: availableComponents[0].id, quantity: 1 }]);
    } else {
      setProductionComponents([]);
    }
    setIsProductionOpen(true);
  };

  const handleAddProductionComponent = () => {
    const availableComponents = products.filter(
      (p) => p.type === "COMPONENT" || p.type === "RAW_MATERIAL" || p.type === "CONSUMABLE"
    );
    if (availableComponents.length > 0) {
      setProductionComponents((prev) => [
        ...prev,
        { productId: availableComponents[0].id, quantity: 1 },
      ]);
    } else {
      toast.error("No material or component stock items found in catalog.");
    }
  };

  const handleRemoveProductionComponent = (index: number) => {
    setProductionComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExecuteProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productionTarget) {
      toast.error("Please select a target finished product");
      return;
    }
    if (productionQty <= 0) {
      toast.error("Production quantity must be at least 1");
      return;
    }
    if (productionComponents.length === 0) {
      toast.error("Please add at least one component or raw material");
      return;
    }

    setProductionSubmitting(true);
    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedProductId: productionTarget.id,
          quantityProduced: productionQty,
          directCost: parseFloat(productionDirectCost) || 0,
          notes: productionNotes.trim() || null,
          components: productionComponents.map((c) => ({
            productId: c.productId,
            quantity: Number(c.quantity),
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Production completed! Generated ${productionQty} units of ${productionTarget.name}.`);
        setIsProductionOpen(false);
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to execute production");
      }
    } catch {
      toast.error("Network error executing production");
    } finally {
      setProductionSubmitting(false);
    }
  };

  const handleCancelProductionBatch = async () => {
    if (!cancellingBatch) return;
    if (!cancelReasonInput.trim() || cancelReasonInput.trim().length < 3) {
      toast.error("Please enter a valid cancellation reason (min 3 characters)");
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/production/${cancellingBatch.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: cancelReasonInput.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Production ${cancellingBatch.productionNo} cancelled. Compensating reversals applied.`);
        setCancellingBatch(null);
        setCancelReasonInput("");
        fetchProductionBatches();
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to cancel production");
      }
    } catch {
      toast.error("Network error cancelling production");
    } finally {
      setIsCancelling(false);
    }
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setEditFormData({
      name: p.name,
      category: p.category || "General",
      type: p.type,
      isSaleable: p.isSaleable ?? true,
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
          type: editFormData.type,
          isSaleable: editFormData.isSaleable,
          pricingMode: editFormData.pricingMode,
          basePrice: editFormData.pricingMode === "FIXED" ? parseFloat(editFormData.basePrice) || 0 : null,
          minStock: parseInt(editFormData.minStock) || 5,
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

  // Filter products according to active tab
  const filteredProducts = products.filter((p) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "FINISHED_PRODUCT") {
      return p.type === "FINISHED_PRODUCT" || p.type === "PHYSICAL_PRODUCT";
    }
    return p.type === activeTab;
  });

  // KPI Calculations
  const finishedGoods = products.filter((p) => p.type === "FINISHED_PRODUCT" || p.type === "PHYSICAL_PRODUCT");
  const finishedUnits = finishedGoods.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
  const finishedValuation = finishedGoods.reduce((sum, p) => sum + (p.valuationRupees || 0), 0);

  const materialsAndComponents = products.filter((p) => p.type === "RAW_MATERIAL" || p.type === "COMPONENT");
  const materialUnits = materialsAndComponents.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
  const materialValuation = materialsAndComponents.reduce((sum, p) => sum + (p.valuationRupees || 0), 0);

  const consumables = products.filter((p) => p.type === "CONSUMABLE");
  const consumableUnits = consumables.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);

  const lowStockCount = products.filter((p) => p.type !== "SERVICE" && (p.stockQuantity || 0) < (p.minStock || 5)).length;

  const getStockStatus = (p: Product) => {
    if (p.type === "SERVICE") return "SERVICE";
    const qty = p.stockQuantity || 0;
    const min = p.minStock || 5;
    if (qty <= 0) return "OUT_OF_STOCK";
    if (qty < min) return "LOW_STOCK";
    return "IN_STOCK";
  };

  const getClassificationBadge = (type: string, isSaleable?: boolean) => {
    switch (type) {
      case "FINISHED_PRODUCT":
      case "PHYSICAL_PRODUCT":
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
            Finished Product
          </span>
        );
      case "COMPONENT":
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
            Component {isSaleable ? "• Saleable" : ""}
          </span>
        );
      case "RAW_MATERIAL":
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
            Raw Material
          </span>
        );
      case "CONSUMABLE":
        return (
          <span className="bg-gray-100 text-gray-700 border border-gray-300 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
            Consumable
          </span>
        );
      case "SERVICE":
        return (
          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
            Service
          </span>
        );
      default:
        return null;
    }
  };

  // Production Preview Math
  const estimatedMaterialCost = productionComponents.reduce((sum, comp) => {
    const prod = products.find((p) => p.id === comp.productId);
    const wac = prod?.rollingWACRupees || 0;
    return sum + (Number(comp.quantity) || 0) * wac;
  }, 0);
  const estimatedDirectCost = parseFloat(productionDirectCost) || 0;
  const estimatedTotalCost = estimatedMaterialCost + estimatedDirectCost;
  const estimatedUnitCost = productionQty > 0 ? estimatedTotalCost / productionQty : 0;

  const columns: ColumnDef<Product>[] = [
    {
      header: "Item & Classification",
      accessorKey: "name",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink-primary">{row.name}</span>
            {getClassificationBadge(row.type, row.isSaleable)}
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
      header: "Rolling WAC",
      accessorKey: "rollingWACRupees",
      sortable: true,
      cell: (row) => {
        if (row.type === "SERVICE") return <span className="text-xs text-ink-secondary italic">-</span>;
        const wac = row.rollingWACRupees ?? 0;
        return (
          <span className="font-medium text-xs text-ink-primary">
            ₹{wac.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      header: "Inventory Value",
      accessorKey: "valuationRupees",
      sortable: true,
      cell: (row) => {
        if (row.type === "SERVICE") return <span className="text-xs text-ink-secondary italic">-</span>;
        const val = row.valuationRupees ?? 0;
        return (
          <span className="font-bold text-xs text-brand">
            ₹{val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      header: "Selling Price",
      accessorKey: "basePrice",
      sortable: true,
      cell: (row) => {
        if (!row.isSaleable && row.type !== "FINISHED_PRODUCT" && row.type !== "PHYSICAL_PRODUCT" && row.type !== "SERVICE") {
          return <span className="text-[11px] text-gray-400 italic">Internal use</span>;
        }
        if (row.pricingMode === "REQUIREMENT_BASED" || row.basePrice === null || row.basePrice === undefined) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              On Requirement
            </span>
          );
        }
        return (
          <span className="font-semibold text-xs text-ink-primary">
            ₹{Number(row.basePrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {/* Produce Button (Enabled for Finished Products) */}
          {(row.type === "FINISHED_PRODUCT" || row.type === "PHYSICAL_PRODUCT") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openProductionModal(row)}
              className="h-7 px-2 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              title="Manufacture in-house (Consume materials & create finished product)"
            >
              <Hammer className="w-3.5 h-3.5 mr-1" />
              Produce
            </Button>
          )}

          {/* Quick Bill Button (for saleable items) */}
          {(row.isSaleable || row.type === "FINISHED_PRODUCT" || row.type === "PHYSICAL_PRODUCT") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/invoices")}
              className="h-7 px-2 text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
              title="Issue customer bill"
            >
              <ReceiptText className="w-3.5 h-3.5 mr-1" />
              Bill
            </Button>
          )}

          {/* Add Stock / Source Button (for all physical items) */}
          {row.type !== "SERVICE" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSourcingProduct(row);
                setSourcingData({
                  quantity: "1",
                  sourceType: "ONLINE",
                  unitCost: row.rollingWACRupees ? String(row.rollingWACRupees) : row.basePrice ? String(row.basePrice) : "",
                  vendorName: "",
                  purchaseDate: new Date().toISOString().split("T")[0],
                  initialPaidAmount: "",
                  paymentMethod: "UPI",
                  notes: "",
                });
              }}
              className="h-7 px-2 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              title="Inbound Sourcing & Rolling WAC"
            >
              <PackagePlus className="w-3.5 h-3.5 mr-1" />
              Add Stock
            </Button>
          )}

          {/* Adjust Stock */}
          {row.type !== "SERVICE" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdjustingProduct(row);
                setAdjustData({ type: "ADJUSTMENT", quantityChange: "", notes: "" });
              }}
              className="h-7 px-2 text-xs text-brand hover:bg-brand-50"
              title="Manual Stock Adjustment"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* History */}
          {row.type !== "SERVICE" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openHistory(row)}
              className="h-7 px-2 text-xs text-ink-secondary hover:text-ink-primary"
              title="View Stock Movement Ledger"
            >
              <History className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            className="h-7 px-2 text-xs text-ink-secondary hover:text-brand"
            title="Edit Details"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArchiveData({ open: true, product: row, loading: false })}
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Archive Product"
          >
            <Archive className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (p: Product) => {
    const qty = p.stockQuantity || 0;
    const min = p.minStock || 5;
    const isPhysical = p.type !== "SERVICE";

    return (
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-ink-primary text-base leading-snug">{p.name}</h4>
              {getClassificationBadge(p.type, p.isSaleable)}
            </div>
            {p.sku && (
              <span className="inline-block mt-1 font-mono text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded border border-border text-ink-primary">
                {p.sku}
              </span>
            )}
          </div>
          <StatusBadge status={getStockStatus(p)} />
        </div>

        <div className="pt-2 border-t border-border grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-ink-secondary block">Stock</span>
            {isPhysical ? (
              <span className={`font-bold text-sm ${qty <= 0 ? "text-red-600" : qty < min ? "text-amber-600" : "text-green-700"}`}>
                {qty} units
              </span>
            ) : (
              <span className="text-xs text-ink-secondary font-medium italic">N/A</span>
            )}
          </div>

          <div>
            <span className="text-ink-secondary block">Rolling WAC</span>
            <span className="font-semibold text-ink-primary">
              ₹{(p.rollingWACRupees || 0).toFixed(2)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-ink-secondary block">Valuation</span>
            <span className="font-bold text-brand">
              ₹{(p.valuationRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          {(p.type === "FINISHED_PRODUCT" || p.type === "PHYSICAL_PRODUCT") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openProductionModal(p)}
              className="text-xs text-indigo-700 border-indigo-200"
            >
              <Hammer className="w-3.5 h-3.5 mr-1" /> Produce
            </Button>
          )}
          {isPhysical && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSourcingProduct(p);
                setSourcingData({
                  quantity: "1",
                  sourceType: "ONLINE",
                  unitCost: p.rollingWACRupees ? String(p.rollingWACRupees) : "",
                  vendorName: "",
                  purchaseDate: new Date().toISOString().split("T")[0],
                  initialPaidAmount: "",
                  paymentMethod: "UPI",
                  notes: "",
                });
              }}
              className="text-xs text-emerald-700 border-emerald-300"
            >
              <PackagePlus className="w-3.5 h-3.5 mr-1" /> Add Stock
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEdit(p)}
            className="text-xs text-ink-secondary"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Inventory & Stock Architecture"
          description="Material/Component Manufacturing Stock ──► In-House Production ──► Finished Sale Stock"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleOpenProductionBatches}
            className="h-10 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1.5 shadow-sm"
          >
            <Hammer className="w-4 h-4" />
            Production Batches
          </Button>

          <Button
            onClick={() => openProductionModal()}
            className="h-10 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
          >
            <Hammer className="w-4 h-4" />
            Start Production
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-10 text-xs font-semibold bg-brand hover:bg-brand-600 text-white gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* 2. Operational Layer KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Finished Sale Stock"
          value={`${finishedUnits} units`}
          subtitle={`₹${finishedValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })} valuation`}
          icon={Package}
          badgeVariant="success"
        />

        <StatCard
          title="Materials & Components"
          value={`${materialUnits} units`}
          subtitle={`₹${materialValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })} internal inventory`}
          icon={Hammer}
          badgeVariant="default"
        />

        <StatCard
          title="Consumables & Hardware"
          value={`${consumableUnits} units`}
          subtitle={`${consumables.length} tracked consumable items`}
          icon={Coins}
          badgeVariant="default"
        />

        <StatCard
          title="Low Stock Replenishment"
          value={lowStockCount}
          subtitle="Items below min threshold"
          icon={AlertTriangle}
          badge={lowStockCount > 0 ? "Reorder Needed" : "Optimal"}
          badgeVariant={lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* 3. Classification Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        {[
          { id: "ALL", label: "All Items", count: products.length },
          { id: "FINISHED_PRODUCT", label: "Finished Products (Sale Stock)", count: finishedGoods.length },
          { id: "RAW_MATERIAL", label: "Raw Materials", count: products.filter((p) => p.type === "RAW_MATERIAL").length },
          { id: "COMPONENT", label: "Components", count: products.filter((p) => p.type === "COMPONENT").length },
          { id: "CONSUMABLE", label: "Consumables", count: consumables.length },
          { id: "SERVICE", label: "Services", count: products.filter((p) => p.type === "SERVICE").length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-navy text-white shadow-sm"
                : "text-ink-secondary hover:text-ink-primary hover:bg-gray-100"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-200 text-ink-secondary"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. DataTable & Mobile Cards */}
      <DataTable
        data={filteredProducts}
        columns={columns}
        loading={loading}
        searchKey="name,sku,category"
        searchPlaceholder="Search by name, SKU, or category..."
        emptyTitle="No inventory items found"
        emptyDesc="No items match the current classification filter. Click 'Add Item' to record one."
        renderMobileCard={renderMobileCard}
      />

      {/* 5. Add Item / Product Drawer */}
      <ResponsiveDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add Inventory Item"
        description="Record a raw material, component, consumable, finished product, or service."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Inventory Classification *
            </label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value;
                setFormData({
                  ...formData,
                  type: newType,
                  isSaleable: newType === "FINISHED_PRODUCT" || newType === "SERVICE",
                });
              }}
              className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium"
            >
              <option value="FINISHED_PRODUCT">Finished Product (In-House or commercial sale inventory)</option>
              <option value="COMPONENT">Component (Motor, sensor, ESC, battery, PCB for assembly)</option>
              <option value="RAW_MATERIAL">Raw Material (Aluminium, wire, acrylic, filament)</option>
              <option value="CONSUMABLE">Consumable (Fasteners, solder, tape, heat shrink)</option>
              <option value="SERVICE">Service (Custom R&D, 3D printing service, repair - no physical stock)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Item Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. TTRC DGJ 300RPM Motor, LiPo 3S 2200mAh, Robot Chassis"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Category
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
                Pricing Mode
              </label>
              <select
                value={formData.pricingMode}
                onChange={(e) => setFormData({ ...formData, pricingMode: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="FIXED">Fixed Commercial Price (₹)</option>
                <option value="REQUIREMENT_BASED">Requirement / Quote Based</option>
              </select>
            </div>
          </div>

          {/* Saleable Configuration Checkbox */}
          {formData.type !== "SERVICE" && formData.type !== "FINISHED_PRODUCT" && (
            <div className="p-3 bg-gray-50 border border-border rounded-lg flex items-start gap-2.5">
              <input
                type="checkbox"
                id="isSaleableCheckbox"
                checked={formData.isSaleable}
                onChange={(e) => setFormData({ ...formData, isSaleable: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <label htmlFor="isSaleableCheckbox" className="text-xs text-ink-primary cursor-pointer">
                <span className="font-semibold block">Directly Saleable to Customers</span>
                <span className="text-ink-secondary text-[11px]">
                  Allow this component/material to be selected directly on invoices and quotations.
                </span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formData.pricingMode === "FIXED" && (
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                  Base Selling Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            )}

            {formData.type !== "SERVICE" && (
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                  Initial Opening Stock (Units)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  placeholder="0"
                  className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Technical specifications, dimensions, RPM, torque..."
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
              className="h-11 px-6 text-xs font-semibold shadow-sm bg-brand hover:bg-brand-600 text-white"
            >
              {saving ? "Saving..." : "Save Item"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 6. Post-Save SKU Confirmation Modal */}
      {createdSkuModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-border text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink-primary">Item Created!</h3>
              <p className="text-xs text-ink-secondary mt-1">
                Sequential SKU automatically assigned:
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

      {/* 7. Fast Production Drawer */}
      <ResponsiveDrawer
        open={isProductionOpen}
        onOpenChange={setIsProductionOpen}
        title="In-House Production Order"
        description="Convert material & component stock into finished goods. Automatically calculates inventory cost basis from component Rolling WAC."
      >
        <form onSubmit={handleExecuteProduction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Target Finished Product *
            </label>
            <select
              value={productionTarget?.id || ""}
              onChange={(e) => {
                const selected = products.find((p) => p.id === e.target.value);
                setProductionTarget(selected || null);
              }}
              required
              className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 font-semibold"
            >
              <option value="">-- Select Finished Product to Manufacture --</option>
              {products
                .filter((p) => p.type === "FINISHED_PRODUCT" || p.type === "PHYSICAL_PRODUCT")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || "No SKU"}) • Available: {p.stockQuantity} units
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Quantity to Produce (Units) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={productionQty}
                onChange={(e) => setProductionQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Direct Production Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productionDirectCost}
                onChange={(e) => setProductionDirectCost(e.target.value)}
                placeholder="0.00 (labour / machining / 3D print time)"
                className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Component Consumption List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider">
                Materials & Components Consumed *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddProductionComponent}
                className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Component
              </Button>
            </div>

            {productionComponents.map((comp, idx) => {
              const prod = products.find((p) => p.id === comp.productId);
              const wac = prod?.rollingWACRupees || 0;
              const lineCost = (Number(comp.quantity) || 0) * wac;
              const hasInsufficientStock = (prod?.stockQuantity || 0) < (Number(comp.quantity) || 0);

              return (
                <div
                  key={idx}
                  className="p-3 bg-gray-50 border border-border rounded-xl space-y-2 text-xs"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-6">
                      <select
                        value={comp.productId}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setProductionComponents((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, productId: newId } : item))
                          );
                        }}
                        className="w-full h-9 px-2 text-xs bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {products
                          .filter((p) => p.type === "COMPONENT" || p.type === "RAW_MATERIAL" || p.type === "CONSUMABLE")
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku || "No SKU"}) • In Stock: {p.stockQuantity} • WAC: ₹{(p.rollingWACRupees || 0).toFixed(2)}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="col-span-5 sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        required
                        value={comp.quantity}
                        onChange={(e) => {
                          const newQty = Math.max(1, parseInt(e.target.value) || 1);
                          setProductionComponents((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, quantity: newQty } : item))
                          );
                        }}
                        placeholder="Qty"
                        className="w-full h-9 px-2 text-xs bg-white border border-border rounded-md text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3 text-right">
                      <span className="text-ink-secondary block text-[10px]">Cost (WAC × Qty)</span>
                      <span className="font-semibold text-ink-primary">
                        ₹{lineCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProductionComponent(idx)}
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {hasInsufficientStock && (
                    <div className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>
                        Insufficient stock! Available: {prod?.stockQuantity || 0}, required: {comp.quantity}. Production will fail.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real-Time Cost Summary Box */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-indigo-900">
              <span>Material Consumption Cost:</span>
              <span className="font-semibold">₹{estimatedMaterialCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-indigo-900">
              <span>Direct Production Cost:</span>
              <span className="font-semibold">₹{estimatedDirectCost.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-indigo-200 flex justify-between font-bold text-sm text-indigo-950">
              <span>Total Production Cost:</span>
              <span>₹{estimatedTotalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-indigo-800 text-[11px] italic">
              <span>Finished Product Unit Inventory Cost:</span>
              <span className="font-semibold">₹{estimatedUnitCost.toFixed(2)} / unit</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Production Notes / Batch Reference
            </label>
            <input
              type="text"
              value={productionNotes}
              onChange={(e) => setProductionNotes(e.target.value)}
              placeholder="e.g. Batch 1 - Line Follower 5.0 Assembly"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProductionOpen(false)}
              className="h-11 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={productionSubmitting}
              className="h-11 px-6 text-xs font-semibold shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {productionSubmitting ? "Manufacturing..." : "Complete Production"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 8. Production Batches History Drawer */}
      <ResponsiveDrawer
        open={isProductionBatchesOpen}
        onOpenChange={setIsProductionBatchesOpen}
        title="In-House Production Batches"
        description="Immutable record of manufactured products, consumed materials, and audited reversals."
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProductionBatches}
              disabled={batchesLoading}
              className="h-8 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${batchesLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {batchesLoading ? (
            <div className="text-center py-8 text-xs text-ink-secondary">Loading batches...</div>
          ) : productionBatches.length === 0 ? (
            <div className="text-center py-8 text-xs text-ink-secondary">No production batches executed yet.</div>
          ) : (
            <div className="space-y-3">
              {productionBatches.map((batch) => (
                <div
                  key={batch.id}
                  className={`p-3.5 border rounded-xl space-y-2 text-xs ${
                    batch.status === "CANCELLED" ? "bg-red-50/50 border-red-200" : "bg-white border-border"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-ink-primary font-mono">{batch.productionNo}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            batch.status === "COMPLETED"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {batch.status}
                        </span>
                      </div>
                      <div className="text-ink-secondary text-[11px] mt-0.5">
                        Product: <b>{batch.finishedProduct?.name || "Unknown"}</b> • Date: {new Date(batch.productionDate).toLocaleDateString("en-IN")}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sm text-indigo-700 block">
                        +{batch.quantityProduced} units
                      </span>
                      <span className="text-[11px] text-ink-secondary">
                        Cost: ₹{batch.totalProductionCostRupees.toFixed(2)} (₹{batch.unitProductionCostRupees.toFixed(2)}/unit)
                      </span>
                    </div>
                  </div>

                  {/* Consumed Ingredients */}
                  <div className="pt-2 border-t border-border/70 text-[11px] space-y-1">
                    <span className="font-semibold text-ink-primary block">Consumed Components:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {batch.items.map((it) => (
                        <span
                          key={it.id}
                          className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 text-ink-secondary"
                        >
                          {it.quantityConsumed} × {it.inputProduct?.name || "Item"} (₹{it.totalCostRupees.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>

                  {batch.status === "COMPLETED" && (
                    <div className="pt-2 border-t border-border flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancellingBatch(batch)}
                        className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Cancel & Reverse Stock
                      </Button>
                    </div>
                  )}

                  {batch.status === "CANCELLED" && (
                    <div className="pt-2 border-t border-red-200 text-[11px] text-red-700">
                      Cancelled on {batch.cancelledAt ? new Date(batch.cancelledAt).toLocaleDateString("en-IN") : ""}: {batch.cancelReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ResponsiveDrawer>

      {/* 9. Production Cancellation Reason Modal */}
      {cancellingBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-border">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-ink-primary">Cancel Production Order</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Cancelling <b>{cancellingBatch.productionNo}</b> will atomically reverse finished-product stock (-{cancellingBatch.quantityProduced} units) and restore all consumed component stocks. Original ledger entries will remain intact.
            </p>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Cancellation Reason *
              </label>
              <input
                type="text"
                required
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g. Wrong component quantities recorded, defective assembly"
                className="w-full h-10 px-3 text-xs bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCancellingBatch(null);
                  setCancelReasonInput("");
                }}
                className="h-9 px-3 text-xs"
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                disabled={isCancelling}
                onClick={handleCancelProductionBatch}
                className="h-9 px-4 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
              >
                {isCancelling ? "Reversing..." : "Confirm Reversal"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Adjust Stock Drawer */}
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
              placeholder="e.g. Annual physical count variance"
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
              {adjusting ? "Updating..." : "Save Adjustment"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 11. Stock History Drawer */}
      <ResponsiveDrawer
        open={!!historyProduct}
        onOpenChange={(open) => {
          if (!open) setHistoryProduct(null);
        }}
        title={`Stock History: ${historyProduct?.name || ""}`}
        description={`Immutable stock ledger for SKU: ${historyProduct?.sku || ""}`}
      >
        <div className="space-y-4">
          {historyLoading ? (
            <div className="text-center py-8 text-xs text-ink-secondary">Loading history...</div>
          ) : historyEntries.length === 0 ? (
            <div className="text-center py-8 text-xs text-ink-secondary">No stock ledger entries found.</div>
          ) : (
            <div className="space-y-3">
              {historyEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-gray-50 border border-border rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-ink-primary">{entry.type}</span>
                      <span className="text-[10px] text-ink-secondary px-1.5 py-0.2 bg-gray-200 rounded">
                        {entry.referenceType || "MANUAL"}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-secondary mt-0.5">
                      {entry.notes || "No notes"}
                    </div>
                    <div className="text-[10px] text-ink-secondary mt-0.5">
                      {new Date(entry.createdAt).toLocaleString("en-IN")}
                      {entry.createdBy ? ` • by ${entry.createdBy.name}` : ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-sm ${
                        entry.quantitySigned > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {entry.quantitySigned > 0 ? `+${entry.quantitySigned}` : entry.quantitySigned} units
                    </span>
                    {entry.unitCost && (
                      <span className="block text-[10px] text-ink-secondary font-mono">
                        @ ₹{(entry.unitCost / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ResponsiveDrawer>

      {/* 12. Edit Product Drawer */}
      <ResponsiveDrawer
        open={!!editingProduct}
        onOpenChange={(open) => {
          if (!open) setEditingProduct(null);
        }}
        title={`Edit Item: ${editingProduct?.name || ""}`}
        description={`Modify specifications and commercial details for ${editingProduct?.sku || ""}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Item Name *
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
                Classification *
              </label>
              <select
                value={editFormData.type}
                onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="FINISHED_PRODUCT">Finished Product</option>
                <option value="COMPONENT">Component</option>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>

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
          </div>

          <div className="p-3 bg-gray-50 border border-border rounded-lg flex items-start gap-2.5">
            <input
              type="checkbox"
              id="editIsSaleableCheckbox"
              checked={editFormData.isSaleable}
              onChange={(e) => setEditFormData({ ...editFormData, isSaleable: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <label htmlFor="editIsSaleableCheckbox" className="text-xs text-ink-primary cursor-pointer">
              <span className="font-semibold block">Saleable Directly on Invoices / Quotations</span>
              <span className="text-ink-secondary text-[11px]">
                When checked, this item appears in customer invoice line item selectors.
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Base Selling Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editFormData.basePrice}
                onChange={(e) => setEditFormData({ ...editFormData, basePrice: e.target.value })}
                placeholder="0.00"
                className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Min Stock Alert Threshold
              </label>
              <input
                type="number"
                min="0"
                value={editFormData.minStock}
                onChange={(e) => setEditFormData({ ...editFormData, minStock: e.target.value })}
                className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
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
              className="h-11 px-6 text-xs font-semibold shadow-sm bg-brand hover:bg-brand-600 text-white"
            >
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 13. Inbound Sourcing Drawer */}
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
                <option value="IN_HOUSE">In-House Sourcing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
                Vendor / Supplier Name
              </label>
              <input
                type="text"
                placeholder="e.g. Robu.in, Quartz Components, Local Hardware"
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
          </div>

          {parseFloat(sourcingData.initialPaidAmount) > 0 && (
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

      {/* 14. Archive Product Confirmation Dialog */}
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
