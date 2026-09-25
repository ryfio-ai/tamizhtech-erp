"use client";

import React from "react";
import type { BusinessDocumentModel } from "@/types/businessDocument";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BusinessDocumentViewProps {
  data: BusinessDocumentModel;
  pdfDownloadUrl?: string;
  backUrl?: string;
  showToolbar?: boolean;
  extraActions?: React.ReactNode;
}

export function BusinessDocumentView({
  data,
  pdfDownloadUrl,
  backUrl,
  showToolbar = true,
  extraActions,
}: BusinessDocumentViewProps) {
  const {
    title,
    documentNumber,
    documentNumberLabel,
    documentDate,
    documentDateLabel,
    validUntil,
    placeOfSupply,
    company,
    billTo,
    shipTo,
    items,
    financials,
    notes,
    terms,
  } = data;

  const isInvoice = data.docType === "INVOICE";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white text-slate-900">
      {/* Top Action Toolbar (Hidden during Print) */}
      {showToolbar && (
        <div className="max-w-4xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
          {backUrl ? (
            <Link
              href={backUrl}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to list
            </Link>
          ) : <div />}

          <div className="flex flex-wrap items-center gap-3">
            {extraActions}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition-colors"
              id="btn-print-document"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print Document
            </button>
            {pdfDownloadUrl && (
              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#1B2A4A] hover:bg-[#131E35] rounded-md shadow-sm transition-colors"
                id="btn-download-pdf"
              >
                <Download className="w-4 h-4 text-orange-400" />
                Download PDF
              </a>
            )}
          </div>
        </div>
      )}

      {/* Authoritative A4 Document Container */}
      <div
        className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-md print:shadow-none print:border print:border-slate-400 text-[11px] leading-tight select-text"
        id="business-document-container"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* 1. Header: Logo, Company Info, and Large Document Title */}
        <div className="flex justify-between items-start p-4 border-b border-slate-300">
          <div className="flex items-start gap-4 w-[68%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/ttrc-logo.png"
              alt={company.companyName}
              className="w-16 h-12 object-contain flex-shrink-0"
              onError={(e) => {
                // Graceful fallback to text if image missing in preview
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <div>
              <h1 className="text-sm font-bold text-[#1B2A4A] uppercase tracking-wide">
                {company.companyName}
              </h1>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                {[
                  company.addressLine1,
                  company.addressLine2,
                  company.city,
                  company.state,
                  company.pincode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-[10px] text-slate-600">
                Phone: {company.phone} | Email: {company.email}
              </p>
              <p className="text-[10px] text-slate-600">
                Website: {company.website}
              </p>
              {company.gstin && (
                <p className="text-[10px] font-semibold text-[#1B2A4A]">
                  GSTIN: {company.gstin}
                </p>
              )}
            </div>
          </div>

          <div className="w-[30%] text-right flex flex-col justify-center items-end">
            <h2 className="text-xl font-black text-[#1B2A4A] tracking-wider">
              {title}
            </h2>
            {isInvoice && (
              <span className="text-[10px] font-bold text-[#FF6B00] mt-0.5">
                Original For Recipient
              </span>
            )}
          </div>
        </div>

        {/* 2. Document Identification & Place of Supply Row */}
        <div className="flex justify-between items-center px-4 py-2 bg-slate-50 border-b border-slate-300 text-[10.5px]">
          <div className="space-y-0.5">
            <div>
              <span className="text-slate-600">{documentNumberLabel} : </span>
              <span className="font-bold text-slate-900">{documentNumber}</span>
            </div>
            <div>
              <span className="text-slate-600">{documentDateLabel} : </span>
              <span className="font-bold text-slate-900">{documentDate}</span>
            </div>
            {validUntil && (
              <div>
                <span className="text-slate-600">Valid Until : </span>
                <span className="font-bold text-slate-900">{validUntil}</span>
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-slate-600">Place Of Supply : </span>
            <span className="font-bold text-slate-900">{placeOfSupply}</span>
          </div>
        </div>

        {/* 3. Bill To / Ship To Grid */}
        <div className="grid grid-cols-2 border-b border-slate-300">
          {/* Bill To */}
          <div className="p-3 border-r border-slate-300">
            <div className="bg-slate-100 px-2 py-0.5 mb-1.5 font-bold text-[#1B2A4A] uppercase text-[9.5px]">
              Bill To
            </div>
            <p className="font-bold text-slate-900 text-[11px]">{billTo.name}</p>
            {billTo.company && (
              <p className="text-slate-700 text-[10px]">{billTo.company}</p>
            )}
            {billTo.address && (
              <p className="text-slate-600 text-[10px]">{billTo.address}</p>
            )}
            {(billTo.city || billTo.state || billTo.pincode) && (
              <p className="text-slate-600 text-[10px]">
                {[billTo.city, billTo.state, billTo.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {billTo.phone && (
              <p className="text-slate-600 text-[10px]">Phone: {billTo.phone}</p>
            )}
            {billTo.email && (
              <p className="text-slate-600 text-[10px]">Email: {billTo.email}</p>
            )}
            {billTo.gstin && (
              <p className="font-semibold text-[#1B2A4A] text-[10px]">
                GSTIN: {billTo.gstin}
              </p>
            )}
          </div>

          {/* Ship To */}
          <div className="p-3">
            <div className="bg-slate-100 px-2 py-0.5 mb-1.5 font-bold text-[#1B2A4A] uppercase text-[9.5px]">
              Ship To
            </div>
            <p className="font-bold text-slate-900 text-[11px]">{shipTo.name}</p>
            {shipTo.company && (
              <p className="text-slate-700 text-[10px]">{shipTo.company}</p>
            )}
            {shipTo.address && (
              <p className="text-slate-600 text-[10px]">{shipTo.address}</p>
            )}
            {(shipTo.city || shipTo.state || shipTo.pincode) && (
              <p className="text-slate-600 text-[10px]">
                {[shipTo.city, shipTo.state, shipTo.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {shipTo.phone && (
              <p className="text-slate-600 text-[10px]">Phone: {shipTo.phone}</p>
            )}
            {shipTo.email && (
              <p className="text-slate-600 text-[10px]">Email: {shipTo.email}</p>
            )}
            {shipTo.gstin && (
              <p className="font-semibold text-[#1B2A4A] text-[10px]">
                GSTIN: {shipTo.gstin}
              </p>
            )}
          </div>
        </div>

        {/* 4. Main Item Table */}
        <div className="w-full border-b border-slate-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-[#1B2A4A] uppercase">
                <th className="py-1.5 px-2 text-center w-[4%]">#</th>
                <th className="py-1.5 px-2 w-[39%]">Item & Description</th>
                <th className="py-1.5 px-2 text-center w-[11%]">HSN/SAC</th>
                <th className="py-1.5 px-2 text-center w-[8%]">Qty</th>
                <th className="py-1.5 px-2 text-right w-[11%]">Rate</th>
                <th className="py-1.5 px-2 text-right w-[7%]">Tax %</th>
                <th className="py-1.5 px-2 text-right w-[8%]">Tax Amt</th>
                <th className="py-1.5 px-2 text-right w-[12%]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[10.5px]">
              {items.map((item, idx) => (
                <tr key={item.index || idx} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2 text-center text-slate-500 font-medium">
                    {item.index}
                  </td>
                  <td className="py-2 px-2">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    {item.description && item.description !== item.name && (
                      <p className="text-[9.5px] text-slate-500">{item.description}</p>
                    )}
                    {item.configurationNotes && (
                      <p className="text-[9.5px] text-slate-500 italic">
                        • {item.configurationNotes}
                      </p>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-600">
                    {item.hsnSac || "-"}
                  </td>
                  <td className="py-2 px-2 text-center font-medium text-slate-800">
                    {item.qty}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-700">
                    ₹{item.rate.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-600">
                    {item.taxPercent}%
                  </td>
                  <td className="py-2 px-2 text-right text-slate-700">
                    ₹{item.taxAmount.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-slate-900">
                    ₹{item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. Lower Section: Left (Words/Terms) and Right (Totals/Signature) */}
        <div className="grid grid-cols-12">
          {/* Left Column (58% approx 7 cols) */}
          <div className="col-span-7 p-3 border-r border-slate-300 space-y-3">
            {/* Total In Words */}
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-sm">
              <span className="block text-[9.5px] font-bold text-[#1B2A4A] uppercase mb-0.5">
                Total In Words
              </span>
              <p className="font-bold text-slate-900 text-[10.5px]">
                {financials.totalInWords}
              </p>
            </div>

            {/* Scan & Pay via UPI or Payment Status */}
            {isInvoice && (
              <>
                {data.dynamicUpi?.isPaidInFull ? (
                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-sm">
                    <span className="block text-[9.5px] font-bold text-emerald-800 uppercase mb-0.5">
                      Paid in Full
                    </span>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      No outstanding amount remains on this invoice.
                    </p>
                  </div>
                ) : data.dynamicUpi?.isConfigured === false ? (
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-sm">
                    <span className="block text-[9.5px] font-bold text-amber-800 uppercase mb-0.5">
                      UPI payment unavailable
                    </span>
                    <p className="text-[10px] text-amber-700">
                      UPI payment details have not been configured.
                    </p>
                  </div>
                ) : data.dynamicUpi?.isPayable && data.dynamicUpi?.qrDataUri ? (
                  <div className="flex items-center gap-3.5 p-2 bg-slate-50/90 border border-slate-200 rounded-sm">
                    <div className="w-20 h-20 bg-white p-1 border border-slate-200 rounded shrink-0 flex items-center justify-center shadow-xs">
                      <img
                        src={data.dynamicUpi.qrDataUri}
                        alt="Dynamic UPI QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1 font-bold text-[#1B2A4A] uppercase text-[9.5px]">
                        Payment Information
                      </span>
                      <p className="text-[10.5px] text-slate-800 font-semibold">
                        Outstanding Amount: <span className="font-bold text-emerald-700">₹{data.dynamicUpi.amountFormatted}</span>
                      </p>
                      <p className="text-[9.5px] text-slate-700 font-medium">
                        UPI ID: <span className="font-bold text-slate-900 select-all">{data.dynamicUpi.vpa}</span>
                      </p>
                      <p className="text-[9px] text-slate-500 leading-tight">
                        Scan to pay using any supported UPI app (GPay, PhonePe, Paytm, BHIM)
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            {/* Notes */}
            {notes && (
              <div>
                <span className="block text-[9.5px] font-bold text-[#1B2A4A] uppercase mb-0.5">
                  Notes
                </span>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  {notes}
                </p>
              </div>
            )}

            {/* Terms & Conditions */}
            {terms.length > 0 && (
              <div>
                <span className="block text-[9.5px] font-bold text-[#1B2A4A] uppercase mb-1">
                  Terms & Conditions
                </span>
                <ol className="list-decimal list-inside space-y-0.5 text-[9.5px] text-slate-600 leading-tight">
                  {terms.map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Right Column (42% approx 5 cols) */}
          <div className="col-span-5 flex flex-col justify-between">
            {/* Totals Table */}
            <div className="border-b border-slate-300 text-[10.5px]">
              <div className="flex justify-between py-1.5 px-3 border-b border-slate-200">
                <span className="text-slate-600">Sub Total</span>
                <span className="font-semibold text-slate-900">
                  ₹{financials.subtotal.toFixed(2)}
                </span>
              </div>

              {financials.discountAmount > 0 && (
                <div className="flex justify-between py-1.5 px-3 border-b border-slate-200 text-emerald-700">
                  <span>Discount</span>
                  <span className="font-semibold">
                    -₹{financials.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {financials.shippingCharge > 0 && (
                <div className="flex justify-between py-1.5 px-3 border-b border-slate-200">
                  <span className="text-slate-600">Shipping charge</span>
                  <span className="font-semibold text-slate-900">
                    ₹{financials.shippingCharge.toFixed(2)}
                  </span>
                </div>
              )}

              {financials.isIntraState ? (
                <>
                  <div className="flex justify-between py-1.5 px-3 border-b border-slate-200">
                    <span className="text-slate-600">
                      CGST ({financials.cgstRate.toFixed(1)}%)
                    </span>
                    <span className="font-semibold text-slate-900">
                      ₹{financials.cgstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 px-3 border-b border-slate-200">
                    <span className="text-slate-600">
                      SGST ({financials.sgstRate.toFixed(1)}%)
                    </span>
                    <span className="font-semibold text-slate-900">
                      ₹{financials.sgstAmount.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1.5 px-3 border-b border-slate-200">
                  <span className="text-slate-600">
                    IGST ({financials.igstRate.toFixed(1)}%)
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{financials.igstAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 px-3 bg-slate-100 border-b border-slate-300 text-sm font-bold text-[#1B2A4A]">
                <span>Total</span>
                <span>₹{financials.grandTotal.toFixed(2)}</span>
              </div>

              {isInvoice && financials.paidAmount !== undefined && financials.paidAmount > 0 && (
                <div className="flex justify-between py-1.5 px-3 border-b border-slate-200 text-emerald-700">
                  <span className="font-medium">Payment Made</span>
                  <span className="font-semibold">
                    ₹{financials.paidAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {isInvoice && financials.balanceAmount !== undefined && (
                <div className="flex justify-between py-1.5 px-3">
                  <span className="text-slate-700 font-medium">Balance Due</span>
                  <span
                    className={`font-bold ${
                      financials.balanceAmount > 0
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    ₹{financials.balanceAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Authorized Signature Box */}
            <div className="p-3 text-center flex flex-col justify-between min-h-[230px]">
              <p className="text-[11px] font-bold text-[#1B2A4A]">
                For {company.companyName}
              </p>
              <div className="flex flex-col items-center justify-end flex-1 pt-1">
                <div className="w-full max-w-[340px] h-[160px] flex items-center justify-center my-0.5">
                  <img
                    src={data.signatureSrc || "/signature.png"}
                    alt="Authorized Signature"
                    className="w-full h-full object-contain scale-[2.2] transform mix-blend-multiply"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="w-[280px] mx-auto border-t border-slate-400 pt-1 text-[10.5px] text-slate-500 font-medium">
                  Authorized Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Strict Print Layout & Colors */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          #business-document-container {
            border: 1px solid #94a3b8 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
