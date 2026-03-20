'use client';

import { motion } from 'framer-motion';
import { Application } from '@/types';
import ApplicationCard from './ApplicationCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanColumnProps {
  title: string;
  status: string;
  applications: Application[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (status: string) => void;
}

export default function KanbanColumn({ 
  title, 
  status, 
  applications, 
  onView, 
  onDelete,
  onAdd 
}: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-[300px] h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
           <h3 className="text-sm font-black text-navy uppercase tracking-widest">{title}</h3>
           <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 border">
              {applications.length}
           </span>
        </div>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onAdd(status)}
            className="h-7 w-7 text-gray-400 hover:text-brand bg-white shadow-sm border rounded-lg"
        >
           <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 bg-gray-50/50 rounded-3xl p-4 border border-dashed border-gray-200 overflow-y-auto max-h-[calc(100vh-250px)]">
         {applications.map((app) => (
            <ApplicationCard 
                key={app.id} 
                application={app} 
                onView={onView} 
                onDelete={onDelete} 
            />
         ))}
         {applications.length === 0 && (
            <div className="h-24 border border-dashed rounded-2xl flex items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-widest italic">
               No Leads
            </div>
         )}
      </div>
    </div>
  );
}
