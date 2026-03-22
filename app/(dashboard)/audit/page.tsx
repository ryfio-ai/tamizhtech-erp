"use client";

import { useEffect, useState } from "react";
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Activity, 
  User as UserIcon, 
  Clock,
  ArrowRight
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState("activity");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?type=${activeTab}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error("Fetch Logs Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.module.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <History className="w-8 h-8 text-indigo-600" />
            System Audit Logs
          </h1>
          <p className="text-slate-500 mt-1">Track all system activities and data modifications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Activity className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Activities</p>
                <p className="text-2xl font-bold text-slate-900">{activeTab === 'activity' ? logs.length : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Data Audits</p>
                <p className="text-2xl font-bold text-slate-900">{activeTab === 'audit' ? logs.length : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Last Action</p>
                <p className="text-sm font-bold text-slate-900">
                  {logs[0] ? format(new Date(logs[0].createdAt), 'MMM d, h:mm a') : 'No logs'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b pb-8">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <Tabs 
              defaultValue="activity" 
              className="w-full md:w-auto"
              onValueChange={setActiveTab}
            >
              <TabsList className="bg-slate-100">
                <TabsTrigger value="activity" className="data-[state=active]:bg-white">Activity Logs</TabsTrigger>
                <TabsTrigger value="audit" className="data-[state=active]:bg-white">Data Changes</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search logs..." 
                className="pl-10 h-10 border-slate-200 focus:ring-indigo-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[200px]">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                      No logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-600">
                        {format(new Date(log.createdAt), "MMM d, yyyy • HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                            {log.user?.image ? (
                              <img src={log.user.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{log.user?.name || "System"}</p>
                            <p className="text-xs text-slate-500">{log.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium">
                          {log.module}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getActionColor(log.action)}`} />
                          <span className="font-medium text-slate-700 capitalize">
                            {log.action.toLowerCase().replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-slate-600 truncate" title={log.details || log.newData}>
                          {log.details || formatChanges(log.oldData, log.newData)}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getActionColor(action: string) {
  const a = action.toUpperCase();
  if (a.includes('CREATE') || a.includes('ADD')) return 'bg-emerald-500';
  if (a.includes('UPDATE') || a.includes('EDIT')) return 'bg-amber-500';
  if (a.includes('DELETE') || a.includes('REMOVE')) return 'bg-rose-500';
  return 'bg-indigo-500';
}

function formatChanges(oldData: any, newData: any) {
  if (!oldData && !newData) return "-";
  if (!oldData) return "New record created";
  if (!newData) return "Record deleted";
  
  try {
    const oldObj = JSON.parse(oldData);
    const newObj = JSON.parse(newData);
    const changes = Object.keys(newObj).filter(k => oldObj[k] !== newObj[k]);
    return `Modified: ${changes.join(", ")}`;
  } catch {
    return "Data modification";
  }
}
