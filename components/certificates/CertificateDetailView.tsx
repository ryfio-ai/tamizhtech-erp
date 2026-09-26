"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Printer,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Ban,
  CheckCircle2,
  Calendar,
  Award,
  Copy,
  Check,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface CertificateDetailViewProps {
  certificate: any;
  userRole?: string;
}

export function CertificateDetailView({
  certificate: initialCert,
  userRole = "ADMIN",
}: CertificateDetailViewProps) {
  const router = useRouter();
  const [cert, setCert] = useState(initialCert);
  const [copied, setCopied] = useState(false);

  // Void modal state
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  // Reissue modal state
  const [reissueOpen, setReissueOpen] = useState(false);
  const [reissueReason, setReissueReason] = useState("");
  const [reissueProgram, setReissueProgram] = useState(cert.programNameSnapshot);
  const [reissueDuration, setReissueDuration] = useState(cert.duration || "");
  const [reissueTrainer, setReissueTrainer] = useState(cert.trainer || "");
  const [reissueLoading, setReissueLoading] = useState(false);

  const verificationUrl = getCertificateVerificationUrl(cert.verificationId);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      toast.success("Verification URL copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      toast.error("Please provide a reason for voiding this certificate.");
      return;
    }

    setVoiding(true);
    try {
      const res = await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VOID",
          reason: voidReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to void certificate");
      }

      toast.success("Certificate successfully voided.");
      setCert(data.data);
      setVoidOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setVoiding(false);
    }
  };

  const handleReissue = async () => {
    if (!reissueReason.trim()) {
      toast.error("Please provide a reason for reissuing this certificate.");
      return;
    }

    setReissueLoading(true);
    try {
      const res = await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REISSUE",
          reason: reissueReason.trim(),
          updatedProgramName: reissueProgram.trim() || undefined,
          updatedDuration: reissueDuration.trim() || undefined,
          updatedTrainer: reissueTrainer.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reissue certificate");
      }

      toast.success(`New certificate ${data.data.certificateNo} issued successfully.`);
      setReissueOpen(false);
      router.push(`/certificates/${data.data.id}`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while reissuing");
    } finally {
      setReissueLoading(false);
    }
  };

  const isVoid = cert.status === "VOID";
  const canModify = [
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "OPERATIONS",
    "ENGINEERING",
  ].includes(userRole);

  const formattedCompletion = new Date(
    cert.completionDate || cert.createdAt
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedIssue = new Date(cert.issueDate || cert.createdAt).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/certificates"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {cert.certificateNo}
              </h1>
              {isVoid ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                  VOID / CANCELLED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ISSUED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verification Code: <span className="font-mono font-medium">{cert.verificationId}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs h-9"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </Button>

          <a
            href={`/api/certificates/${cert.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9">
              <Download className="w-4 h-4 mr-1.5" />
              Download PDF
            </Button>
          </a>

          {canModify && !isVoid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoidOpen(true)}
              className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 h-9"
            >
              <Ban className="w-4 h-4 mr-1.5" />
              Void
            </Button>
          )}

          {canModify && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReissueOpen(true)}
              className="text-xs text-amber-600 hover:bg-amber-50 border-amber-200 h-9"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Reissue
            </Button>
          )}
        </div>
      </div>

      {/* Reissue Notice / Void Banner */}
      {isVoid && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold">This Certificate is Voided</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Reason: {cert.voidReason || "Voided by administration"}
            </p>
            {cert.reissuedToCertificateId && (
              <p className="text-xs text-rose-800 font-medium mt-1">
                Reissued as new certificate:{" "}
                <Link
                  href={`/certificates/${cert.reissuedToCertificateId}`}
                  className="underline hover:text-rose-950 font-bold"
                >
                  View Superseding Certificate
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {cert.reissuedFromCertificateId && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
          <span>
            This certificate is a verified reissue of previous record:{" "}
            <span className="font-mono font-semibold">{cert.reissuedFromCertificateId}</span>
          </span>
          <Link
            href={`/certificates/${cert.reissuedFromCertificateId}`}
            className="underline font-bold text-amber-800 hover:text-amber-950 ml-2 shrink-0"
          >
            View Original
          </Link>
        </div>
      )}

      {/* Certificate Visual Card Preview */}
      <div className="relative bg-white rounded-2xl border-2 border-slate-800 p-6 sm:p-10 shadow-lg overflow-hidden">
        {/* Decorative Inner Gold Border */}
        <div className="border border-amber-500/80 rounded-xl p-6 sm:p-8 bg-[#FFFCF5] relative">
          {/* VOID Watermark Overlay */}
          {isVoid && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="border-4 border-rose-600/40 text-rose-600/40 font-black text-4xl sm:text-6xl tracking-widest uppercase rotate-[-25deg] px-8 py-3 rounded-xl select-none">
                VOID / CANCELLED
              </div>
            </div>
          )}

          {/* Certificate Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="w-14 h-14 mx-auto rounded-lg bg-slate-900 flex items-center justify-center text-amber-500 font-bold text-xl shadow-xs">
              TT
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-widest text-slate-900 uppercase">
              TAMIZH TECH ROBOTICS COMPANY
            </h2>
            <p className="text-xs font-semibold text-amber-600 tracking-wider uppercase">
              Center for Robotics & STEM Innovation
            </p>
          </div>

          {/* Certificate Title */}
          <div className="text-center my-6">
            <h3 className="text-2xl sm:text-3xl font-black tracking-wide text-slate-900 uppercase">
              CERTIFICATE OF COMPLETION
            </h3>
            <div className="w-32 h-0.5 bg-amber-500 mx-auto mt-2 mb-4" />
            <p className="text-xs text-slate-500 italic">This certificate is proudly presented to</p>
          </div>

          {/* Student Recipient Name */}
          <div className="text-center my-6">
            <h4 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950 uppercase">
              {cert.studentNameSnapshot}
            </h4>
            <div className="w-64 sm:w-96 h-px bg-slate-300 mx-auto mt-2" />
          </div>

          {/* Statement & Program */}
          <div className="text-center max-w-xl mx-auto space-y-2 my-6">
            <p className="text-xs text-slate-600">
              for successfully completing the technical curriculum and hands-on requirements in
            </p>
            <h5 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-wide">
              {cert.programNameSnapshot}
            </h5>
            <p className="text-xs font-semibold text-slate-700">
              completed on {formattedCompletion}
            </p>
          </div>

          {/* Bottom Columns: Numbering / Verification / Signature */}
          <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            <div className="text-left space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Certificate No
              </span>
              <p className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                {cert.certificateNo}
              </p>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 pt-1">
                Issued On
              </span>
              <p className="font-semibold text-xs text-slate-800">
                {formattedIssue}
              </p>
            </div>

            <div className="text-center space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Verification Identifier
              </span>
              <p className="font-mono font-bold text-xs sm:text-sm text-amber-700">
                {cert.verificationId}
              </p>
              <p className="text-[10px] text-slate-400">
                TamizhTech Authentic Credential
              </p>
            </div>

            <div className="text-right space-y-1">
              <div className="w-36 h-0.5 bg-slate-900 ml-auto mb-1" />
              <p className="text-xs font-bold uppercase text-slate-900">
                Authorized Signatory
              </p>
              <p className="text-[10px] text-slate-500">
                Tamizh Tech Robotics Company
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Public Verification Share Card */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Public Online Verification Link</span>
          </div>
          <p className="text-xs text-slate-500">
            Anyone can verify this credential at:{" "}
            <span className="font-mono text-slate-700">{verificationUrl}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs h-8"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy Link
              </>
            )}
          </Button>

          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open
            </Button>
          </a>
        </div>
      </div>

      {/* Void Dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center space-x-2">
              <Ban className="w-5 h-5" />
              <span>Void Certificate {cert.certificateNo}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Voiding permanently revokes the validity of this certificate. The certificate number will remain historically documented but will show as VOID on public verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason for Invalidation *
              </label>
              <Textarea
                rows={3}
                placeholder="e.g., Spelling correction required, curriculum change, duplicate entry..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoidOpen(false)}
              disabled={voiding}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleVoid}
              disabled={voiding}
            >
              {voiding ? "Voiding..." : "Confirm Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reissue Dialog */}
      <Dialog open={reissueOpen} onOpenChange={setReissueOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-slate-900">
              <RefreshCw className="w-5 h-5 text-amber-600" />
              <span>Reissue Certificate</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Reissuing will officially VOID the current certificate ({cert.certificateNo}) and atomically issue a brand-new certificate number while preserving historical audit linkage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason for Reissue *
              </label>
              <Textarea
                rows={2}
                placeholder="e.g., Program title correction, student name spelling update..."
                value={reissueReason}
                onChange={(e) => setReissueReason(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Program / Workshop Title
              </label>
              <Input
                value={reissueProgram}
                onChange={(e) => setReissueProgram(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Duration (Optional)
                </label>
                <Input
                  placeholder="e.g. 30 Hours / 5 Days"
                  value={reissueDuration}
                  onChange={(e) => setReissueDuration(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Trainer (Optional)
                </label>
                <Input
                  placeholder="e.g. Robotics Lead"
                  value={reissueTrainer}
                  onChange={(e) => setReissueTrainer(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReissueOpen(false)}
              disabled={reissueLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReissue}
              disabled={reissueLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {reissueLoading ? "Reissuing..." : "Confirm & Issue New"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
