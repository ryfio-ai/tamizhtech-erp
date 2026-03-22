"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationSchema, ApplicationFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";

interface ApplicationFormProps {
  initialData?: ApplicationFormValues;
  onSubmit: (data: ApplicationFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function ApplicationForm({ initialData, onSubmit, onCancel, isLoading }: ApplicationFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
      city: "",
      appliedFor: "",
      source: "Manual Entry",
      notes: ""
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-full">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <h2 className="text-xl font-bold text-navy">
            {initialData ? "Edit Lead Details" : "Capture New Lead"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-gray-400 hover:text-gray-600 rounded-full h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name *</label>
                <Input {...register("name")} placeholder="Enter name" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm opacity-50">+91</span>
                  <Input {...register("phone")} placeholder="1234567890" className="pl-10" maxLength={10} />
                </div>
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address *</label>
                <Input type="email" {...register("email")} placeholder="client@example.com" />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">City / Location *</label>
                <Input {...register("city")} placeholder="e.g. Coimbatore" />
                {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Interested In (Program/Service) *</label>
                <select 
                  {...register("appliedFor")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="">Select interest...</option>
                  <option value="Robotics Workshop">Robotics Workshop</option>
                  <option value="Arduino Training">Arduino Training</option>
                  <option value="IoT Project">IoT Project</option>
                  <option value="Drone Training">Drone Training</option>
                  <option value="Internship">Internship</option>
                  <option value="Custom Project">Custom Project</option>
                  <option value="Tamizh Robotics Club">Tamizh Robotics Club</option>
                </select>
                {errors.appliedFor && <p className="text-xs text-red-500">{errors.appliedFor.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Source *</label>
                <Input {...register("source")} placeholder="e.g. Website, Referral, Walk-in" />
                {errors.source && <p className="text-xs text-red-500">{errors.source.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Notes / Requirements</label>
                <textarea 
                  {...register("notes")}
                  rows={3}
                  placeholder="Any specific project details or requirements..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
                />
              </div>

            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-brand hover:bg-brand-dark min-w-[150px]">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isLoading ? "Saving..." : "Save Lead"}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
