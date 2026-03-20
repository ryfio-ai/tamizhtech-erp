'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, ArrowRight, User, Clock } from 'lucide-react';
import Link from 'next/link';
import { FollowUp } from '@/types';
import { formatDate } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';

interface UpcomingFollowUpsProps {
  followUps: FollowUp[];
}

export default function UpcomingFollowUps({ followUps }: UpcomingFollowUpsProps) {
  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center space-x-2">
          <CalendarClock className="h-5 w-5 text-brand" />
          <CardTitle className="text-lg font-bold text-navy tracking-tight">Upcoming Follow-ups</CardTitle>
        </div>
        <Link href="/followups">
          <Button variant="ghost" size="sm" className="text-xs font-bold text-brand hover:text-brand-dark transition-all">
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 px-2 pt-0">
        {followUps.length > 0 ? (
          <div className="space-y-1">
            {followUps.map((f) => (
              <div 
                key={f.id} 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-brand/10 group-hover:text-brand transition-all">
                     <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy truncate max-w-[150px]">{f.clientName}</h4>
                    <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      <Clock className="h-2.5 w-2.5 mr-1" /> {formatDate(f.date)} • {f.time}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                   <span className="text-[10px] font-bold text-brand uppercase">{f.mode}</span>
                   <StatusBadge status={f.status} type="followup" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <p className="text-sm font-bold uppercase tracking-widest">No upcoming follow-ups</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
