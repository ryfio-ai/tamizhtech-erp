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
         <Link href={`/clients/${row.clientId || ""}`} className="font-medium text-brand hover:underline">
            {row.clientName || "Client"}
         </Link>
      )
    },
    {
      header: "Date & Time",
      accessorKey: "date",
      sortable: true,
      cell: (row) => (
        <span className={row.status === 'Overdue' ? 'text-red-600 font-medium' : 'text-gray-600'}>
          {formatDate(row.date)} {row.time ? `at ${row.time}` : ""}
        </span>
      )
    },
    {
      header: "Mode",
      accessorKey: "mode",
      cell: (row) => <StatusBadge status={row.mode} />
    },
    {
      header: "Summary",
      accessorKey: "summary",
      cell: (row) => (
        <div className="max-w-[250px] truncate" title={row.summary || row.notes || ""}>
          {row.summary || row.notes || "-"}
        </div>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} />
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

  const renderMobileCard = (item: FollowUp) => (
    <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/clients/${item.clientId || ""}`} className="font-bold text-base text-brand hover:underline">
            {item.clientName || "Client"}
          </Link>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={item.status === 'Overdue' ? 'text-red-600 font-semibold text-xs' : 'text-gray-600 text-xs'}>
              {formatDate(item.date)} {item.time ? `at ${item.time}` : ""}
            </span>
            <StatusBadge status={item.mode} />
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <p className="text-xs text-ink-secondary leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-border/60">
        {item.summary || item.notes || "No summary provided"}
      </p>

      <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap">
        {item.status !== 'Done' && onMarkDone && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMarkDone(item)}
            className="h-9 px-3 text-xs text-green-700 border-green-200 hover:bg-green-50 gap-1.5 flex-1 min-h-[40px]"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark Done
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(item)}
          className="h-9 px-3 text-xs text-ink-primary flex-1 min-h-[40px]"
        >
          Edit
        </Button>
      </div>
    </div>
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      searchKey="clientName,summary" 
      searchPlaceholder="Search client or summary..."
      onEdit={onEdit}
      onDelete={onDelete}
      renderMobileCard={renderMobileCard}
      emptyTitle="No Follow-ups Scheduled"
      emptyDesc="Keep track of your leads and tasks by scheduling a follow-up."
    />
  );
}
