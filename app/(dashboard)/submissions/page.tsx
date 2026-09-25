"use client";

import React, { useState, useEffect } from "react";
import { 
  Inbox, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Users, 
  Briefcase, 
  GraduationCap, 
  ExternalLink,
  ChevronRight,
  Download,
  Building,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  Send,
  X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InboundSubmission {
  id: string;
  submissionNo: string;
  type: "RFQ" | "CONTACT" | "CAREER" | "CLUB_REGISTRATION";
  status: string;
  source: string;
  name: string;
  mobile: string | null;
  email: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  subject: string | null;
  message: string | null;
  payload: any;
  attachmentMetadata: any;
  clientId: string | null;
  client?: { id: string; clientCode: string; name: string } | null;
  sheetSyncStatus: "PENDING" | "SYNCED" | "FAILED" | "SKIPPED";
  sheetSyncedAt: string | null;
  sheetSyncError: string | null;
  customerEmailStatus: "PENDING" | "SYNCED" | "FAILED" | "SKIPPED";
  customerEmailSentAt: string | null;
  customerEmailError: string | null;
  adminEmailStatus: "PENDING" | "SYNCED" | "FAILED" | "SKIPPED";
  adminEmailSentAt: string | null;
  adminEmailError: string | null;
  createdAt: string;
  events?: Array<{ id: string; eventType: string; status: string; error: string | null; retryCount: number; updatedAt: string }>;
  auditLogs?: Array<{ id: string; action: string; actorType: string; performedByName: string | null; createdAt: string; details: any }>;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  RFQ: ["NEW", "IN_PROGRESS", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED", "REJECTED"],
  CONTACT: ["NEW", "IN_PROGRESS", "CONTACTED", "CONVERTED", "CLOSED", "SPAM"],
  CAREER: ["NEW", "UNDER_REVIEW", "SHORTLISTED", "CONTACTED", "CLOSED", "REJECTED"],
  CLUB_REGISTRATION: ["NEW", "VERIFIED", "CONTACTED", "REGISTERED", "CLOSED"],
};

export default function SubmissionsPage() {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [submissions, setSubmissions] = useState<InboundSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [syncFilter, setSyncFilter] = useState("ALL");
  const [selectedSubmission, setSelectedSubmission] = useState<InboundSubmission | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({
    TOTAL: 0,
    RFQ: 0,
    CONTACT: 0,
    CAREER: 0,
    CLUB_REGISTRATION: 0,
    FAILED_EMAILS: 0,
  });

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("type", activeTab);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (syncFilter !== "ALL") params.set("emailStatus", syncFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("limit", "50");

      const res = await fetch(`/api/submissions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data || []);
        if (data.summaryCounts) {
          setCounts(data.summaryCounts);
        }
      } else {
        toast.error(data.error || "Failed to load submissions");
      }
    } catch (err: any) {
      toast.error("Network error loading submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [activeTab, statusFilter, syncFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubmissions();
  };

  const openDetail = async (sub: InboundSubmission) => {
    setSelectedSubmission(sub);
    try {
      const res = await fetch(`/api/submissions/${sub.id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedSubmission(json.data);
      }
    } catch (e) {
      console.error("Error loading detail:", e);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!selectedSubmission) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status updated to ${newStatus}`);
        setSelectedSubmission((prev) => (prev ? { ...prev, status: newStatus } : null));
        fetchSubmissions();
      } else {
        toast.error(data.error || "Could not update status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const convertToCustomer = async (createQuotation = false) => {
    if (!selectedSubmission) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createQuotation }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Conversion completed successfully!");
        openDetail(selectedSubmission);
        fetchSubmissions();
      } else {
        toast.error(data.error || "Conversion failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Conversion error");
    } finally {
      setActionLoading(false);
    }
  };

  const retrySync = async (eventType?: string) => {
    if (!selectedSubmission) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}/retry-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Retry processed successfully");
      } else {
        toast.error(data.error || data.message || "Retry failed");
      }
      await openDetail(selectedSubmission);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Retry error");
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "RFQ":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">RFQ</span>;
      case "CONTACT":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">Contact</span>;
      case "CAREER":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">Career</span>;
      case "CLUB_REGISTRATION":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">Club</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">New</span>;
      case "IN_PROGRESS":
      case "UNDER_REVIEW":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">{status}</span>;
      case "QUALIFIED":
      case "SHORTLISTED":
      case "VERIFIED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">{status}</span>;
      case "CONVERTED":
      case "REGISTERED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">{status}</span>;
      case "CLOSED":
      case "REJECTED":
      case "SPAM":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">{status}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getSyncIndicator = (status: string, label: string) => {
    if (status === "SYNCED") {
      return <span title={`${label}: Synced`} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> {label}</span>;
    }
    if (status === "FAILED") {
      return <span title={`${label}: Failed`} className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"><AlertCircle className="w-3 h-3" /> {label}</span>;
    }
    return <span title={`${label}: Pending`} className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"><Clock className="w-3 h-3" /> {label}</span>;
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-brand" />
            Website Inbound Submissions
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Authoritative intake for RFQ requests, inquiries, career applications, and club registrations.
          </p>
        </div>
        <button
          onClick={fetchSubmissions}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none transition-colors min-h-[40px] w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{counts.TOTAL || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">RFQs</span>
          <p className="text-2xl font-bold text-blue-900 mt-1">{counts.RFQ || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Contacts</span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{counts.CONTACT || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Careers</span>
          <p className="text-2xl font-bold text-purple-900 mt-1">{counts.CAREER || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Club Signups</span>
          <p className="text-2xl font-bold text-amber-900 mt-1">{counts.CLUB_REGISTRATION || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Sync Alerts</span>
          <p className="text-2xl font-bold text-rose-900 mt-1">{counts.FAILED_EMAILS || 0}</p>
        </div>
      </div>

      {/* Filter and Tab Navigation Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50/50 px-3">
          {[
            { id: "ALL", label: "All Submissions" },
            { id: "RFQ", label: "RFQs", count: counts.RFQ },
            { id: "CONTACT", label: "Contacts", count: counts.CONTACT },
            { id: "CAREER", label: "Careers", count: counts.CAREER },
            { id: "CLUB_REGISTRATION", label: "Club Signups", count: counts.CLUB_REGISTRATION },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-brand text-brand bg-white"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-3 bg-white">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search ref, name, mobile, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONVERTED">Converted</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="ALL">All Email Status</option>
              <option value="SYNCED">Email Sent</option>
              <option value="PENDING">Email Pending</option>
              <option value="FAILED">Email Failed</option>
            </select>
          </div>
        </div>

        {/* Mobile View (< 768px): Touch-Friendly Submission Cards */}
        <div className="md:hidden divide-y divide-gray-100 p-3 space-y-3">
          {submissions.map((sub) => {
            const payload = (sub.payload as any) || {};
            let domainSummary = sub.subject || payload.position || payload.institution || sub.message || "";
            if (domainSummary.length > 60) domainSummary = domainSummary.substring(0, 60) + "...";

            return (
              <div
                key={sub.id}
                onClick={() => openDetail(sub)}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-2.5 active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-gray-900 block">{sub.submissionNo}</span>
                    <h4 className="font-semibold text-gray-900 text-sm mt-0.5">{sub.name}</h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getTypeBadge(sub.type)}
                    {getStatusBadge(sub.status)}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {sub.mobile || sub.email || "No contact details"}
                  {sub.company && ` • ${sub.company}`}
                </div>

                {domainSummary && (
                  <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed">
                    {domainSummary}
                  </p>
                )}

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>{format(new Date(sub.createdAt), "dd MMM yyyy, HH:mm")}</span>
                  <span className="text-brand font-semibold inline-flex items-center gap-1">
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
          {submissions.length === 0 && !loading && (
            <div className="py-12 text-center text-gray-500 text-xs">
              No submissions found matching criteria.
            </div>
          )}
        </div>

        {/* Desktop View (>= 768px): Submissions Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 border-y border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Domain Focus</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sync State</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand" />
                    Loading authoritative submissions...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    No submissions found matching criteria.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const payload = (sub.payload as any) || {};
                  let domainSummary = sub.subject || payload.position || payload.institution || sub.message || "";
                  if (domainSummary.length > 40) domainSummary = domainSummary.substring(0, 40) + "...";

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => openDetail(sub)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 text-xs">
                        {sub.submissionNo}
                      </td>
                      <td className="py-3 px-4">{getTypeBadge(sub.type)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{sub.name}</div>
                        <div className="text-xs text-gray-500">
                          {sub.mobile || sub.email || "No contact info"}
                          {sub.company && ` • ${sub.company}`}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate">
                        {domainSummary || "—"}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getSyncIndicator(sub.adminEmailStatus, "Admin Alert")}
                          {sub.email && getSyncIndicator(sub.customerEmailStatus, "Customer Email")}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {format(new Date(sub.createdAt), "dd MMM yyyy, HH:mm")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-brand hover:text-brand-dark inline-flex items-center gap-1 font-medium text-xs">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide-Over / Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50/70 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {getTypeBadge(selectedSubmission.type)}
                  <span className="font-mono font-bold text-lg text-gray-900">
                    {selectedSubmission.submissionNo}
                  </span>
                  {getStatusBadge(selectedSubmission.status)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Submitted via {selectedSubmission.source} on{" "}
                  {format(new Date(selectedSubmission.createdAt), "PPPP 'at' p")}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Lifecycle State Transition Selector */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Lifecycle Status Transition ({selectedSubmission.type})
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedSubmission.status}
                    disabled={actionLoading}
                    onChange={(e) => updateStatus(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-brand/20 w-full"
                  >
                    {(VALID_TRANSITIONS[selectedSubmission.type] || []).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conversion Actions for RFQ & Contacts */}
              {(selectedSubmission.type === "RFQ" || selectedSubmission.type === "CONTACT") && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-700" />
                    ERP Customer Conversion
                  </h4>
                  <p className="text-xs text-blue-700 mt-1 mb-3">
                    {selectedSubmission.client
                      ? `Linked to Customer ${selectedSubmission.client.clientCode} (${selectedSubmission.client.name})`
                      : "Convert this verified submission into an active Customer record in the ERP ledger."}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {!selectedSubmission.clientId && (
                      <button
                        onClick={() => convertToCustomer(false)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                      >
                        Convert to Customer
                      </button>
                    )}
                    {selectedSubmission.type === "RFQ" && (
                      <button
                        onClick={() => convertToCustomer(true)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Convert & Create Quotation
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Contact Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2.5 text-gray-700">
                    <Users className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-semibold text-gray-900">{selectedSubmission.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{selectedSubmission.mobile || "No phone provided"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{selectedSubmission.email || "No email provided"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-700">
                    <Building className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{selectedSubmission.company || "Individual / None"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-700 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>
                      {[selectedSubmission.city, selectedSubmission.state, selectedSubmission.country]
                        .filter(Boolean)
                        .join(", ") || "Location not specified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Domain Specific Data */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  {selectedSubmission.type} Specifications
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-3">
                  {selectedSubmission.subject && (
                    <div>
                      <span className="text-xs font-semibold text-gray-500 block">Subject</span>
                      <p className="font-medium text-gray-900 mt-0.5">{selectedSubmission.subject}</p>
                    </div>
                  )}

                  {selectedSubmission.message && (
                    <div>
                      <span className="text-xs font-semibold text-gray-500 block">Message</span>
                      <p className="text-gray-700 whitespace-pre-wrap mt-0.5 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {selectedSubmission.message}
                      </p>
                    </div>
                  )}

                  {/* Domain JSON Fields */}
                  {selectedSubmission.payload && (
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      {Object.entries(selectedSubmission.payload)
                        .filter(([k]) => !["name", "email", "mobile", "subject", "message"].includes(k))
                        .map(([key, val]) => (
                          <div key={key} className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                            <span className="text-xs font-medium text-gray-900 text-right max-w-xs">
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Career Attachment */}
                  {selectedSubmission.attachmentMetadata && (
                    <div className="pt-3 border-t border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 block mb-1.5">Candidate Resume</span>
                      <a
                        href={`/api/submissions/${selectedSubmission.id}/attachment/${selectedSubmission.attachmentMetadata.storageKey}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors"
                      >
                        <Download className="w-4 h-4 text-brand" />
                        Download {selectedSubmission.attachmentMetadata.fileName || "Resume"}
                        <span className="text-gray-400">
                          ({Math.round((selectedSubmission.attachmentMetadata.size || 0) / 1024)} KB)
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Notification & Email Delivery Status */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Email Notification & Delivery Status
                </h3>
                <div className="space-y-2.5">
                  {/* Customer Confirmation Email */}
                  <div className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Send className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-semibold text-gray-900 text-xs">Customer Thank-You Email</div>
                        <div className="text-[11px] text-gray-500">
                          Status: {selectedSubmission.customerEmailStatus}
                          {selectedSubmission.customerEmailSentAt && ` • ${format(new Date(selectedSubmission.customerEmailSentAt), "p")}`}
                          {selectedSubmission.customerEmailError && ` • Error: ${selectedSubmission.customerEmailError}`}
                        </div>
                      </div>
                    </div>
                    {selectedSubmission.customerEmailStatus !== "SYNCED" && selectedSubmission.email && (
                      <button
                        onClick={() => retrySync("CUSTOMER_EMAIL")}
                        disabled={actionLoading}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      >
                        Retry Email
                      </button>
                    )}
                  </div>

                  {/* Admin Notification Email */}
                  <div className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="font-semibold text-gray-900 text-xs">Admin Notification Email</div>
                        <div className="text-[11px] text-gray-500">
                          Status: {selectedSubmission.adminEmailStatus}
                          {selectedSubmission.adminEmailSentAt && ` • ${format(new Date(selectedSubmission.adminEmailSentAt), "p")}`}
                          {selectedSubmission.adminEmailError && ` • Error: ${selectedSubmission.adminEmailError}`}
                        </div>
                      </div>
                    </div>
                    {selectedSubmission.adminEmailStatus !== "SYNCED" && (
                      <button
                        onClick={() => retrySync("ADMIN_EMAIL")}
                        disabled={actionLoading}
                        className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                      >
                        Retry Alert
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Trail Timeline */}
              {selectedSubmission.auditLogs && selectedSubmission.auditLogs.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    Audit Trail & History
                  </h3>
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                    {selectedSubmission.auditLogs.map((log) => (
                      <div key={log.id} className="p-3 text-xs flex items-start justify-between">
                        <div>
                          <span className="font-semibold text-gray-800">{log.action}</span>
                          <span className="text-gray-400 mx-1.5">&bull;</span>
                          <span className="text-gray-600">{log.performedByName || log.actorType}</span>
                        </div>
                        <span className="text-gray-400 whitespace-nowrap">
                          {format(new Date(log.createdAt), "dd MMM, HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
