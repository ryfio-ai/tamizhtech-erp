"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Clock,
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

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    legalName: "",
    displayName: "",
    contactPerson: "",
    phone: "",
    email: "",
    GSTIN: "",
    PAN: "",
    billingAddress: "",
    state: "Tamil Nadu",
    country: "India",
    paymentTerms: "Net 30",
    bankDetailsReference: "",
    notes: "",
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data || []);
      } else {
        toast.error(data.error || "Failed to load suppliers");
      }
    } catch {
      toast.error("Network error loading suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [statusFilter]);

  // Check duplicate on blur
  const handleDuplicateCheck = async () => {
    if (!formData.legalName && !formData.GSTIN && !formData.phone) return;
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkDuplicatesOnly: true,
          legalName: formData.legalName,
          GSTIN: formData.GSTIN,
          phone: formData.phone,
          email: formData.email,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.isDuplicate) {
        setDuplicateWarning(
          `Notice: Potential duplicate supplier found (${data.data.duplicates.length} match: ${data.data.duplicates.map((d: any) => d.name).join(", ")}).`
        );
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Ignore background check failure
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legalName.trim()) {
      toast.error("Legal name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Supplier ${data.data.supplierCode} created successfully!`);
        setModalOpen(false);
        setFormData({
          legalName: "",
          displayName: "",
          contactPerson: "",
          phone: "",
          email: "",
          GSTIN: "",
          PAN: "",
          billingAddress: "",
          state: "Tamil Nadu",
          country: "India",
          paymentTerms: "Net 30",
          bankDetailsReference: "",
          notes: "",
        });
        setDuplicateWarning(null);
        fetchSuppliers();
      } else {
        toast.error(data.error || "Failed to create supplier");
      }
    } catch {
      toast.error("Error creating supplier");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = suppliers.filter((s) => s.status === "ACTIVE").length;
  const inactiveCount = suppliers.filter((s) => s.status === "INACTIVE").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
                Supplier Directory
              </h1>
              <p className="text-sm text-ink-muted">
                Manage component vendors, PCB fabricators, hardware suppliers & terms
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuppliers}
            disabled={loading}
            className="h-10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="h-10 bg-brand hover:bg-brand-dark text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-ink-muted">Total Suppliers</div>
            <div className="text-2xl font-bold text-ink-primary mt-1">{suppliers.length}</div>
          </div>
          <Building2 className="w-8 h-8 text-brand/20" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-ink-muted">Active Vendors</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600/20" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <div className="text-xs font-medium text-ink-muted">Inactive / Blocked</div>
            <div className="text-2xl font-bold text-ink-muted mt-1">{inactiveCount}</div>
          </div>
          <Clock className="w-8 h-8 text-ink-muted/20" />
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSuppliers()}
            placeholder="Search code, name, phone, GSTIN..."
            className="pl-9 h-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "ACTIVE", "INACTIVE", "BLOCKED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-brand text-white"
                  : "bg-ink-faint/30 text-ink-muted hover:bg-ink-faint"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier List */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-border text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-brand mx-auto mb-3" />
          <p className="text-sm text-ink-muted">Loading authoritative supplier records...</p>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-border text-center max-w-lg mx-auto">
          <Building2 className="w-12 h-12 text-ink-muted/40 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-ink-primary mb-1">No suppliers yet.</h3>
          <p className="text-sm text-ink-muted mb-6">
            Add a supplier when your first procurement partner is ready.
          </p>
          <Button onClick={() => setModalOpen(true)} className="bg-brand text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add First Supplier
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-faint/40 border-b border-border text-xs font-semibold text-ink-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Supplier Code & Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-ink-faint/20 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="font-semibold text-brand hover:underline block"
                      >
                        {s.legalName}
                      </Link>
                      <span className="text-xs font-mono text-ink-muted">{s.supplierCode}</span>
                    </td>
                    <td className="py-3 px-4 text-ink-primary">
                      {s.contactPerson || "—"}
                    </td>
                    <td className="py-3 px-4 text-ink-muted text-xs">
                      {s.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {s.phone}
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {s.email}
                        </div>
                      )}
                      {!s.phone && !s.email && "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-ink-muted">
                      {s.GSTIN || "—"}
                    </td>
                    <td className="py-3 px-4 text-ink-muted text-xs">
                      {s.paymentTerms || "Net 30"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : s.status === "BLOCKED"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="inline-flex items-center text-xs text-brand font-medium hover:underline"
                      >
                        View Profile <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {suppliers.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/suppliers/${s.id}`)}
                className="bg-white p-4 rounded-xl border border-border shadow-sm active:bg-ink-faint/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-ink-primary text-base">{s.legalName}</h3>
                    <p className="text-xs font-mono text-brand font-medium">{s.supplierCode}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      s.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-ink-muted mt-2 border-t border-border pt-2">
                  {s.contactPerson && (
                    <div>
                      <span className="font-medium text-ink-primary">Contact:</span> {s.contactPerson}
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {s.phone}
                    </div>
                  )}
                  {s.GSTIN && <div><span className="font-medium">GSTIN:</span> {s.GSTIN}</div>}
                  <div><span className="font-medium">Terms:</span> {s.paymentTerms || "Net 30"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Supplier Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Create an authoritative vendor record with atomic numbering (TTRC-SUP-YYYY-XXXX).
            </DialogDescription>
          </DialogHeader>

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Legal Business Name *
                </label>
                <Input
                  required
                  placeholder="e.g. RoboTech Components Pvt Ltd"
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  onBlur={handleDuplicateCheck}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Display / Trade Name
                </label>
                <Input
                  placeholder="e.g. RoboTech"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Contact Person
                </label>
                <Input
                  placeholder="e.g. Anand Kumar"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Phone Number
                </label>
                <Input
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onBlur={handleDuplicateCheck}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="e.g. sales@robotech.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={handleDuplicateCheck}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  GSTIN
                </label>
                <Input
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={formData.GSTIN}
                  onChange={(e) => setFormData({ ...formData, GSTIN: e.target.value.toUpperCase() })}
                  onBlur={handleDuplicateCheck}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  PAN
                </label>
                <Input
                  placeholder="e.g. AAAAA0000A"
                  value={formData.PAN}
                  onChange={(e) => setFormData({ ...formData, PAN: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Payment Terms
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input text-sm bg-white"
                >
                  <option value="Immediate">Immediate / Advance</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  State
                </label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street, Industrial Estate, City, PIN"
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="w-full p-2.5 rounded-md border border-input text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink-primary block mb-1">
                  Bank Reference / Beneficiary Identifier
                </label>
                <Input
                  placeholder="e.g. HDFC Current A/C #5020... / IFSC HDFC0001234"
                  value={formData.bankDetailsReference}
                  onChange={(e) => setFormData({ ...formData, bankDetailsReference: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-brand text-white">
                {saving ? "Saving Supplier..." : "Create Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
