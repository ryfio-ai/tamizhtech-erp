"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, ClientFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

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
      phone: "",
      city: "",
      type: "INDIVIDUAL",
      serviceType: "Robotics Workshop",
      source: "Walk-in",
      status: "LEAD",
      notes: ""
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Full Name <span className="text-danger">*</span>
          </label>
          <Input 
            {...register("name")} 
            placeholder="e.g. Sankar S / ABC College" 
            className="h-10"
          />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Phone Number <span className="text-danger">*</span>
          </label>
          <Input 
            {...register("phone")} 
            placeholder="10-digit mobile number" 
            maxLength={10}
            className="h-10 font-mono text-sm"
          />
          {errors.phone && <p className="text-xs text-danger mt-1">{errors.phone.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Email Address <span className="text-danger">*</span>
          </label>
          <Input 
            {...register("email")} 
            type="email"
            placeholder="contact@client.com" 
            className="h-10"
          />
          {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            City / Location
          </label>
          <Input 
            {...register("city")} 
            placeholder="e.g. Coimbatore, Chennai" 
            className="h-10"
          />
          {errors.city && <p className="text-xs text-danger mt-1">{errors.city.message}</p>}
        </div>

        {/* Customer Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Customer Type
          </label>
          <select 
            {...register("type")}
            className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink-primary shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="INDIVIDUAL">Individual Student / Maker</option>
            <option value="COLLEGE">College / University</option>
            <option value="CORPORATE">Corporate / Enterprise</option>
          </select>
          {errors.type && <p className="text-xs text-danger mt-1">{errors.type.message}</p>}
        </div>

        {/* Service Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Service / Interest
          </label>
          <select 
            {...register("serviceType")}
            className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink-primary shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="Robotics Workshop">Robotics Workshop</option>
            <option value="Arduino Training">Arduino Training</option>
            <option value="IoT Project">IoT Project</option>
            <option value="Drone Training">Drone Training</option>
            <option value="3D Printing">3D Printing</option>
            <option value="Laser Cutting">Laser Cutting</option>
            <option value="PCB Design & Fabrication">PCB Design & Fabrication</option>
            <option value="Custom Project">Custom Project</option>
            <option value="Tamizh Robotics Club">Tamizh Robotics Club</option>
            <option value="General Purchase">General Purchase / Product</option>
          </select>
          {errors.serviceType && <p className="text-xs text-danger mt-1">{errors.serviceType.message}</p>}
        </div>

        {/* Source */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Lead Source
          </label>
          <select 
            {...register("source")}
            className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink-primary shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="Walk-in">Walk-in</option>
            <option value="Referral">Referral</option>
            <option value="Online">Online</option>
            <option value="Social Media">Social Media</option>
            <option value="College">College</option>
            <option value="Event">Event</option>
            <option value="Website">Website Catalog</option>
          </select>
          {errors.source && <p className="text-xs text-danger mt-1">{errors.source.message}</p>}
        </div>

        {/* Status */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Customer Status
          </label>
          <select 
            {...register("status")}
            className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink-primary shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="LEAD">Lead / Inquiring</option>
            <option value="ACTIVE">Active Customer</option>
            <option value="INACTIVE">Inactive / Archived</option>
          </select>
          {errors.status && <p className="text-xs text-danger mt-1">{errors.status.message}</p>}
        </div>

        {/* Notes */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Internal Notes
          </label>
          <textarea 
            {...register("notes")}
            rows={3}
            placeholder="Special requirements, billing notes, or background context..."
            className="flex w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink-primary shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={isLoading}
          className="h-10 px-4 min-w-[90px]"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="h-10 px-5 min-w-[130px] bg-brand hover:bg-brand-dark text-white font-medium shadow-xs"
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isLoading ? "Saving..." : initialData ? "Update Customer" : "Save Customer"}
        </Button>
      </div>
    </form>
  );
}
