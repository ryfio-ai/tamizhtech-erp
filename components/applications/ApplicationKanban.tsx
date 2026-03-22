"use client";

import { Application } from "@/types";
import { useState } from "react";
import { MoreHorizontal, UserRefresh, CheckCircle2, XCircle, Trash2, Mail, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApplicationKanbanProps {
  data: Application[];
  onStatusChange: (id: string, newStatus: string) => Promise<any>;
  onDelete: (app: Application) => void;
  onConvertToClient: (app: Application) => void;
}

const KANBAN_COLUMNS = [
  { id: 'New', title: 'New Leads', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'Contacted', title: 'Contacted', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { id: 'Waitlisted', title: 'Waitlisted', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'Enrolled', title: 'Enrolled/Converted', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'Rejected', title: 'Rejected/Lost', color: 'bg-gray-100 border-gray-300 text-gray-600' }
];

export function ApplicationKanban({ data, onStatusChange, onDelete, onConvertToClient }: ApplicationKanbanProps) {

  // Simple drag-and-drop state (or just click to move for now to keep reliable)
  const [movingId, setMovingId] = useState<string | null>(null);

  const handleStatusChange = async (appId: string, status: string) => {
    setMovingId(appId);
    await onStatusChange(appId, status);
    setMovingId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start snap-x">
      {KANBAN_COLUMNS.map(col => {
        const columnData = data.filter(d => d.status === col.id);
        
        return (
          <div key={col.id} className="min-w-[300px] w-[300px] shrink-0 bg-gray-50/50 rounded-xl border border-gray-200 shadow-sm flex flex-col max-h-[75vh] snap-center">
            
            <div className={`px-4 py-3 border-b flex justify-between items-center rounded-t-xl ${col.color}`}>
              <h3 className="font-bold text-sm tracking-wide uppercase">{col.title}</h3>
              <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{columnData.length}</span>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
               {columnData.map(app => (
                 <div key={app.id} className={`bg-white border rounded-lg p-4 shadow-sm relative group hover:shadow-md transition-shadow ${movingId === app.id ? 'opacity-50 grayscale' : 'border-gray-100'}`}>
                    
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-navy truncate pr-6" title={app.name}>{app.name}</h4>
                       
                       {/* Dropdown menu for status change - simulated with hover group for now */}
                       <div className="absolute top-3 right-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="relative group/menu">
                           <MoreHorizontal className="w-5 h-5 cursor-pointer hover:text-navy" />
                           <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-10 hidden group-hover/menu:block">
                             <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Move to</div>
                             {KANBAN_COLUMNS.filter(c => c.id !== app.status).map(c => (
                               <button 
                                 key={c.id} 
                                 onClick={() => handleStatusChange(app.id, c.id)}
                                 className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 text-gray-700"
                               >
                                 {c.title}
                               </button>
                             ))}
                             <div className="h-px bg-gray-100 my-1"></div>
                             <button onClick={() => onDelete(app)} className="w-full text-left px-4 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                               <Trash2 className="w-3.5 h-3.5" /> Delete
                             </button>
                           </div>
                         </div>
                       </div>
                    </div>

                    <div className="text-xs text-brand font-medium mb-3 truncate bg-brand/5 inline-flex px-2 py-0.5 rounded border border-brand/10">
                      {app.appliedFor}
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>+91 {app.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate" title={app.email}>{app.email}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 text-[10px] text-gray-400 flex justify-between items-center">
                       <span>{new Date(app.appliedDate).toLocaleDateString('en-GB')}</span>
                       {app.status !== 'Enrolled' && col.id !== 'Rejected' && (
                         <Button 
                           variant="outline" 
                           size="sm" 
                           className="h-6 text-[10px] px-2 gap-1"
                           onClick={() => onConvertToClient(app)}
                         >
                           <ExternalLink className="w-3 h-3" /> To Client
                         </Button>
                       )}
                    </div>
                 </div>
               ))}
               
               {columnData.length === 0 && (
                 <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-4">
                   No applications<br/>in this stage
                 </div>
               )}
            </div>

          </div>
        )
      })}
    </div>
  );
}
