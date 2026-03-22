"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, ClientFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";

interface ClientFormProps {
  initialData?: ClientFormValues;
  onSubmit: (data: ClientFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function ClientForm({ initialData, onSubmit, onCancel, isLoading }: ClientFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "+91",
      city: "",
      serviceType: "Robotics Workshop",
      source: "Walk-in",
      status: "Lead",
      notes: ""
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <h2 className="text-xl font-bold text-navy">
            {initialData ? "Edit Client" : "Add New Client"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-gray-400 hover:text-gray-600 rounded-full h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name *</label>
                <Input {...register("name")} placeholder="Sankar S" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                <Input {...register("phone")} placeholder="9876543210" />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address *</label>
                <Input {...register("email")} placeholder="client@example.com" />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">City *</label>
                <Input {...register("city")} placeholder="Coimbatore" />
                {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
              </div>

              {/* Service Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Service Type *</label>
                <select 
                  {...register("serviceType")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="Robotics Workshop">Robotics Workshop</option>
                  <option value="Arduino Training">Arduino Training</option>
                  <option value="IoT Project">IoT Project</option>
                  <option value="Drone Training">Drone Training</option>
                  <option value="Custom Project">Custom Project</option>
                  <option value="Tamizh Robotics Club">Tamizh Robotics Club</option>
                </select>
                {errors.serviceType && <p className="text-xs text-red-500">{errors.serviceType.message}</p>}
              </div>

              {/* Source */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Lead Source *</label>
                <select 
                  {...register("source")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="Walk-in">Walk-in</option>
                  <option value="Referral">Referral</option>
                  <option value="Online">Online</option>
                  <option value="Social Media">Social Media</option>
                  <option value="College">College</option>
                  <option value="Event">Event</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select 
                  {...register("status")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="Lead">Lead</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
              </div>

            </div>

            {/* Notes */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-gray-700">Internal Notes</label>
              <textarea 
                {...register("notes")}
                rows={3}
                placeholder="Any special requirements..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-brand hover:bg-brand-dark min-w-[120px]">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isLoading ? "Saving..." : "Save Client"}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
