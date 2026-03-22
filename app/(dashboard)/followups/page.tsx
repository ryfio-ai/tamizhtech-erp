"use client";

import { useEffect, useState } from "react";
import { useFollowUps } from "@/hooks/useFollowUps";
import { useClients } from "@/hooks/useClients";
import { FollowUpTable } from "@/components/followups/FollowUpTable";
import { FollowUpForm } from "@/components/followups/FollowUpForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { ExportButton } from "@/components/shared/ExportButton";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, CheckCircle2 } from "lucide-react";
import { FollowUp } from "@/types";
import { toast } from "sonner";

export default function FollowUpsPage() {
  const { followUps, loading, fetchFollowUps, createFollowUp, updateFollowUp, deleteFollowUp, markAsDone } = useFollowUps();
  const { clients, fetchClients } = useClients();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FollowUp | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteData, setDeleteData] = useState<{ open: boolean; task: FollowUp | null; loading: boolean }>({
    open: false,
    task: null,
    loading: false
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  useEffect(() => {
    fetchFollowUps();
    fetchClients();
  }, [fetchFollowUps, fetchClients]);

  const handleFormSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editingTask) {
        await updateFollowUp(editingTask.id, data);
      } else {
        await createFollowUp(data);
      }
      setIsFormOpen(false);
      setEditingTask(null);
    } catch (e) {
      // Kept open on error
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteData.task) return;
    setDeleteData(prev => ({ ...prev, loading: true }));
    try {
      await deleteFollowUp(deleteData.task.id);
      setDeleteData({ open: false, task: null, loading: false });
    } catch (e) {
      setDeleteData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleMarkDone = async (task: FollowUp) => {
    try {
      await markAsDone(task.id, task);
      toast.success("Task marked as Done");
    } catch (e) {
      console.error(e);
    }
  }

  // Apply filters
  const filteredTasks = followUps.filter(f => {
    if (statusFilter && f.status !== statusFilter) return false;
    return true;
  });

  // Overdue count for metrics
  const overdueCount = followUps.filter(f => f.status === 'Overdue').length;

  const exportColumns = [
    { header: "Client Name", key: "clientName" },
    { header: "Date", key: "date" },
    { header: "Time", key: "time" },
    { header: "Mode", key: "mode" },
    { header: "Summary", key: "summary" },
    { header: "Status", key: "status" }
  ];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">CRM & Follow-ups</h1>
            <p className="text-sm text-gray-500">Track client interactions and upcoming tasks.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <span className="hidden sm:inline-flex px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 shadow-sm">
              {overdueCount} Overdue Tasks
            </span>
          )}
          <ExportButton data={filteredTasks} filename="TamizhTech_FollowUps" columns={exportColumns} />
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-brand hover:bg-brand-dark shadow-sm gap-2"
          >
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
         <div className="flex flex-wrap gap-4 items-center">
           <FilterDropdown 
             placeholder="All Statuses"
             value={statusFilter}
             onChange={setStatusFilter}
             options={[
               { label: 'Pending', value: 'Pending' },
               { label: 'Overdue', value: 'Overdue' },
               { label: 'Done', value: 'Done' }
               ]}
           />
           {(statusFilter) && (
             <Button variant="ghost" onClick={() => setStatusFilter("")} className="text-gray-500 text-sm">
               Clear Filters
             </Button>
           )}
         </div>

         {/* View toggles (can expand to proper calendar later if needed) */}
         <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode("table")} 
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === "table" ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              List View
            </button>
            <button 
              onClick={() => setViewMode("timeline")} 
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === "timeline" ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Timeline View
            </button>
         </div>
      </div>

      {/* Content Rendering based on ViewMode */}
      {viewMode === "table" ? (
        <FollowUpTable 
          data={filteredTasks} 
          loading={loading}
          onEdit={(task) => {
            setEditingTask(task);
            setIsFormOpen(true);
          }}
          onDelete={(task) => setDeleteData({ open: true, task, loading: false })}
          onMarkDone={handleMarkDone}
        />
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
          {loading ? (
             <div className="animate-pulse flex flex-col items-center justify-center h-full text-gray-400 py-20">Loading Timeline...</div>
          ) : filteredTasks.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 h-full py-20">
               <CalendarDays className="w-12 h-12 text-gray-200 mb-4" />
               <p className="text-sm">No follow-ups match criteria.</p>
             </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {filteredTasks.map((fu, idx) => (
                <div key={fu.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 mx-auto ${
                     fu.status === 'Done' ? 'bg-green-500' :
                     fu.status === 'Overdue' ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    {fu.status === 'Done' ? <CheckCircle2 className="w-5 h-5" /> : <CalendarDays className="w-4 h-4" />}
                  </div>
                  <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-lg border shadow-sm ${fu.status === 'Overdue' ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-navy">{fu.clientName}</span>
                      <time className={`text-xs font-bold ${fu.status === 'Overdue' ? 'text-red-600' : 'text-gray-400'}`}>{fu.date} | {fu.time}</time>
                    </div>
                    <div className="flex gap-2 items-center mb-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">{fu.mode}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        fu.status === 'Done' ? 'bg-green-100 text-green-700' :
                        fu.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>{fu.status}</span>
                    </div>
                    <p className="text-sm text-gray-700">{fu.summary}</p>
                    
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                       {fu.status !== 'Done' ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 -ml-2"
                            onClick={() => handleMarkDone(fu)}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Mark Done
                          </Button>
                       ) : (
                          <span className="text-sm text-gray-400 italic">Task completed</span>
                       )}
                       
                       <Button variant="link" size="sm" className="text-brand h-8" onClick={() => { setEditingTask(fu); setIsFormOpen(true); }}>
                         Edit
                       </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Forms & Dialogs */}
      {isFormOpen && (
        <FollowUpForm 
          initialData={editingTask || undefined} 
          clients={clients}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingTask(null);
          }}
          isLoading={saving}
        />
      )}

      <ConfirmDialog 
        open={deleteData.open}
        onOpenChange={(op) => setDeleteData(prev => ({ ...prev, open: op }))}
        title="Delete Task?"
        description={`Are you sure you want to delete this scheduled task for ${deleteData.task?.clientName}?`}
        onConfirm={handleConfirmDelete}
        loading={deleteData.loading}
      />

    </div>
  );
}
