"use client";

import { useEffect, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientForm } from "@/components/clients/ClientForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Client } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

export default function ClientsPage() {
  const { clients, loading, error, fetchClients, createClient, updateClient, deleteClient } = useClients();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteData, setDeleteData] = useState<{ open: boolean; client: Client | null; loading: boolean }>({
    open: false,
    client: null,
    loading: false
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  useEffect(() => {
    fetchClients();
    if (searchParams.get("new") === "true") {
      setIsFormOpen(true);
      // Clean up URL silently
      router.replace("/clients", { scroll: false });
    }
  }, []);

  const handleFormSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
      } else {
        await createClient(data);
      }
      setIsFormOpen(false);
      setEditingClient(null);
    } catch (e) {
      // Kept open on error
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteData.client) return;
    setDeleteData(prev => ({ ...prev, loading: true }));
    try {
      await deleteClient(deleteData.client.id);
      setDeleteData({ open: false, client: null, loading: false });
    } catch (e) {
      setDeleteData(prev => ({ ...prev, loading: false }));
    }
  };

  // Apply filters
  const filteredClients = clients.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (serviceFilter && c.serviceType !== serviceFilter) return false;
    return true;
  });

  const exportColumns = [
    { header: "Name", key: "name" },
    { header: "Phone", key: "phone" },
    { header: "Email", key: "email" },
    { header: "City", key: "city" },
    { header: "Service", key: "serviceType" },
    { header: "Source", key: "source" },
    { header: "Status", key: "status" },
    { header: "Joined On", key: "createdAt" }
  ];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Clients</h1>
            <p className="text-sm text-gray-500">Manage your students and business customers.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={filteredClients} filename="TamizhTech_Clients" columns={exportColumns} />
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-brand hover:bg-brand-dark shadow-sm gap-2"
          >
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
         <FilterDropdown 
           placeholder="All Statuses"
           value={statusFilter}
           onChange={setStatusFilter}
           options={[
             { label: 'Active', value: 'Active' },
             { label: 'Lead', value: 'Lead' },
             { label: 'Inactive', value: 'Inactive' },
             { label: 'Blacklisted', value: 'Blacklisted' }
           ]}
         />
         <FilterDropdown 
           placeholder="All Services"
           value={serviceFilter}
           onChange={setServiceFilter}
           options={[
             { label: 'Robotics Workshop', value: 'Robotics Workshop' },
             { label: 'Arduino Training', value: 'Arduino Training' },
             { label: 'IoT Project', value: 'IoT Project' },
             { label: 'Drone Training', value: 'Drone Training' },
             { label: 'Custom Project', value: 'Custom Project' },
             { label: 'Tamizh Robotics Club', value: 'Tamizh Robotics Club' }
           ]}
         />
         
         {(statusFilter || serviceFilter) && (
           <Button variant="ghost" onClick={() => { setStatusFilter(""); setServiceFilter(""); }} className="text-gray-500 text-sm">
             Clear Filters
           </Button>
         )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Table */}
      <ClientTable 
        data={filteredClients} 
        loading={loading}
        onEdit={(client) => {
          setEditingClient(client);
          setIsFormOpen(true);
        }}
        onDelete={(client) => setDeleteData({ open: true, client, loading: false })}
      />

      {/* Forms & Dialogs */}
      {isFormOpen && (
        <ClientForm 
          initialData={editingClient || undefined} 
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingClient(null);
          }}
          isLoading={saving}
        />
      )}

      <ConfirmDialog 
        open={deleteData.open}
        onOpenChange={(op) => setDeleteData(prev => ({ ...prev, open: op }))}
        title="Delete Client?"
        description={`Are you sure you want to delete ${deleteData.client?.name}? This action cannot be undone unless tied historical invoices block it.`}
        onConfirm={handleConfirmDelete}
        loading={deleteData.loading}
      />

    </div>
  );
}
