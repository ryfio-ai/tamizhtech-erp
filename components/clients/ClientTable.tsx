"use client";

import React from "react";
import { Client } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, FilePlus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClientTableProps {
  data: Client[];
  loading: boolean;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function ClientTable({ data, loading, onEdit, onDelete }: ClientTableProps) {
  const router = useRouter();

  const columns: ColumnDef<Client>[] = [
    {
      header: "Customer",
      accessorKey: "name",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-ink-primary">{row.name}</div>
          {row.company && <div className="text-xs text-ink-secondary">{row.company}</div>}
        </div>
      ),
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: (row) => (
        <span className="text-ink-secondary font-mono text-xs">
          {row.phone || "-"}
        </span>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: (row) => (
        <span className="text-ink-secondary text-xs truncate max-w-[180px] block">
          {row.email || "-"}
        </span>
      ),
    },
    {
      header: "City",
      accessorKey: "city",
      sortable: true,
      cell: (row) => <span className="text-ink-secondary text-xs">{row.city || "Coimbatore"}</span>,
    },
    {
      header: "Outstanding",
      accessorKey: "id",
      sortable: true,
      cell: (row: any) => {
        const bal = Number(row.outstandingBalance) || 0;
        return (
          <span className={`font-semibold text-xs ${bal > 0 ? "text-red-600 font-bold" : "text-green-700"}`}>
            ₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusBadge status={row.status || "ACTIVE"} />,
    },
    {
      header: "Actions",
      accessorKey: "id",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link href={`/clients/${row.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-ink-secondary hover:text-ink-primary"
            >
              View
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(row)}
            className="h-8 px-2 text-xs text-ink-secondary hover:text-brand"
          >
            Edit
          </Button>
          <Link href={`/invoices/new?client=${row.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs text-brand hover:bg-brand-50 font-semibold"
            >
              + Bill
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  // Mobile App Card Transformation (< 768px)
  const renderMobileCard = (client: Client) => {
    const rawPhone = client.phone ? client.phone.replace(/[^0-9]/g, "") : "";
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    return (
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-ink-primary text-base leading-tight">{client.name}</h4>
            {client.company && (
              <p className="text-xs text-ink-secondary font-medium mt-0.5">{client.company}</p>
            )}
            <p className="text-xs text-ink-secondary mt-0.5">{client.city || "Coimbatore, Tamil Nadu"}</p>
          </div>
          <StatusBadge status={client.status || "ACTIVE"} />
        </div>

        {/* Outstanding Balance */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="text-ink-secondary">Outstanding Due</span>
          <span className={`font-bold text-sm ${((client as any).outstandingBalance || 0) > 0 ? "text-red-600" : "text-green-700"}`}>
            ₹{Number((client as any).outstandingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Quick Touch Actions: min 44px touch height */}
        <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {client.phone && (
              <>
                <a
                  href={`tel:${client.phone}`}
                  className="p-2.5 rounded-lg bg-surface border border-border text-ink-primary hover:text-brand hover:border-brand/40 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4" />
                </a>

                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  title="WhatsApp Customer"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </>
            )}

            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="p-2.5 rounded-lg bg-surface border border-border text-ink-primary hover:text-brand min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                title="Email Customer"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Link href={`/clients/${client.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs px-2.5 min-h-[44px]"
              >
                View
              </Button>
            </Link>
            <Link href={`/invoices/new?client=${client.id}`}>
              <Button size="sm" className="h-10 text-xs px-3 gap-1 min-h-[44px] bg-brand font-semibold">
                <FilePlus className="w-3.5 h-3.5" />
                <span>+ Bill</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="name,phone,email,city,company"
      searchPlaceholder="Search customers by name, phone, city..."
      loading={loading}
      emptyTitle="No customers yet"
      emptyDesc="Add your first customer to track quotes, orders, and invoices."
      renderMobileCard={renderMobileCard}
    />
  );
}
