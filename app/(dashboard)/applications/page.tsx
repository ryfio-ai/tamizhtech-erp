'use client';

import { useEffect, useState } from 'react';
import { Plus, LayoutGrid, Search, Filter, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import KanbanBoard from '@/components/applications/KanbanBoard';
import ApplicationForm from '@/components/applications/ApplicationForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Application } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('Applied');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const result = await res.json();
      if (result.success) {
        setApplications(result.data);
      }
    } catch (error) {
      toast.error("Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleCreate = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Lead created successfully");
        setIsAddOpen(false);
        fetchApplications();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/applications/${deleteId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Lead removed");
        fetchApplications();
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setDeleteId(null);
    }
  };

  const openAddWithStatus = (status: string) => {
    setDefaultStatus(status);
    setIsAddOpen(true);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight flex items-center">
             Admissions Kanban <Sparkles className="ml-2 h-5 w-5 text-brand" />
          </h1>
          <p className="text-gray-500 font-medium">Track and manage student applications and robotic leads.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setDefaultStatus('Applied')} className="bg-brand hover:bg-brand-dark text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-brand/20 transition-all">
                <Plus className="mr-2 h-5 w-5" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-3xl border-0 shadow-2xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-navy tracking-tight">New Admission Lead</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <ApplicationForm 
                  onSubmit={handleCreate} 
                  loading={submitting} 
                  defaultStatus={defaultStatus} 
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        {loading ? (
           <div className="flex space-x-6 h-full">
              {[1, 2, 3, 4].map((i) => (
                 <div key={i} className="flex-1 min-w-[300px] bg-gray-50 rounded-3xl p-4 border border-dashed animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
                    <div className="space-y-4">
                       <div className="h-32 bg-white rounded-2xl shadow-sm" />
                       <div className="h-32 bg-white rounded-2xl shadow-sm" />
                    </div>
                 </div>
              ))}
           </div>
        ) : (
          <KanbanBoard 
            applications={applications} 
            onView={(id) => router.push(`/applications/${id}`)}
            onDelete={(id) => setDeleteId(id)}
            onAdd={openAddWithStatus}
          />
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete}
        title="Remove Lead?"
        description="Are you sure you want to remove this lead from the tracking board?"
      />
    </div>
  );
}
