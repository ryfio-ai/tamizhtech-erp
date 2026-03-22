import { Client } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
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
      header: "Name",
      accessorKey: "name",
      cell: (row) => (
         <div className="font-medium text-navy">{row.name}</div>
      )
    },
    {
      header: "Phone",
      accessorKey: "phone",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "City",
      accessorKey: "city",
    },
    {
      header: "Service",
      accessorKey: "serviceType",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} type="client" />
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => (
        <span className="text-gray-500 text-xs text-nowrap">
          {row.createdAt ? format(new Date(row.createdAt), 'dd-MMM-yyyy') : 'N/A'}
        </span>
      )
    }
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      searchKey="name,phone,email,city" 
      searchPlaceholder="Search name, phone, email, city..."
      onView={(client) => router.push(`/clients/${client.id}`)}
      onEdit={onEdit}
      onDelete={onDelete}
      emptyTitle="No Clients Found"
      emptyDesc="Get started by adding your first client to the system."
    />
  );
}
