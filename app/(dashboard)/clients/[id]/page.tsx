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
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-navy text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-md">
              {client.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-navy tracking-tight">{client.name}</h1>
                <StatusBadge status={client.status} type="client" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> +91 {client.phone}</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {client.email}</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {client.city}</div>
                <div className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-gray-400" /> {client.serviceType}</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
             <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-white" onClick={() => setIsEditOpen(true)}>
               <Edit className="w-4 h-4 mr-2" /> Edit Profile
             </Button>
             <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 bg-white" onClick={() => setIsDeleteOpen(true)}>
               <Trash2 className="w-4 h-4" />
             </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
        {["invoices", "payments", "followups", "notes"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${
              activeTab === tab 
                ? "border-brand text-brand bg-brand/5" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.replace("followups", "Follow-ups")}
            {tab === "invoices" && relations?.invoices && <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{relations.invoices.length}</span>}
            {tab === "payments" && relations?.payments && <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{relations.payments.length}</span>}
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
              <table className="w-full text-sm text-left whitespace-nowrap">
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
                      <td className="p-4"><StatusBadge status={inv.paymentStatus} type="payment" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === "payments" && (
          <div className="p-0">
            {(!relations?.payments || relations.payments.length === 0) ? (
              <EmptyState title="No Payments" description="No payments recorded for this client." />
            ) : (
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr><th className="p-4">Receipt No</th><th className="p-4">Date</th><th className="p-4">Invoice</th><th className="p-4">Mode</th><th className="p-4">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {relations.payments.map(pay => (
                    <tr key={pay.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-medium text-navy">{pay.paymentId}</td>
                      <td className="p-4 text-gray-500">{formatDate(pay.date)}</td>
                      <td className="p-4 text-gray-500">{pay.invoiceNo}</td>
                      <td className="p-4"><StatusBadge status={pay.mode} /></td>
                      <td className="p-4 font-medium text-green-700">+{formatCurrency(pay.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                        <time className="text-xs font-medium text-gray-400">{formatDate(fu.date)} at {fu.time}</time>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{fu.summary}</p>
                      {fu.nextAction && (
                        <div className="mt-3 p-2 bg-amber-50 rounded text-xs text-amber-800 border border-amber-100">
                          <strong>Next Action:</strong> {fu.nextAction}
                        </div>
                      )}
                      <div className="mt-3">
                         <StatusBadge status={fu.status} type="followup" />
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

      {isEditOpen && (
        <ClientForm 
          initialData={client as any}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditOpen(false)}
          isLoading={loading}
        />
      )}

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
