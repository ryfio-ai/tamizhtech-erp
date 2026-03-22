"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Calendar, CheckCircle2, Clock, MoreHorizontal, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  client: { name: string };
  tasks: Task[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (json.success) {
        setProjects(json.data);
      } else {
        toast.error(json.error || "Failed to fetch projects");
      }
    } catch (err) {
      toast.error("Network error fetching projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filtered = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.name.toLowerCase().includes(search.toLowerCase())
  );

  const getProgress = (tasks: Task[]) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === "COMPLETED").length;
    return Math.round((completed / tasks.length) * 100);
  };

  if (loading) return <LoadingSkeleton type="card" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Project Management</h1>
          <p className="text-sm text-gray-500">Track milestones, tasks, and client deliveries.</p>
        </div>
        <Button className="bg-brand text-white hover:bg-brand-dark gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search projects..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 border rounded-lg p-1 bg-gray-50">
          <Button variant="ghost" size="sm" className="bg-white shadow-sm"><LayoutGrid className="w-4 h-4 mr-2" /> Board</Button>
          <Button variant="ghost" size="sm" className="text-gray-400"><List className="w-4 h-4 mr-2" /> List</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((project) => (
          <div key={project.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Badge variant={
                  project.status === "COMPLETED" ? "success" : 
                  project.status === "ON_HOLD" ? "secondary" : "default"
                } className="mb-2">
                  {project.status.replace("_", " ")}
                </Badge>
                <h3 className="text-lg font-bold text-navy line-clamp-1">{project.name}</h3>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{project.client.name}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
            </div>

            <div className="space-y-4 flex-grow">
               <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                     <span className="text-gray-500">Progress</span>
                     <span className="text-navy">{getProgress(project.tasks)}%</span>
                  </div>
                  <Progress value={getProgress(project.tasks)} className="h-1.5" />
               </div>

               <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span>{project.tasks.filter(t => t.status === "COMPLETED").length}/{project.tasks.length} Tasks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{project.endDate ? new Date(project.endDate).toLocaleDateString() : "No deadline"}</span>
                  </div>
               </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
               <div className="flex -space-x-2">
                 {[1,2,3].map(i => (
                   <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                     {String.fromCharCode(64 + i)}
                   </div>
                 ))}
               </div>
               <Button variant="outline" size="sm" className="text-xs h-8">View Details</Button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
             <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
             <h3 className="text-lg font-semibold text-gray-900">No projects found</h3>
             <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your search filters or create a new project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
