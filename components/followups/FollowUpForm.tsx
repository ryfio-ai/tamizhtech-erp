'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { followUpSchema, FollowUpTypeEnum, FollowUpStatusEnum } from '@/lib/validations';
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
import { Loader2, Calendar, User, MessageSquare } from 'lucide-react';
import { Client } from '@/types';

type FollowUpFormValues = z.infer<typeof followUpSchema>;

interface FollowUpFormProps {
  initialData?: any;
  onSubmit: (data: FollowUpFormValues) => Promise<void>;
  loading?: boolean;
}

export default function FollowUpForm({ initialData, onSubmit, loading }: FollowUpFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(result => {
        if (result.success) setClients(result.data);
      })
      .finally(() => setClientsLoading(false));
  }, []);

  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: initialData || {
      clientId: '',
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      type: 'Call',
      notes: '',
      status: 'Pending',
    },
  });

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      form.setValue('clientName', selectedClient.name);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold text-navy">Select Client</FormLabel>
              <Select 
                onValueChange={(val) => {
                  field.onChange(val);
                  handleClientChange(val);
                }} 
                defaultValue={field.value}
                disabled={clientsLoading}
              >
                <FormControl>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder={clientsLoading ? "Loading..." : "Choose client"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-xl">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl">
                    {FollowUpTypeEnum.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {FollowUpStatusEnum.options.map((opt) => (
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
              <FormLabel className="font-bold text-navy">Agenda / Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="What is this follow-up about?" 
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
              initialData ? 'Update Schedule' : 'Schedule Follow-up'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
