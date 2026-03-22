'use client';

import { Card, CardContent } from '@/components/ui/card';
import { User, Phone, MapPin, Calendar, MoreVertical, ExternalLink } from 'lucide-react';
import { Application } from '@/types';
import { formatDate } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ApplicationCardProps {
  application: Application;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ApplicationCard({ application, onView, onDelete }: ApplicationCardProps) {
  return (
    <div className="mb-4 animate-in fade-in zoom-in duration-200">
      <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl bg-white overflow-hidden group cursor-grab active:cursor-grabbing border-l-4 border-l-brand hover:-translate-y-1">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
             <div>
                <h4 className="font-black text-navy text-sm tracking-tight group-hover:text-brand transition-colors">{application.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{application.course}</p>
             </div>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-300">
                      <MoreVertical className="h-4 w-4" />
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                   <DropdownMenuItem onClick={() => onView(application.id)} className="font-bold text-xs"><ExternalLink className="mr-2 h-3 w-3" /> View Details</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => onDelete(application.id)} className="font-bold text-xs text-red-500 hover:text-red-600"><MoreVertical className="mr-2 h-3 w-3" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          </div>

          <div className="space-y-2">
             <div className="flex items-center text-[10px] text-gray-500 font-medium">
                <Phone className="h-3 w-3 mr-2 text-brand/50" /> {application.phone}
             </div>
             <div className="flex items-center text-[10px] text-gray-500 font-medium">
                <MapPin className="h-3 w-3 mr-2 text-brand/50" /> {application.city}
             </div>
             <div className="flex items-center text-[10px] text-gray-500 font-medium">
                <Calendar className="h-3 w-3 mr-2 text-brand/50" /> {formatDate(application.createdAt)}
             </div>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-dashed">
             <StatusBadge status={application.status} type="application" />
             <div className="flex -space-x-2">
                <div className="h-5 w-5 rounded-full bg-navy border border-white flex items-center justify-center text-[8px] text-white font-bold">TT</div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
