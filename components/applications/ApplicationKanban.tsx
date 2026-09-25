"use client";

import { Application } from "@/types";
import { useState } from "react";
import { MoreHorizontal, UserCheck, CheckCircle2, XCircle, Trash2, Mail, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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
          <div key={col.id} className="min-w-[280px] sm:min-w-[300px] w-[280px] sm:w-[300px] shrink-0 bg-gray-50/50 rounded-xl border border-gray-200 shadow-sm flex flex-col max-h-[75vh] snap-center">
            
            <div className={`px-4 py-3 border-b flex justify-between items-center rounded-t-xl ${col.color}`}>
              <h3 className="font-bold text-sm tracking-wide uppercase">{col.title}</h3>
              <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{columnData.length}</span>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
               {columnData.map(app => (
                 <div key={app.id} className={`bg-white border rounded-lg p-4 shadow-sm relative group hover:shadow-md transition-shadow ${movingId === app.id ? 'opacity-50 grayscale' : 'border-gray-100'}`}>
                    
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-navy truncate pr-6" title={app.name}>{app.name}</h4>
                       
                       {/* Touch-Friendly Dropdown Menu */}
                       <div className="absolute top-2.5 right-2.5">
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <button
                               className="p-1.5 text-gray-400 hover:text-navy rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center"
                               title="Manage lead"
                             >
                               <MoreHorizontal className="w-5 h-5" />
                             </button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="w-44 bg-white shadow-xl border border-gray-200">
                             <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                               Move Stage
                             </DropdownMenuLabel>
                             {KANBAN_COLUMNS.filter(c => c.id !== app.status).map(c => (
                               <DropdownMenuItem
                                 key={c.id}
                                 onClick={() => handleStatusChange(app.id, c.id)}
                                 className="text-xs cursor-pointer text-gray-700"
                               >
                                 {c.title}
                               </DropdownMenuItem>
                             ))}
                             <DropdownMenuSeparator />
                             <DropdownMenuItem
                               onClick={() => onDelete(app)}
                               className="text-xs text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer flex items-center gap-1.5"
                             >
                               <Trash2 className="w-3.5 h-3.5" /> Delete Lead
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
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
                       <span>{app.appliedDate || app.createdAt ? new Date(app.appliedDate || app.createdAt || Date.now()).toLocaleDateString('en-GB') : '-'}</span>
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
