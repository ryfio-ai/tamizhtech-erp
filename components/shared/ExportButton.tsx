"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as xlsx from "xlsx";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: { header: string; key: string }[];
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  
  const getFormattedData = () => {
    if (!columns) return data;
    return data.map(item => {
      const formatted: any = {};
      columns.forEach(col => {
        formatted[col.header] = item[col.key];
      });
      return formatted;
    });
  };

  const handleExportExcel = () => {
    const exportData = getFormattedData();
    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Data");
    xlsx.writeFile(workbook, `${filename}.xlsx`);
  };

  const handleExportCSV = () => {
    const exportData = getFormattedData();
    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const csv = xlsx.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data || data.length === 0) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Download className="w-4 h-4" />
        Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 bg-white hover:bg-gray-50 border-gray-200">
          <Download className="w-4 h-4 text-gray-500" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel}>
          Export as Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
