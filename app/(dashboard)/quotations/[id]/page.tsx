"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileCheck,
  ArrowLeft,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Calendar,
  User,
  Building,
  Phone,
  Mail,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { formatISTDate } from "@/lib/time";
import { BusinessDocumentView } from "@/components/shared/BusinessDocumentView";
import type { BusinessDocumentModel } from "@/types/businessDocument";

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;

  const [quotation, setQuotation] = useState<any>(null);
  const [documentData, setDocumentData] = useState<BusinessDocumentModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`);
      const data = await res.json();
      if (data.success) {
        setQuotation(data.quotation);
        setDocumentData(data.documentData || null);
      } else {
        alert(data.error || "Quotation not found");
      }
    } catch (err) {
      console.error("Error fetching quotation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quotationId) {
      fetchQuotation();
    }
  }, [quotationId]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setQuotation(data.quotation);
        fetchQuotation();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!confirm("Are you sure you want to convert this quotation into an invoice?")) return;

    setConverting(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Converted to Invoice ${data.invoice.invoiceNo}!`);
        router.push(`/invoices/${data.invoice.id}`);
      } else {
        alert(data.error || "Conversion failed");
      }
    } catch (err) {
      console.error("Error converting quotation:", err);
      alert("An unexpected error occurred during conversion.");
    } finally {
      setConverting(false);
    }
  };

  const handleDeleteQuotation = async () => {
    if (!confirm(`Are you sure you want to permanently delete quotation ${quotation.quotationNo} from the ERP? This action cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${quotation.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (data.action === "CANCELLED") {
          alert(data.message);
          fetchQuotation();
        } else {
          alert("Quotation deleted successfully from ERP.");
          router.push("/quotations");
        }
      } else {
        alert(data.error || "Failed to delete quotation");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete quotation");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 max-w-5xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
        Loading quotation details...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-12 text-center text-gray-500 max-w-5xl mx-auto">
        <h2 className="text-lg font-bold text-gray-800">Quotation Not Found</h2>
        <Link href="/quotations" className="text-primary hover:underline mt-2 inline-block">
          &larr; Back to Quotations
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Draft</span>;
      case "SENT":
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Sent to Client</span>;
      case "ACCEPTED":
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Accepted</span>;
      case "REJECTED":
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      case "EXPIRED":
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Expired</span>;
      case "CANCELLED":
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-2 text-gray-500 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy">{quotation.quotationNo}</h1>
              {getStatusBadge(quotation.status)}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Issued on {formatISTDate(quotation.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status buttons */}
          {quotation.status === "DRAFT" && (
            <button
              onClick={() => handleStatusChange("SENT")}
              disabled={updatingStatus}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-medium"
            >
              Mark as Sent
            </button>
          )}

          {quotation.status === "SENT" && (
            <>
              <button
                onClick={() => handleStatusChange("ACCEPTED")}
                disabled={updatingStatus}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-medium"
              >
                Mark Accepted
              </button>
              <button
                onClick={() => handleStatusChange("REJECTED")}
                disabled={updatingStatus}
                className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-medium"
              >
                Mark Rejected
              </button>
            </>
          )}

          {quotation.status !== "CANCELLED" && quotation.status !== "ACCEPTED" && (
            <button
              onClick={() => handleStatusChange("CANCELLED")}
              disabled={updatingStatus}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium"
            >
              Cancel Offer
            </button>
          )}

          {/* Download PDF */}
          <a
            href={`/api/quotations/${quotation.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> A4 PDF
          </a>

          {/* Convert to Invoice */}
          {quotation.status !== "ACCEPTED" && quotation.status !== "CANCELLED" && (
            <button
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              {converting ? "Converting..." : "Convert to Invoice"}
            </button>
          )}

          {/* Delete Quotation */}
          <button
            onClick={handleDeleteQuotation}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            title="Permanently remove or cancel from ERP"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Main Quotation View Paper */}
      <div className="w-full overflow-x-auto pb-4">
        {documentData ? (
          <BusinessDocumentView
            data={documentData}
            showToolbar={false}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-slate-500">
            Loading preview...
          </div>
        )}
      </div>
    </div>
  );
}
