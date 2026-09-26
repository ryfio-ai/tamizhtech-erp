"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RefreshCw,
  ExternalLink,
  Plus,
  GraduationCap,
  Calendar,
  UserCheck,
  Building,
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
import { getCertificateVerificationUrl } from "@/lib/certificateUrl";

export default function CertificatesPage() {
  const [activeTab, setActiveTab] = useState<"certificates" | "eligible">("certificates");

  // Certificate list state
  const [certificates, setCertificates] = useState<any[]>([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [certSearch, setCertSearch] = useState("");

  // Eligible students state
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleSearch, setEligibleSearch] = useState("");

  // Issuance modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [issueCompletionDate, setIssueCompletionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [issueDuration, setIssueDuration] = useState("");
  const [issueTrainer, setIssueTrainer] = useState("Tamizh Tech Lead Instructor");
  const [issueNotes, setIssueNotes] = useState("");
  const [issuing, setIssuing] = useState(false);

  const fetchCertificates = async () => {
    setCertsLoading(true);
    try {
      const res = await fetch("/api/certificates");
      const data = await res.json();
      if (data.success) {
        setCertificates(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load certificates:", err);
      toast.error("Failed to load certificates");
    } finally {
      setCertsLoading(false);
    }
  };

  const fetchEligibleStudents = async () => {
    setEligibleLoading(true);
    try {
      const res = await fetch("/api/certificates/eligible");
      const data = await res.json();
      if (data.success) {
        setEligibleStudents(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load eligible students:", err);
      toast.error("Failed to load eligible students");
    } finally {
      setEligibleLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleTabChange = (tab: "certificates" | "eligible") => {
    setActiveTab(tab);
    if (tab === "eligible" && eligibleStudents.length === 0) {
      fetchEligibleStudents();
    }
  };

  const handleOpenIssueModal = (student: any) => {
    setSelectedStudent(student);
    setIssueCompletionDate(new Date().toISOString().split("T")[0]);
    setIssueDuration("");
    setIssueTrainer("Tamizh Tech Lead Instructor");
    setIssueNotes("");
    setIssueModalOpen(true);
  };

  const handleConfirmIssue = async () => {
    if (!selectedStudent) return;

    setIssuing(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedStudent.clientId,
          applicationId: selectedStudent.applicationId,
          programName: selectedStudent.programName,
          completionDate: issueCompletionDate,
          duration: issueDuration.trim() || undefined,
          trainer: issueTrainer.trim() || undefined,
          notes: issueNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Certificate could not be issued. No certificate was created.");
      }

      toast.success(`Certificate ${data.data.certificateNo} issued successfully.`);
      setIssueModalOpen(false);
      // Refresh both
      fetchCertificates();
      fetchEligibleStudents();
      setActiveTab("certificates");
    } catch (err: any) {
      toast.error(err.message || "Certificate could not be issued.");
    } finally {
      setIssuing(false);
    }
  };

  // Filtered certificates
  const filteredCerts = certificates.filter((c) => {
    const matchesStatus =
      statusFilter === "ALL" || c.status === statusFilter;
    const matchesSearch =
      c.certificateNo.toLowerCase().includes(certSearch.toLowerCase()) ||
      c.studentName.toLowerCase().includes(certSearch.toLowerCase()) ||
      c.programName.toLowerCase().includes(certSearch.toLowerCase()) ||
      c.verificationId.toLowerCase().includes(certSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtered eligible students
  const filteredEligible = eligibleStudents.filter((s) => {
    return (
      s.studentName?.toLowerCase().includes(eligibleSearch.toLowerCase()) ||
      s.programName?.toLowerCase().includes(eligibleSearch.toLowerCase()) ||
      s.clientCode?.toLowerCase().includes(eligibleSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Award className="w-7 h-7 text-amber-600" />
            <span>Student Certificates</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Authoritative Certificate Generation & Public Verification for Robotics & STEM Workshops
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            onClick={() => handleTabChange("certificates")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "certificates"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Issued Certificates ({certificates.length})
          </button>
          <button
            onClick={() => handleTabChange("eligible")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "eligible"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Eligible Students
          </button>
        </div>
      </div>

      {/* Tab 1: Issued Certificates */}
      {activeTab === "certificates" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search certificate no, student, or program..."
                value={certSearch}
                onChange={(e) => setCertSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-medium text-slate-700 shadow-xs focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="ISSUED">Issued (Valid)</option>
                <option value="VOID">Void / Cancelled</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchCertificates}
                className="text-xs h-9"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {certsLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Loading official certificates...
              </div>
            ) : filteredCerts.length === 0 ? (
              <div className="py-16 text-center">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">
                  {certificates.length === 0
                    ? "No certificates issued yet."
                    : "No certificates match your search filter."}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Certificates are issued only to students with verified educational completion.
                </p>
                {certificates.length === 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleTabChange("eligible")}
                    className="mt-4 text-xs bg-slate-900 text-white"
                  >
                    View Eligible Students
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Certificate No</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Program / Workshop</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCerts.map((c) => {
                      const isVoid = c.status === "VOID";
                      const issueFormatted = new Date(c.issueDate || c.createdAt).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" }
                      );
                      const verificationUrl = getCertificateVerificationUrl(c.verificationId);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            <Link
                              href={`/certificates/${c.id}`}
                              className="hover:underline text-slate-900 hover:text-amber-600"
                            >
                              {c.certificateNo}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {c.studentName}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {c.programName}
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {issueFormatted}
                          </td>
                          <td className="py-3 px-4">
                            {isVoid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                                VOID
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                ISSUED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1">
                              <Link href={`/certificates/${c.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-slate-600 hover:text-slate-900"
                                  title="View Certificate"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  View
                                </Button>
                              </Link>

                              <a
                                href={`/api/certificates/${c.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-slate-600 hover:text-slate-900"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              </a>

                              <a
                                href={verificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-amber-700 hover:text-amber-800"
                                  title="Public Verification Link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Eligible Students View */}
      {activeTab === "eligible" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs">
            <h4 className="font-bold flex items-center space-x-1.5 text-amber-950 mb-1">
              <GraduationCap className="w-4 h-4 text-amber-700" />
              <span>Genuine Educational Completion Policy</span>
            </h4>
            <p>
              Under TamizhTech ERP 2.0 zero-mock policies, certificates can only be issued to students whose application is marked as <strong className="font-semibold">ENROLLED</strong> or <strong className="font-semibold">COMPLETED</strong> for a registered educational curriculum.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search student or workshop name..."
                value={eligibleSearch}
                onChange={(e) => setEligibleSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-white"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchEligibleStudents}
              className="text-xs h-9"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Eligible Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {eligibleLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Scanning applications for eligible students...
              </div>
            ) : filteredEligible.length === 0 ? (
              <div className="py-16 text-center">
                <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">
                  No students are currently eligible for certificates.
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Students become eligible when their application or workshop enrollment is confirmed in the Applications module.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Client Code</th>
                      <th className="py-3 px-4">Program / Workshop</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Certificate Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEligible.map((s, idx) => (
                      <tr key={s.applicationId || idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {s.studentName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {s.clientCode || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {s.programName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {s.alreadyIssued ? (
                            <span className="inline-flex items-center text-emerald-700 font-medium text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Already Issued
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium text-[11px]">
                              Ready for Issuance
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleOpenIssueModal(s)}
                            disabled={s.alreadyIssued}
                            className={`text-xs h-8 ${
                              s.alreadyIssued
                                ? "bg-slate-100 text-slate-400"
                                : "bg-slate-900 hover:bg-slate-800 text-white"
                            }`}
                          >
                            <Award className="w-3.5 h-3.5 mr-1" />
                            {s.alreadyIssued ? "Issued" : "Issue Certificate"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Issuance Dialog */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-slate-900">
              <Award className="w-5 h-5 text-amber-600" />
              <span>Issue Official Certificate</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Generate an official, tamper-proof certificate for this student. The certificate number will be atomically allocated from the TamizhTech sequence.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">
                    Student Name
                  </span>
                  <span className="text-slate-900 font-bold text-sm">
                    {selectedStudent.studentName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">
                    Program / Workshop
                  </span>
                  <span className="text-slate-900 font-bold text-sm">
                    {selectedStudent.programName}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Completion Date *
                </label>
                <Input
                  type="date"
                  value={issueCompletionDate}
                  onChange={(e) => setIssueCompletionDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Duration (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 5 Days / 30 Hours"
                    value={issueDuration}
                    onChange={(e) => setIssueDuration(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Trainer / Mentor (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Tamizh Tech Lead Instructor"
                    value={issueTrainer}
                    onChange={(e) => setIssueTrainer(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Administrative Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. Batch #4 - Chennai Robotics Workshop"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIssueModalOpen(false)}
              disabled={issuing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmIssue}
              disabled={issuing}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {issuing ? "Issuing..." : "Confirm & Issue Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
