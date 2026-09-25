"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClients } from "@/hooks/useClients";
import { Client, Invoice, Payment, FollowUp } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { MapPin, Mail, Phone, ExternalLink, Calendar, CheckSquare, Clock, ArrowLeft, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { ClientForm } from "@/components/clients/ClientForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ResponsiveDrawer } from "@/components/shared/ResponsiveDrawer";

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getClientProfile, updateClient, deleteClient } = useClients();
  
  const [client, setClient] = useState<Client | null>(null);
  const [relations, setRelations] = useState<{ invoices: Invoice[], payments: Payment[], followUps: FollowUp[] } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "followups" | "notes">("invoices");
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cProfile, rData] = await Promise.all([
          getClientProfile(params.id),
          fetch(`/api/clients/${params.id}/relations`).then(r => r.json())
        ]);
        setClient(cProfile);
        if(rData.success) {
          setRelations(rData.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  if (loading) return <LoadingSkeleton type="page" />;
  if (!client) return <EmptyState title="Client Not Found" description="The requested client does not exist or was deleted." />;

  const handleEditSubmit = async (data: any) => {
    await updateClient(client.id, data);
    setClient({ ...client, ...data });
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    await deleteClient(client.id);
    router.push("/clients");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Breadcrumb / Back Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy cursor-pointer w-max" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-bl-full -z-10" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 w-full">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-navy text-white rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-md shrink-0">
              {client.name.charAt(0)}
            </div>
            <div className="w-full">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-navy tracking-tight">{client.name}</h1>
                <StatusBadge status={client.status} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400 shrink-0" /> {client.phone}</div>
                {client.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400 shrink-0" /> {client.email}</div>}
                {client.company && <div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase text-gray-400">Co:</span> {client.company}</div>}
                {client.type && <div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase text-gray-400">Type:</span> {client.type}</div>}
                {client.city && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400 shrink-0" /> {client.city}</div>}
                {client.address && <div className="flex items-center gap-2 text-xs text-gray-500 sm:col-span-2">{client.address}</div>}
                {client.serviceType && <div className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-gray-400 shrink-0" /> {client.serviceType}</div>}
                {client.createdAt && <div className="flex items-center gap-2 text-xs text-gray-400"><Calendar className="w-3.5 h-3.5 shrink-0" /> Created: {formatDate(client.createdAt)}</div>}
                {client.updatedAt && <div className="flex items-center gap-2 text-xs text-gray-400"><Clock className="w-3.5 h-3.5 shrink-0" /> Updated: {formatDate(client.updatedAt)}</div>}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
             <Link href={`/invoices/new?client=${client.id}`} className="flex-1 sm:flex-initial">
               <Button className="w-full bg-brand hover:bg-brand-dark text-white font-semibold shadow-sm">
                 + Create Bill
               </Button>
             </Link>
             <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-white flex-1 sm:flex-initial" onClick={() => setIsEditOpen(true)}>
               <Edit className="w-4 h-4 mr-1.5" /> Edit
             </Button>
             <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 bg-white" onClick={() => setIsDeleteOpen(true)}>
               <Trash2 className="w-4 h-4" />
             </Button>
          </div>
        </div>

        {/* Derived Financial Metrics */}
        {(() => {
          const invs = relations?.invoices || [];
          const pays = relations?.payments || [];
          const totalInvoiced = invs.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
          const totalPaid = pays.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          const outstandingBalance = invs.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 pt-6 border-t border-gray-100">
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-[11px] sm:text-xs text-gray-500 block truncate">Total Bills</span>
                <span className="text-base sm:text-lg font-bold text-navy">{invs.length}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-[11px] sm:text-xs text-gray-500 block truncate">Total Invoiced</span>
                <span className="text-base sm:text-lg font-bold text-navy">{formatCurrency(totalInvoiced)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-[11px] sm:text-xs text-gray-500 block truncate">Total Paid</span>
                <span className="text-base sm:text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-[11px] sm:text-xs text-gray-500 block truncate">Outstanding</span>
                <span className={`text-base sm:text-lg font-bold ${outstandingBalance > 0 ? "text-red-600" : "text-green-700"}`}>
                  {formatCurrency(outstandingBalance)}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
        {["invoices", "payments", "followups", "notes"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${
              activeTab === tab 
                ? "border-brand text-brand bg-brand/5" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.replace("followups", "Follow-ups")}
            {tab === "invoices" && relations?.invoices && <span className="ml-1.5 sm:ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{relations.invoices.length}</span>}
            {tab === "payments" && relations?.payments && <span className="ml-1.5 sm:ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{relations.payments.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm min-h-[400px]">
        
        {/* INVOICES */}
        {activeTab === "invoices" && (
          <div className="p-0">
            {(!relations?.invoices || relations.invoices.length === 0) ? (
              <EmptyState title="No Invoices" description="This client doesn't have any invoices yet." actionLabel="Create Invoice" onAction={() => router.push(`/invoices/new?client=${client.id}`)} />
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-[500px]">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr><th className="p-4">Invoice No</th><th className="p-4">Date</th><th className="p-4">Total</th><th className="p-4">Balance</th><th className="p-4">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relations.invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50/50">
                        <td className="p-4"><Link href={`/invoices/${inv.id}`} className="text-brand font-medium hover:underline">{inv.invoiceNo}</Link></td>
                        <td className="p-4 text-gray-500">{formatDate(inv.date)}</td>
                        <td className="p-4 font-medium">{formatCurrency(inv.total)}</td>
                        <td className="p-4 text-red-600 font-medium">{inv.balance > 0 ? formatCurrency(inv.balance) : '-'}</td>
                        <td className="p-4"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === "payments" && (
          <div className="p-0">
            {(!relations?.payments || relations.payments.length === 0) ? (
              <EmptyState title="No Payments" description="No payments recorded for this client." />
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-[500px]">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr><th className="p-4">Receipt No</th><th className="p-4">Date</th><th className="p-4">Invoice</th><th className="p-4">Mode</th><th className="p-4">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relations.payments.map(pay => (
                      <tr key={pay.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-medium text-navy">{pay.paymentNo}</td>
                        <td className="p-4 text-gray-500">{formatDate(pay.date)}</td>
                        <td className="p-4 text-gray-500">{pay.invoiceId || "-"}</td>
                        <td className="p-4"><StatusBadge status={pay.mode} /></td>
                        <td className="p-4 font-medium text-green-700">+{formatCurrency(pay.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* FOLLOW UPS (TIMELINE VIEW) */}
        {activeTab === "followups" && (
          <div className="p-6">
            {(!relations?.followUps || relations.followUps.length === 0) ? (
              <EmptyState title="No Follow-ups" description="No timeline history found." />
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {relations.followUps.map((fu, idx) => (
                  <div key={fu.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-50 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 mx-auto">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-brand uppercase">{fu.mode}</span>
                        <time className="text-xs font-medium text-gray-400">{formatDate(fu.date)} {fu.time ? `at ${fu.time}` : ""}</time>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{fu.summary || fu.notes || "-"}</p>
                      {fu.nextAction && (
                        <div className="mt-3 p-2 bg-amber-50 rounded text-xs text-amber-800 border border-amber-100">
                          <strong>Next Action:</strong> {fu.nextAction}
                        </div>
                      )}
                      <div className="mt-3">
                         <StatusBadge status={fu.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTES */}
        {activeTab === "notes" && (
          <div className="p-6 max-w-2xl">
            <h3 className="text-lg font-semibold text-navy mb-4">Internal Notes</h3>
            {client.notes ? (
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                 {client.notes}
              </div>
            ) : (
              <p className="text-gray-400 italic">No notes have been added for this client.</p>
            )}
          </div>
        )}

      </div>

      <ResponsiveDrawer
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Customer"
        description="Update contact and commercial details for this customer."
      >
        <ClientForm 
          initialData={client as any}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditOpen(false)}
          isLoading={loading}
        />
      </ResponsiveDrawer>

      <ConfirmDialog 
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Client?"
        description="Are you sure you want to completely delete this profile? This action is irreversible."
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
