"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useClients } from "@/hooks/useClients";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientForm } from "@/components/clients/ClientForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ResponsiveDrawer } from "@/components/shared/ResponsiveDrawer";
import { PageHeader } from "@/components/shared/PageHeader";
import { Client } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { toast } from "sonner";

function ClientsContent() {
  const { clients, loading, fetchClients, createClient, updateClient, deleteClient } = useClients();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteData, setDeleteData] = useState<{ open: boolean; client: Client | null; loading: boolean }>({
    open: false,
    client: null,
    loading: false,
  });

  useEffect(() => {
    fetchClients();
    if (searchParams.get("new") === "true") {
      setIsFormOpen(true);
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
    } catch (e: any) {
      if (e.code === 'DUPLICATE_MOBILE') {
        if (e.existingClient?.id) {
          toast.error("Customer already exists with this mobile number.", {
            action: {
              label: "View Existing Customer",
              onClick: () => {
                setIsFormOpen(false);
                router.push(`/clients/${e.existingClient.id}`);
              },
            },
            duration: 8000,
          });
        } else {
          toast.error(e.message || "This mobile number is already linked to another customer.");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteData.client) return;
    setDeleteData((prev) => ({ ...prev, loading: true }));
    try {
      await deleteClient(deleteData.client.id);
      setDeleteData({ open: false, client: null, loading: false });
    } catch (e) {
      setDeleteData((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Standard Page Header */}
      <PageHeader
        title="Customers"
        description="Manage customer contact information, billing profiles, and relationship history."
        actionLabel="Add Customer"
        onAction={() => {
          setEditingClient(null);
          setIsFormOpen(true);
        }}
      />

      {/* 2. Customer Table & Mobile Cards */}
      <ClientTable
        data={clients}
        loading={loading}
        onEdit={(client) => {
          setEditingClient(client);
          setIsFormOpen(true);
        }}
        onDelete={(client) => setDeleteData({ open: true, client, loading: false })}
      />

      {/* 3. Mobile Sheet / Desktop Modal Container (No Modal Overload) */}
      <ResponsiveDrawer
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingClient(null);
        }}
        title={editingClient ? "Edit Customer" : "Add Customer"}
        description={
          editingClient
            ? "Update contact and commercial details for this customer."
            : "Enter details to create a new customer record."
        }
      >
        <ClientForm
          initialData={
            editingClient
              ? {
                  ...editingClient,
                  city: editingClient.city || undefined,
                  serviceType: editingClient.serviceType || undefined,
                  source: editingClient.source || undefined,
                  assignedToId: editingClient.assignedToId || undefined,
                  company: editingClient.company || undefined,
                  notes: editingClient.notes || undefined,
                }
              : undefined
          }
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingClient(null);
          }}
          isLoading={saving}
        />
      </ResponsiveDrawer>

      {/* 4. Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteData.open}
        onOpenChange={(open) => setDeleteData((prev) => ({ ...prev, open }))}
        title="Delete Customer?"
        description={`Are you sure you want to delete ${deleteData.client?.name}? This action cannot be undone.`}
        destructive={true}
        loading={deleteData.loading}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton type="table" />}>
      <ClientsContent />
    </Suspense>
  );
}
