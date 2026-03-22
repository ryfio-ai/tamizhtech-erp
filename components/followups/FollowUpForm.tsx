"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { followUpSchema, FollowUpFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { Client } from "@/types";

interface FollowUpFormProps {
  initialData?: FollowUpFormValues;
  clients: Client[];
  onSubmit: (data: FollowUpFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function FollowUpForm({ initialData, clients, onSubmit, onCancel, isLoading }: FollowUpFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: initialData || {
      clientId: "",
      date: new Date().toISOString().split('T')[0],
      time: "10:00",
      mode: "Call",
      summary: "",
      nextAction: "",
      status: "Pending"
    }
  });

  const activeClients = clients.filter(c => c.status !== 'Blacklisted' && c.status !== 'Inactive');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-full">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <h2 className="text-xl font-bold text-navy">
            {initialData ? "Edit Task" : "Schedule Follow-up"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-gray-400 hover:text-gray-600 rounded-full h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="grid grid-cols-1 gap-5">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Client *</label>
                <select 
                  {...register("clientId")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  disabled={!!initialData} // Lock client if editing
                >
                  <option value="">Select a client...</option>
                  {activeClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                  ))}
                </select>
                {errors.clientId && <p className="text-xs text-red-500">{errors.clientId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date *</label>
                  <Input type="date" {...register("date")} />
                  {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Time *</label>
                  <Input type="time" {...register("time")} />
                  {errors.time && <p className="text-xs text-red-500">{errors.time.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Contact Mode *</label>
                    <select 
                    {...register("mode")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="In-person">In-person</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select 
                    {...register("status")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                    <option value="Pending">Pending</option>
                    <option value="Done">Done</option>
                    <option value="Overdue">Overdue</option>
                    </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Task Summary *</label>
                <textarea 
                  {...register("summary")}
                  rows={2}
                  placeholder="e.g. Call to discuss the submitted quotation..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
                />
                {errors.summary && <p className="text-xs text-red-500">{errors.summary.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Next Action Goal (Optional)</label>
                <Input {...register("nextAction")} placeholder="e.g. Schedule meeting for Friday" />
              </div>

            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-brand hover:bg-brand-dark min-w-[120px]">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isLoading ? "Saving..." : "Save Task"}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
