"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Building,
  CreditCard,
  FileText,
  Save,
  CheckCircle,
  AlertCircle,
  Percent,
  Calendar,
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    COMPANY_NAME: "",
    COMPANY_LEGAL_NAME: "",
    COMPANY_TAGLINE: "",
    COMPANY_ADDRESS: "",
    COMPANY_PHONE: "",
    COMPANY_EMAIL: "",
    COMPANY_GSTIN: "",
    COMPANY_PAN: "",
    COMPANY_WEBSITE: "",
    DEFAULT_GST_RATE: 18,
    QUOTATION_VALIDITY_DAYS: 30,
    BANK_NAME: "",
    BANK_ACCOUNT_NAME: "",
    BANK_ACCOUNT_NO: "",
    BANK_IFSC: "",
    BANK_BRANCH: "",
    UPI_ID: "",
    DEFAULT_QUOTATION_TERMS: "",
    DEFAULT_INVOICE_TERMS: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setForm(data.settings);
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("System settings updated successfully!");
        setForm(data.settings);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Failed to update settings");
      }
    } catch (err) {
      console.error("Save error:", err);
      setErrorMsg("An unexpected error occurred while saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Loading system settings...</div>;
  }

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-navy flex items-center gap-2.5">
          <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          System Settings & Business Configuration
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Dynamic configuration for corporate branding, tax rates, bank payment details, and document terms.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Profile */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Building className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-navy">Corporate Profile & Identity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Company Display Name</label>
              <input
                type="text"
                value={form.COMPANY_NAME}
                onChange={(e) => handleChange("COMPANY_NAME", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Company Legal Registered Name</label>
              <input
                type="text"
                value={form.COMPANY_LEGAL_NAME}
                onChange={(e) => handleChange("COMPANY_LEGAL_NAME", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Corporate Tagline / Slogan</label>
              <input
                type="text"
                value={form.COMPANY_TAGLINE}
                onChange={(e) => handleChange("COMPANY_TAGLINE", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Website URL</label>
              <input
                type="text"
                value={form.COMPANY_WEBSITE}
                onChange={(e) => handleChange("COMPANY_WEBSITE", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Registered Corporate Address</label>
              <input
                type="text"
                value={form.COMPANY_ADDRESS}
                onChange={(e) => handleChange("COMPANY_ADDRESS", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Primary Phone</label>
              <input
                type="text"
                value={form.COMPANY_PHONE}
                onChange={(e) => handleChange("COMPANY_PHONE", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Billing / Support Email</label>
              <input
                type="email"
                value={form.COMPANY_EMAIL}
                onChange={(e) => handleChange("COMPANY_EMAIL", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={form.COMPANY_GSTIN}
                onChange={(e) => handleChange("COMPANY_GSTIN", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">PAN</label>
              <input
                type="text"
                value={form.COMPANY_PAN}
                onChange={(e) => handleChange("COMPANY_PAN", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Financial & Tax Defaults */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Percent className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-navy">Tax & Commercial Defaults</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Default GST Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={form.DEFAULT_GST_RATE}
                onChange={(e) => handleChange("DEFAULT_GST_RATE", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-semibold text-navy"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Snapshotted on new quotations and invoices. Changing this will never alter past transactions.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Default Quotation Validity (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={form.QUOTATION_VALIDITY_DAYS}
                onChange={(e) =>
                  handleChange("QUOTATION_VALIDITY_DAYS", parseInt(e.target.value) || 30)
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-semibold text-navy"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Calculates the default &quot;Valid Until&quot; date when creating new quotations.
              </p>
            </div>
          </div>
        </div>

        {/* Banking & Remittance */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-navy">Bank Accounts & Remittance Info</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={form.BANK_NAME}
                onChange={(e) => handleChange("BANK_NAME", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                value={form.BANK_ACCOUNT_NAME}
                onChange={(e) => handleChange("BANK_ACCOUNT_NAME", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={form.BANK_ACCOUNT_NO}
                onChange={(e) => handleChange("BANK_ACCOUNT_NO", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={form.BANK_IFSC}
                onChange={(e) => handleChange("BANK_IFSC", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Bank Branch</label>
              <input
                type="text"
                value={form.BANK_BRANCH}
                onChange={(e) => handleChange("BANK_BRANCH", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Corporate UPI ID</label>
              <input
                type="text"
                value={form.UPI_ID}
                onChange={(e) => handleChange("UPI_ID", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Standard Terms & Conditions */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-navy">Standard Document Terms</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Default Quotation Terms & Conditions
              </label>
              <textarea
                rows={5}
                value={form.DEFAULT_QUOTATION_TERMS}
                onChange={(e) => handleChange("DEFAULT_QUOTATION_TERMS", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-gray-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Default Invoice Terms & Conditions
              </label>
              <textarea
                rows={5}
                value={form.DEFAULT_INVOICE_TERMS}
                onChange={(e) => handleChange("DEFAULT_INVOICE_TERMS", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Settings..." : "Save System Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
