import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Award, Calendar, ArrowLeft } from "lucide-react";
import { verifyCertificatePublic } from "@/lib/certificateService";

export const revalidate = 0;

interface PageProps {
  params: {
    verificationId: string;
  };
}

export default async function CertificateVerificationPage({ params }: PageProps) {
  const { verificationId } = params;
  const cert = await verifyCertificatePublic(verificationId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 antialiased">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200 py-4 px-4 sm:px-8 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-amber-500 font-bold text-xl shadow-xs">
              TT
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                TAMIZH TECH ROBOTICS COMPANY
              </h1>
              <p className="text-xs text-amber-600 font-medium tracking-wide mt-1">
                OFFICIAL CERTIFICATE VERIFICATION PORTAL
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center text-xs text-slate-500 font-medium space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Secure Blockchain & Database Verified</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        {!cert ? (
          /* Not Found State */
          <div className="bg-white rounded-2xl border border-rose-200 shadow-md p-6 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Certificate not found.
            </h2>
            <p className="text-slate-600 max-w-md mx-auto text-sm mb-6 leading-relaxed">
              No genuine certificate record matches the verification code{" "}
              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {verificationId}
              </span>
              . Please verify the QR link or contact TamizhTech Robotics Company.
            </p>
            <div className="text-xs text-slate-400">
              Official TamizhTech Educational Verification Engine
            </div>
          </div>
        ) : cert.isVoid ? (
          /* VOID State */
          <div className="bg-white rounded-2xl border border-rose-200 shadow-md p-6 sm:p-10">
            <div className="flex flex-col items-center text-center pb-6 border-b border-rose-100">
              <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 mb-3">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <span className="px-3.5 py-1 text-xs font-bold tracking-wider uppercase rounded-full bg-rose-600 text-white shadow-xs">
                Certificate Status: VOID
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-3">
                This Certificate has been Cancelled / Voided
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Reference No: {cert.certificateNo}
              </p>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <div className="bg-rose-50/60 rounded-xl p-4 border border-rose-200 text-rose-900">
                <p className="font-semibold text-xs text-rose-800 uppercase tracking-wider mb-1">
                  Reason for Invalidation
                </p>
                <p className="text-sm">
                  {cert.voidReason || "This certificate was officially voided or superseded by an administrative update."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-xs font-semibold text-slate-500 uppercase">Student Name</span>
                  <span className="font-medium text-slate-900 text-base">{cert.studentName}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-xs font-semibold text-slate-500 uppercase">Program / Workshop</span>
                  <span className="font-medium text-slate-900 text-base">{cert.programName}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VALID Certificate State */
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-md overflow-hidden">
            {/* Verification Success Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <span className="inline-block px-3 py-0.5 text-xs font-bold tracking-widest uppercase bg-white text-emerald-800 rounded-full shadow-xs mb-1">
                VALID OFFICIAL CREDENTIAL
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Certificate Verified
              </h2>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1">
                This credential was officially issued by Tamizh Tech Robotics Company.
              </p>
            </div>

            {/* Certificate Details */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Certificate Number
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-base sm:text-lg">
                    {cert.certificateNo}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Verification ID
                  </span>
                  <span className="font-mono font-bold text-amber-700 text-base sm:text-lg">
                    {cert.verificationId}
                  </span>
                </div>
              </div>

              <div className="p-5 bg-amber-50/50 rounded-xl border border-amber-200/80">
                <div className="flex items-center space-x-2 text-amber-800 mb-1">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Recipient Student
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {cert.studentName}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Completed Program / Workshop
                  </span>
                  <p className="text-base sm:text-lg font-bold text-slate-900">
                    {cert.programName}
                  </p>
                  {cert.duration && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-200 text-slate-700 text-xs font-medium rounded">
                      Duration: {cert.duration}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Completion Date
                    </span>
                    <span className="font-semibold text-slate-900 text-sm sm:text-base flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5 text-slate-500 inline" />
                      {new Date(cert.completionDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Issue Date
                    </span>
                    <span className="font-semibold text-slate-900 text-sm sm:text-base flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5 text-slate-500 inline" />
                      {new Date(cert.issueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Issuing Organization
                    </span>
                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      {cert.issuedBy}
                    </span>
                  </div>
                  <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Status: VALID
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          © {new Date().getFullYear()} Tamizh Tech Robotics Company. All rights reserved.
        </p>
        <p className="mt-1 text-slate-400">
          Robotics Kits, STEM Education, Research, and Technical Training Center.
        </p>
      </footer>
    </div>
  );
}
