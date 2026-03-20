'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applicationSchema, ApplicationStatusEnum } from '@/lib/validations';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

type ApplicationFormValues = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  initialData?: any;
  defaultStatus?: string;
  onSubmit: (data: ApplicationFormValues) => Promise<void>;
  loading?: boolean;
}

export default function ApplicationForm({ 
  initialData, 
  defaultStatus, 
  onSubmit, 
  loading 
}: ApplicationFormProps) {
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      phone: '',
      course: '',
      city: '',
      status: (defaultStatus as any) || 'Applied',
      notes: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Applicant Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Email</FormLabel>
                <FormControl>
                  <Input placeholder="john@example.com" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Phone</FormLabel>
                <FormControl>
                  <Input placeholder="9876543210" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="course"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Interested Course</FormLabel>
                <FormControl>
                  <Input placeholder="Robotics Advanced" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">City</FormLabel>
                <FormControl>
                  <Input placeholder="Coimbatore" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl">
                    {ApplicationStatusEnum.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold text-navy">Additional Remarks</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Notes from initial call, etc." 
                  className="rounded-xl min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-brand hover:bg-brand-dark text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-brand/20 transition-all min-w-[200px]"
          >
            {loading ? (
               <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
               initialData ? 'Update Lead' : 'Create Lead'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
