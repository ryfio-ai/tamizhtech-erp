'use client';

import { useEffect, useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Target, 
  FileText, 
  CreditCard,
  Edit,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import ClientForm from '@/components/clients/ClientForm';
import DataTable from '@/components/shared/DataTable';
import { Client, Invoice, Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ClientProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchClientData = async () => {
    try {
      const [clientRes, invRes, payRes] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch(`/api/invoices?clientId=${id}`),
        fetch(`/api/payments?clientId=${id}`)
      ]);

      const clientResult = await clientRes.json();
      const invResult = await invRes.json();
      const payResult = await payRes.json();

      if (clientResult.success) setClient(clientResult.data);
      if (invResult.success) setInvoices(invResult.data);
      if (payResult.success) setPayments(payResult.data);
    } catch (error) {
      toast.error("Failed to load client profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleUpdate = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Client profile updated");
        setIsEditOpen(false);
        fetchClientData();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton type="page" />;
  if (!client) return <div className="p-8 text-center bg-white rounded-2xl border shadow-sm">Client not found.</div>;

  const totalBilled = invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalPaid = payments.reduce((acc, pay) => acc + pay.amount, 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-brand bg-white shadow-sm border rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-navy tracking-tight">{client.name}</h1>
            <div className="flex items-center space-x-3 mt-1 font-medium">
               <StatusBadge status={client.status} type="client" />
               <span className="text-gray-400 text-xs uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic">Created {formatDate(client.createdAt)}</span>
            </div>
          </div>
        </div>
        
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand hover:bg-brand-dark text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-brand/20 transition-all">
              <Edit className="mr-2 h-5 w-5" />
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-2xl border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-navy tracking-tight">Edit Client Profile</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ClientForm 
                initialData={client} 
                onSubmit={handleUpdate} 
                loading={submitting} 
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm bg-white rounded-2xl transition-all hover:shadow-md border-l-4 border-l-brand">
          <CardContent className="p-6">
             <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Billed</p>
             <h3 className="text-2xl font-black text-navy mt-1">{formatCurrency(totalBilled)}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white rounded-2xl transition-all hover:shadow-md border-l-4 border-l-green-500">
          <CardContent className="p-6">
             <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Paid</p>
             <h3 className="text-2xl font-black text-green-600 mt-1">{formatCurrency(totalPaid)}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white rounded-2xl transition-all hover:shadow-md border-l-4 border-l-red-500">
          <CardContent className="p-6">
             <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Outstanding</p>
             <h3 className="text-2xl font-black text-red-600 mt-1">{formatCurrency(outstanding)}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
           <Card className="border-0 shadow-sm bg-navy text-white rounded-3xl overflow-hidden">
             <div className="bg-brand p-6 flex flex-col items-center">
                <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-3xl font-black mb-4 border border-white/30">
                   {client.name.charAt(0)}
                </div>
                <h4 className="text-lg font-bold text-center">{client.name}</h4>
                <p className="text-white/60 text-xs font-medium mt-1">{client.serviceType}</p>
             </div>
             <CardContent className="p-6 space-y-5">
                <div className="flex items-start space-x-3">
                   <Phone className="h-4 w-4 text-brand mt-1 flex-shrink-0" />
                   <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-white/40">Phone</p>
                      <p className="text-sm font-bold text-white/90">{client.phone}</p>
                   </div>
                </div>
                <div className="flex items-start space-x-3 text-white">
                   <Mail className="h-4 w-4 text-brand mt-1 flex-shrink-0" />
                   <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-white/40">Email</p>
                      <p className="text-sm font-bold text-white/90 truncate max-w-[150px]">{client.email}</p>
                   </div>
                </div>
                <div className="flex items-start space-x-3 text-white">
                   <MapPin className="h-4 w-4 text-brand mt-1 flex-shrink-0" />
                   <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-white/40">City</p>
                      <p className="text-sm font-bold text-white/90">{client.city}</p>
                   </div>
                </div>
                <div className="flex items-start space-x-3 text-white">
                   <Target className="h-4 w-4 text-brand mt-1 flex-shrink-0" />
                   <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-white/40">Lead Source</p>
                      <p className="text-sm font-bold text-white/90">{client.source}</p>
                   </div>
                </div>
             </CardContent>
           </Card>

           {client.notes && (
             <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden border-t-8 border-t-brand/5">
                <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-black text-navy uppercase tracking-widest flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-brand" /> Notes
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-xs text-gray-500 font-medium leading-relaxed italic border-l-2 border-brand/20 pl-4 py-2 bg-gray-50/50 rounded-r-xl">
                      {client.notes}
                   </p>
                </CardContent>
             </Card>
           )}
        </div>

        {/* Right Content Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="invoices" className="w-full">
            <TabsList className="bg-gray-100 p-1.5 rounded-2xl h-14 w-full md:w-auto md:inline-flex shadow-inner mb-6">
              <TabsTrigger 
                value="invoices" 
                className="rounded-xl px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-xl h-full transition-all"
              >
                Invoices
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="rounded-xl px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-xl h-full transition-all"
              >
                Payments
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="invoices" className="animate-in fade-in slide-in-from-right-4 duration-500">
               <DataTable 
                  columns={[
                    { header: 'Inv No', accessorKey: 'invoiceNo', cell: (item) => <span className="font-black text-navy">{item.invoiceNo}</span> },
                    { header: 'Date', accessorKey: 'date', cell: (item) => formatDate(item.date) },
                    { header: 'Total', accessorKey: 'total', cell: (item) => <span className="font-black text-brand">{formatCurrency(item.total)}</span> },
                    { header: 'Status', accessorKey: 'paymentStatus', cell: (item) => <StatusBadge status={item.paymentStatus} type="payment" /> },
                  ]}
                  data={invoices}
                  searchPlaceholder="Filter invoices..."
                  onView={(item) => router.push(`/invoices/${item.id}`)}
               />
            </TabsContent>
            
            <TabsContent value="payments" className="animate-in fade-in slide-in-from-right-4 duration-500">
               <DataTable 
                  columns={[
                    { header: 'Receipt Id', accessorKey: 'paymentId', cell: (item) => <span className="font-black text-navy">#{item.paymentId}</span> },
                    { header: 'Date', accessorKey: 'date', cell: (item) => formatDate(item.date) },
                    { header: 'Amount', accessorKey: 'amount', cell: (item) => <span className="font-black text-green-600">{formatCurrency(item.amount)}</span> },
                    { header: 'Method', accessorKey: 'mode', cell: (item) => <span className="uppercase text-[10px] font-black text-gray-500">{item.mode}</span> },
                  ]}
                  data={payments}
                  searchPlaceholder="Filter payments..."
               />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
