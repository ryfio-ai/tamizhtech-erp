'use client';

import { useEffect, useState } from 'react';
import { Plus, Calendar, Search, Filter, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
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
import FollowUpForm from '@/components/followups/FollowUpForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ExportButton from '@/components/shared/ExportButton';
import { FollowUp } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { isPast, parseISO } from 'date-fns';

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const fetchFollowUps = async () => {
    try {
      const res = await fetch('/api/followups');
      const result = await res.json();
      if (result.success) {
        setFollowups(result.data);
      }
    } catch (error) {
      toast.error("Failed to fetch follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleCreate = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Follow-up scheduled");
        setIsAddOpen(false);
        fetchFollowUps();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Follow-up marked as ${newStatus}`);
        fetchFollowUps();
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/followups/${deleteConfirm}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Follow-up deleted");
        fetchFollowUps();
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { 
      header: 'Client', 
      accessorKey: 'clientName',
      cell: (item: FollowUp) => (
        <span className="font-bold text-navy">{item.clientName}</span>
      )
    },
    { 
      header: 'Date & Time', 
      accessorKey: 'date',
      cell: (item: FollowUp) => (
        <div className="flex flex-col">
          <span className="font-bold text-navy">{formatDate(item.date)}</span>
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.time}</span>
        </div>
      )
    },
    { 
      header: 'Type', 
      accessorKey: 'type',
      cell: (item: FollowUp) => (
        <span className="text-[10px] font-black uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded border">{item.type}</span>
      )
    },
    { 
      header: 'Agenda', 
      accessorKey: 'notes',
      cell: (item: FollowUp) => (
        <span className="text-xs text-gray-400 italic truncate max-w-[200px]">{item.notes || 'No agenda set'}</span>
      )
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (item: FollowUp) => {
        const isOverdue = item.status === 'Pending' && isPast(parseISO(`${item.date}T${item.time}`));
        return (
          <div className="flex items-center space-x-2">
            <StatusBadge status={item.status} type="followup" />
            {isOverdue && (
               <div className="flex items-center text-red-500 font-black text-[8px] uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded border border-red-100 animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
               </div>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight">Follow-up Schedules</h1>
          <p className="text-gray-500 font-medium">Never miss a client interaction or robotics workshop followup.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <ExportButton data={followups} filename="TamizhTech_FollowUps" />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand hover:bg-brand-dark text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-brand/20 transition-all">
                <Plus className="mr-2 h-5 w-5" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-3xl border-0 shadow-2xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-navy tracking-tight">Schedule New Interaction</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <FollowUpForm onSubmit={handleCreate} loading={submitting} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={followups} 
        loading={loading}
        onEdit={(item) => handleStatusUpdate(item.id, 'Completed')}
        onDelete={(item) => setDeleteConfirm(item.id)}
        searchPlaceholder="Filter by Client, Type, Notes..."
      />

      <ConfirmDialog 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={handleDelete}
        title="Remove Schedule?"
        description="Are you sure you want to delete this follow-up record?"
      />
    </div>
  );
}
