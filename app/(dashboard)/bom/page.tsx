"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Layers,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Archive,
  Eye,
  X,
  ArrowRight,
  ShieldAlert,
  Coins,
  Cpu,
} from "lucide-react";
import { fromPaise } from "@/lib/money";

export default function BOMPage() {
  const [boms, setBoms] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    parentProductId: "",
    notes: "",
    status: "ACTIVE",
    items: [
      {
        componentProductId: "",
        quantity: 1,
        unit: "pcs",
        notes: "",
      },
    ],
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Build / Assemble Modal
  const [selectedBomForBuild, setSelectedBomForBuild] = useState<any | null>(null);
  const [buildQuantity, setBuildQuantity] = useState<number>(1);
  const [directCost, setDirectCost] = useState<number>(0);
  const [buildNotes, setBuildNotes] = useState<string>("");
  const [requirements, setRequirements] = useState<any | null>(null);
  const [calculatingReqs, setCalculatingReqs] = useState<boolean>(false);
  const [isAssembling, setIsAssembling] = useState<boolean>(false);
  const [assemblyResult, setAssemblyResult] = useState<any | null>(null);
  const [assemblyError, setAssemblyError] = useState<string | null>(null);

  // View Components Modal
  const [viewBomDetail, setViewBomDetail] = useState<any | null>(null);

  useEffect(() => {
    fetchBOMs();
    fetchProducts();
  }, []);

  const fetchBOMs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bom");
      const json = await res.json();
      if (json.success) {
        setBoms(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load BOMs:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=300");
      const json = await res.json();
      setProducts(json.products || json.data || []);
    } catch (e) {
      console.error("Failed to load products:", e);
    }
  };

  // Re-calculate requirements when target build quantity or selected BOM changes
  useEffect(() => {
    if (!selectedBomForBuild) {
      setRequirements(null);
      return;
    }
    const timer = setTimeout(() => {
      calculateRequirements(selectedBomForBuild.id, buildQuantity);
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedBomForBuild, buildQuantity]);

  const calculateRequirements = async (bomId: string, qty: number) => {
    if (qty <= 0) return;
    setCalculatingReqs(true);
    try {
      const res = await fetch(`/api/bom/${bomId}/requirements?quantity=${qty}`);
      const json = await res.json();
      if (json.success) {
        setRequirements(json.data);
      }
    } catch (e) {
      console.error("Failed to calculate requirements:", e);
    } finally {
      setCalculatingReqs(false);
    }
  };

  const handleOpenBuildModal = async (bom: any) => {
    setSelectedBomForBuild(bom);
    setBuildQuantity(1);
    setDirectCost(0);
    setBuildNotes("");
    setAssemblyResult(null);
    setAssemblyError(null);
  };

  const handleExecuteAssembly = async () => {
    if (!selectedBomForBuild || !requirements?.canBuild) return;

    setIsAssembling(true);
    setAssemblyError(null);
    try {
      const res = await fetch(`/api/bom/${selectedBomForBuild.id}/assemble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildQuantity,
          directCost,
          notes: buildNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to execute assembly");
      }
      setAssemblyResult(data.data);
      fetchBOMs();
      fetchProducts();
    } catch (err: any) {
      setAssemblyError(err.message || "Assembly execution failed");
    } finally {
      setIsAssembling(false);
    }
  };

  const handleActivate = async (bomId: string) => {
    if (!confirm("Activate this BOM? Any other active BOM for this product will be archived.")) {
      return;
    }
    try {
      const res = await fetch(`/api/bom/${bomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACTIVATE" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to activate BOM");
        return;
      }
      fetchBOMs();
    } catch (e: any) {
      alert(e.message || "Failed to activate BOM");
    }
  };

  const handleArchive = async (bomId: string) => {
    if (!confirm("Archive this BOM version? It will no longer be available for production.")) {
      return;
    }
    try {
      const res = await fetch(`/api/bom/${bomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ARCHIVE" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to archive BOM");
        return;
      }
      fetchBOMs();
    } catch (e: any) {
      alert(e.message || "Failed to archive BOM");
    }
  };

  const handleViewDetails = async (bomId: string) => {
    try {
      const res = await fetch(`/api/bom/${bomId}`);
      const json = await res.json();
      if (json.success) {
        setViewBomDetail(json.data);
      }
    } catch (e) {
      console.error("Failed to load BOM detail:", e);
    }
  };

  // Create Form Helpers
  const addCreateItem = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { componentProductId: "", quantity: 1, unit: "pcs", notes: "" },
      ],
    }));
  };

  const removeCreateItem = (idx: number) => {
    if (createForm.items.length <= 1) return;
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.parentProductId) {
      setCreateError("Please select a parent finished product.");
      return;
    }

    for (let i = 0; i < createForm.items.length; i++) {
      const it = createForm.items[i];
      if (!it.componentProductId) {
        setCreateError(`Component #${i + 1} must be selected.`);
        return;
      }
      if (it.componentProductId === createForm.parentProductId) {
        setCreateError(`Parent product cannot be its own component (Item #${i + 1}).`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setCreateError(`Quantity for item #${i + 1} must be greater than zero.`);
        return;
      }
    }

    // Duplicate component check
    const ids = createForm.items.map((i) => i.componentProductId);
    if (new Set(ids).size !== ids.length) {
      setCreateError("Duplicate components detected. Each component can only appear once in a BOM.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create BOM");
      }
      setShowCreateModal(false);
      fetchBOMs();
      setCreateForm({
        parentProductId: "",
        notes: "",
        status: "ACTIVE",
        items: [{ componentProductId: "", quantity: 1, unit: "pcs", notes: "" }],
      });
    } catch (err: any) {
      setCreateError(err.message || "Failed to create BOM");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredBoms = boms.filter((b) => {
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      b.parentProduct?.name?.toLowerCase().includes(q) ||
      b.parentProduct?.sku?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Robotics BOM & Kit Assembly
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Multi-component Bill of Materials recipes, versioning, circular dependency protection, and atomic kit building.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create BOM
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "ACTIVE", "DRAFT", "ARCHIVED"].map((st) => (
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
            placeholder="Search parent product or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {/* BOM Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading Bill of Materials...</div>
        ) : filteredBoms.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No BOMs configured</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Create a BOM for a real product to begin assembly planning, component shortage checks, and production execution.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create BOM
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3 sm:p-4">Parent Product</th>
                  <th className="p-3 sm:p-4 text-center">Version</th>
                  <th className="p-3 sm:p-4 text-center">Components</th>
                  <th className="p-3 sm:p-4 text-center">Current Stock</th>
                  <th className="p-3 sm:p-4 text-center">Status</th>
                  <th className="p-3 sm:p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBoms.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 sm:p-4">
                      <p className="font-bold text-slate-900">{b.parentProduct?.name || "Unknown Product"}</p>
                      <span className="font-mono text-[11px] text-slate-500">
                        {b.parentProduct?.sku || "No SKU"}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        v{b.version}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-center font-semibold text-slate-700">
                      {b.itemCount} items
                    </td>
                    <td className="p-3 sm:p-4 text-center font-semibold text-slate-900">
                      {b.parentProduct?.stockQuantity ?? 0} units
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      {b.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      ) : b.status === "ARCHIVED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          <Archive className="w-3 h-3" /> ARCHIVED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> DRAFT
                        </span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.status === "ACTIVE" && (
                          <button
                            onClick={() => handleOpenBuildModal(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-colors"
                          >
                            <Wrench className="w-3.5 h-3.5" /> Assemble
                          </button>
                        )}

                        <button
                          onClick={() => handleViewDetails(b.id)}
                          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="View Components"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {b.status === "DRAFT" && (
                          <button
                            onClick={() => handleActivate(b.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200"
                          >
                            Activate
                          </button>
                        )}

                        {b.status === "ACTIVE" && (
                          <button
                            onClick={() => handleArchive(b.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kit Assembly / Production Modal */}
      {selectedBomForBuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                  Robotics Production Run
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Build: {selectedBomForBuild.parentProduct?.name} (BOM v{selectedBomForBuild.version})
                </h3>
              </div>
              <button
                onClick={() => setSelectedBomForBuild(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assemblyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{assemblyError}</span>
              </div>
            )}

            {assemblyResult ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-lg font-bold text-emerald-900">Assembly Completed Successfully!</h4>
                <p className="text-xs text-emerald-800">
                  Production batch <strong>{assemblyResult.productionNo}</strong> created {buildQuantity}{" "}
                  units of {selectedBomForBuild.parentProduct?.name}. Components were consumed atomically at Rolling WAC.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs text-left bg-white p-3 rounded-lg border border-emerald-200">
                  <div>
                    <span className="text-slate-500">Total Material Cost:</span>
                    <p className="font-bold text-slate-900">₹{assemblyResult.materialCostRupees}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Unit Cost:</span>
                    <p className="font-bold text-slate-900">₹{assemblyResult.unitProductionCostRupees}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setSelectedBomForBuild(null)}
                    className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Build Quantity & Cost Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Build Quantity (Units to produce) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={buildQuantity}
                      onChange={(e) => setBuildQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full text-base font-bold text-slate-900 border border-slate-300 rounded-lg p-2.5 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Direct Assembly Cost (₹ Labor / Machining)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={directCost}
                      onChange={(e) => setDirectCost(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0.00"
                      className="w-full text-base font-semibold text-slate-900 border border-slate-300 rounded-lg p-2.5 outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Component Requirements Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Required Components Breakdown
                  </h4>

                  {calculatingReqs ? (
                    <div className="p-6 text-center text-xs text-slate-500">Checking stock levels...</div>
                  ) : !requirements ? (
                    <div className="p-4 text-center text-xs text-slate-400">No components configured for this BOM.</div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Component</th>
                            <th className="p-2.5 text-center">Per Unit</th>
                            <th className="p-2.5 text-center">Required</th>
                            <th className="p-2.5 text-center">Available</th>
                            <th className="p-2.5 text-center">Shortage</th>
                            <th className="p-2.5 text-right">Est. Cost (WAC)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {requirements.components.map((comp: any) => (
                            <tr
                              key={comp.componentProductId}
                              className={comp.shortageQty > 0 ? "bg-rose-50/50" : ""}
                            >
                              <td className="p-2.5">
                                <p className="font-semibold text-slate-900">{comp.productName}</p>
                                {comp.sku && <span className="font-mono text-[10px] text-slate-500">{comp.sku}</span>}
                              </td>
                              <td className="p-2.5 text-center">{comp.requiredPerUnit} {comp.unit}</td>
                              <td className="p-2.5 text-center font-bold text-slate-900">
                                {comp.totalRequiredQty} {comp.unit}
                              </td>
                              <td className="p-2.5 text-center font-semibold text-slate-700">
                                {comp.availableQty} {comp.unit}
                              </td>
                              <td className="p-2.5 text-center">
                                {comp.shortageQty > 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                                    -{comp.shortageQty} {comp.unit}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-semibold">✓ OK</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-900">
                                ₹{fromPaise(comp.totalCostPaise)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Stock Warning Banner */}
                {requirements && !requirements.canBuild && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Insufficient stock</strong>
                      The selected build cannot be completed with current inventory. Shortage in{" "}
                      {requirements.totalShortageCount} required component(s). Please source missing parts first.
                    </div>
                  </div>
                )}

                {/* Ready to Build Banner */}
                {requirements && requirements.canBuild && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>All components in stock. Ready to assemble {buildQuantity} unit(s).</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      Total Est. Material: ₹{fromPaise(requirements.estimatedMaterialCostPaise)}
                    </span>
                  </div>
                )}

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Production Run Notes / Batch Tag
                  </label>
                  <input
                    type="text"
                    value={buildNotes}
                    onChange={(e) => setBuildNotes(e.target.value)}
                    placeholder="e.g. Batch #1 for Alpha Project delivery"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 outline-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedBomForBuild(null)}
                    disabled={isAssembling}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteAssembly}
                    disabled={!requirements?.canBuild || isAssembling}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-40"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    {isAssembling ? "Executing Production..." : "Confirm & Build"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Components Modal */}
      {viewBomDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {viewBomDetail.parentProduct?.name} — BOM v{viewBomDetail.version}
                </h3>
                <span className="text-xs text-slate-500">
                  Status: <strong>{viewBomDetail.status}</strong> • Components: {viewBomDetail.items?.length || 0}
                </span>
              </div>
              <button
                onClick={() => setViewBomDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Component</th>
                    <th className="p-2.5 text-center">Part / SKU</th>
                    <th className="p-2.5 text-center">Qty / Parent Unit</th>
                    <th className="p-2.5 text-center">In Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewBomDetail.items || []).map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-slate-900">{it.productName}</td>
                      <td className="p-2.5 text-center font-mono text-slate-500">{it.sku || "—"}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="p-2.5 text-center font-semibold text-slate-700">
                        {it.availableStock} {it.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewBomDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create BOM Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Bill of Materials</h3>
                <p className="text-xs text-slate-500">
                  Define required components and quantities per unit for robotics products and assemblies.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Parent Product Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Finished Product / Kit <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.parentProductId}
                  onChange={(e) => setCreateForm({ ...createForm, parentProductId: e.target.value })}
                  required
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white outline-none focus:border-slate-900"
                >
                  <option value="">Select Parent Product...</option>
                  {products
                    .filter((p) => p.type !== "SERVICE")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `[${p.sku}]` : ""} ({p.category || "General"})
                      </option>
                    ))}
                </select>
              </div>

              {/* Status and Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white outline-none"
                  >
                    <option value="ACTIVE">ACTIVE (Immediate production ready)</option>
                    <option value="DRAFT">DRAFT (Under engineering review)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Engineering Notes / Version Description
                  </label>
                  <input
                    type="text"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="e.g. Standard line-follower kit revision"
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              {/* Components List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Required Components per 1 Unit
                  </label>
                  <button
                    type="button"
                    onClick={addCreateItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Component
                  </button>
                </div>

                <div className="space-y-2">
                  {createForm.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="col-span-12 sm:col-span-6">
                        <select
                          required
                          value={it.componentProductId}
                          onChange={(e) => {
                            const updated = [...createForm.items];
                            updated[idx].componentProductId = e.target.value;
                            setCreateForm({ ...createForm, items: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 bg-white outline-none"
                        >
                          <option value="">Select Component...</option>
                          {products
                            .filter(
                              (p) =>
                                p.id !== createForm.parentProductId && p.type !== "SERVICE"
                            )
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `[${p.sku}]` : ""}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="col-span-5 sm:col-span-3">
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="any"
                          value={it.quantity}
                          onChange={(e) => {
                            const updated = [...createForm.items];
                            updated[idx].quantity = Number(e.target.value);
                            setCreateForm({ ...createForm, items: updated });
                          }}
                          placeholder="Qty / parent"
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 text-center font-bold"
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-2">
                        <input
                          type="text"
                          value={it.unit}
                          onChange={(e) => {
                            const updated = [...createForm.items];
                            updated[idx].unit = e.target.value;
                            setCreateForm({ ...createForm, items: updated });
                          }}
                          placeholder="Unit (pcs)"
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 text-center"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeCreateItem(idx)}
                          disabled={createForm.items.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isCreating ? "Saving BOM..." : "Save & Activate BOM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
