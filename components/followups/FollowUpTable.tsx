"use client";

import { FollowUp } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FollowUpTableProps {
  data: FollowUp[];
  loading: boolean;
  onEdit: (followUp: FollowUp) => void;
  onDelete: (followUp: FollowUp) => void;
  onMarkDone?: (followUp: FollowUp) => void;
}

export function FollowUpTable({ data, loading, onEdit, onDelete, onMarkDone }: FollowUpTableProps) {

  const columns: ColumnDef<FollowUp>[] = [
    {
      header: "Client",
      accessorKey: "clientName",
      cell: (row) => (
         <Link href={`/clients/${row.clientId}`} className="font-medium text-brand hover:underline">
            {row.clientName}
         </Link>
      )
    },
    {
      header: "Date & Time",
      accessorKey: "date",
      sortable: true,
      cell: (row) => (
        <span className={row.status === 'Overdue' ? 'text-red-600 font-medium' : 'text-gray-600'}>
          {formatDate(row.date)} at {row.time}
        </span>
      )
    },
    {
      header: "Mode",
      accessorKey: "mode",
      cell: (row) => <StatusBadge status={row.mode} type="followup" />
    },
    {
      header: "Summary",
      accessorKey: "summary",
      cell: (row) => (
        <div className="max-w-[250px] truncate" title={row.summary}>
          {row.summary}
        </div>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} type="followup" />
    },
    {
      header: "Quick Action",
      accessorKey: "status",
      sortable: false,
      cell: (row) => {
        if (row.status === 'Done') return null;
        return (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onMarkDone && onMarkDone(row); }}
            className="h-8 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Done
          </Button>
        );
      }
    }
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      searchKey="clientName,summary" 
      searchPlaceholder="Search client or summary..."
      onEdit={onEdit}
      onDelete={onDelete}
      emptyTitle="No Follow-ups Scheduled"
      emptyDesc="Keep track of your leads and tasks by scheduling a follow-up."
    />
  );
}
