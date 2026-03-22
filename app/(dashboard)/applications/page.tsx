"use client";

import { useEffect, useState } from "react";
import { useApplications } from "@/hooks/useApplications";
import { ApplicationKanban } from "@/components/applications/ApplicationKanban";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { Button } from "@/components/ui/button";
import { Plus, Users, Send } from "lucide-react";
import { Application } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ApplicationsPage() {
  const router = useRouter();
  const { applications, loading, fetchApplications, createApplication, updateApplicationStatus, deleteApplication } = useApplications();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteData, setDeleteData] = useState<{ open: boolean; app: Application | null; loading: boolean }>({
    open: false,
    app: null,
    loading: false
  });

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleFormSubmit = async (data: any) => {
    setSaving(true);
    try {
      await createApplication(data);
      setIsFormOpen(false);
    } catch (e) {
      // Kept open on error
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteData.app) return;
    setDeleteData(prev => ({ ...prev, loading: true }));
    try {
      await deleteApplication(deleteData.app.id);
      setDeleteData({ open: false, app: null, loading: false });
    } catch (e) {
      setDeleteData(prev => ({ ...prev, loading: false }));
    }
  };

  // Convert to Client
  const handleConvertToClient = (app: Application) => {
    // Navigate to new client form with prefilled URL params
    const params = new URLSearchParams({
      name: app.name,
      email: app.email,
      phone: app.phone,
      city: app.city,
      service: app.appliedFor,
      source: app.source || 'Website'
    });
    
    // Auto mark as Contacted/Enrolled on conversion
    if (app.status === 'New') updateApplicationStatus(app.id, 'Contacted');
    
    // Open clients page overlay or just navigate to clients where form takes params.
    // For our current simplified setup, we'll route to clients list with auto-open trigger via params
    toast.success("Redirecting to create client profile...");
    router.push(`/clients?action=new&${params.toString()}`);
  };

  const handleBroadcastEmail = () => {
    toast.info("Email broadcasting will be featured in Step 15.");
  };

  const exportColumns = [
    { header: "App No", key: "applicationNo" },
    { header: "Name", key: "name" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phone" },
    { header: "City", key: "city" },
    { header: "Applied For", key: "appliedFor" },
    { header: "Status", key: "status" },
    { header: "Source", key: "source" },
    { header: "Date", key: "appliedDate" }
  ];

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Applications & Leads</h1>
            <p className="text-sm text-gray-500">Pipeline to track incoming inquiries and registrations.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={applications} filename="TamizhTech_Leads" columns={exportColumns} />
          <Button 
            variant="outline"
            className="text-gray-700 gap-2 border-gray-200 shadow-sm"
            onClick={handleBroadcastEmail}
          >
            <Send className="w-4 h-4 text-brand" /> Blast Email
          </Button>
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-brand hover:bg-brand-dark shadow-sm gap-2"
          >
            <Plus className="w-4 h-4" /> Capture Lead
          </Button>
        </div>
      </div>

      {/* Main Kanban Board */}
      <div className="w-full relative mt-8">
        {loading && applications.length === 0 ? (
          <div className="animate-pulse flex flex-col items-center justify-center h-[50vh] text-gray-400 py-20">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading Pipeline...
          </div>
        ) : (
          <ApplicationKanban 
             data={applications} 
             onStatusChange={updateApplicationStatus}
             onDelete={(app) => setDeleteData({ open: true, app, loading: false })}
             onConvertToClient={handleConvertToClient}
          />
        )}
      </div>

      {/* Forms & Dialogs */}
      {isFormOpen && (
        <ApplicationForm 
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
          isLoading={saving}
        />
      )}

      <ConfirmDialog 
        open={deleteData.open}
        onOpenChange={(op) => setDeleteData(prev => ({ ...prev, open: op }))}
        title="Delete Lead?"
        description={`Are you sure you want to delete lead for ${deleteData.app?.name}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        loading={deleteData.loading}
      />

    </div>
  );
}
