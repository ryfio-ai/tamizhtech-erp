'use client';

import { useEffect, useState } from 'react';
import { Plus, UserPlus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import ClientForm from '@/components/clients/ClientForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ExportButton from '@/components/shared/ExportButton';
import { Client } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const result = await res.json();
      if (result.success) {
        setClients(result.data);
      }
    } catch (error) {
      toast.error("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Client registered successfully");
        setIsAddOpen(false);
        fetchClients();
      } else {
        toast.error(result.error || "Failed to create client");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/clients/${deleteConfirm}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Client deleted successfully");
        fetchClients();
      } else {
        toast.error(result.error || "Failed to delete client");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { 
      header: 'Name', 
      accessorKey: 'name',
      cell: (item: Client) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
            {item.name.charAt(0)}
          </div>
          <span className="font-bold text-navy">{item.name}</span>
        </div>
      )
    },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Service', accessorKey: 'serviceType' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (item: Client) => <StatusBadge status={item.status} type="client" />
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight">Client Directory</h1>
          <p className="text-gray-500 font-medium">Manage and track all TamizhTech clients.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <ExportButton data={clients} filename="TamizhTech_Clients" />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand hover:bg-brand-dark text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-brand/20 transition-all">
                <UserPlus className="mr-2 h-5 w-5" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-2xl border-0 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-navy tracking-tight">Register New Client</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <ClientForm onSubmit={handleCreate} loading={submitting} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={clients} 
        loading={loading}
        onView={(item) => router.push(`/clients/${item.id}`)}
        onEdit={(item) => router.push(`/clients/${item.id}`)}
        onDelete={(item) => setDeleteConfirm(item.id)}
        searchPlaceholder="Filter clients by name, email, phone..."
      />

      <ConfirmDialog 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={handleDelete}
        title="Delete Client?"
        description="Are you sure you want to delete this client? This will remove all their data from the system."
      />
    </div>
  );
}
