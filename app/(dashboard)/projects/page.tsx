"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, CheckCircle2, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ResponsiveDrawer } from "@/components/shared/ResponsiveDrawer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Progress } from "@/components/ui/progress";

interface Task {
  id: string;
  title: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  client?: { name: string };
  tasks?: Task[];
}

const PROJECT_STATUSES = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Project State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit Project State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    status: "PLANNING",
  });
  const [editSaving, setEditSaving] = useState(false);

  // Delete Confirmation
  const [deleteData, setDeleteData] = useState<{ open: boolean; project: Project | null; loading: boolean }>({
    open: false,
    project: null,
    loading: false,
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (json.success) {
        setProjects(json.data || []);
      }
    } catch {
      toast.error("Network error fetching projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          status: "PLANNING",
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Project created successfully");
        setIsDrawerOpen(false);
        setNewProjectName("");
        fetchProjects();
      } else {
        toast.error(json.error || "Failed to create project");
      }
    } catch {
      toast.error("Network error creating project");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setEditFormData({
      name: p.name,
      status: p.status || "PLANNING",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editFormData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          status: editFormData.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Project updated successfully");
        setEditingProject(null);
        fetchProjects();
      } else {
        toast.error(json.error || "Failed to update project");
      }
    } catch {
      toast.error("Network error updating project");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteData.project) return;
    setDeleteData((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/projects/${deleteData.project.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Project deleted successfully");
        setDeleteData({ open: false, project: null, loading: false });
        fetchProjects();
      } else {
        toast.error(json.error || "Failed to delete project");
        setDeleteData((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      toast.error("Network error deleting project");
      setDeleteData((prev) => ({ ...prev, loading: false }));
    }
  };

  if (loading) return <LoadingSkeleton type="page" />;

  const activeCount = projects.filter((p) => (p.status || "").toUpperCase() === "ACTIVE").length;
  const completedCount = projects.filter((p) => (p.status || "").toUpperCase() === "COMPLETED").length;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Projects"
        description="Track robotics milestones, engineering development, and task deadlines."
        actionLabel="New Project"
        onAction={() => setIsDrawerOpen(true)}
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total Projects"
          value={projects.length}
          subtitle="All engineering jobs"
          icon={Briefcase}
        />

        <StatCard
          title="In Progress"
          value={activeCount}
          subtitle="Currently active robotics work"
          icon={CheckCircle2}
          badgeVariant="success"
        />

        <StatCard
          title="Completed"
          value={completedCount}
          subtitle="Successfully delivered"
          icon={CheckCircle2}
        />
      </div>

      {/* 3. Project Cards Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const tasks = project.tasks || [];
            const done = tasks.filter((t) => t.status === "DONE").length;
            const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

            return (
              <div
                key={project.id}
                className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4 hover:border-brand/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-ink-primary text-base leading-snug">
                      {project.name}
                    </h3>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      Client: {project.client?.name || "TamizhTech Internal"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={project.status || "PLANNING"} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(project)}
                      className="h-7 w-7 p-0 text-ink-muted hover:text-ink-primary"
                      title="Edit Project"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteData({ open: true, project, loading: false })}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-ink-secondary">
                    <span>Task Progress</span>
                    <span className="font-semibold text-ink-primary">
                      {done}/{tasks.length} ({progress}%)
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-ink-secondary">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : "No deadline"}
                  </span>

                  <button
                    onClick={() => openEdit(project)}
                    className="font-medium text-brand hover:underline cursor-pointer"
                  >
                    Edit & Update →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No active projects"
          description="Create your first robotics engineering or automation project."
          actionLabel="New Project"
          onAction={() => setIsDrawerOpen(true)}
        />
      )}

      {/* 4. Create Project Drawer */}
      <ResponsiveDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title="Create New Project"
        description="Initialize a new robotics development or customer engineering project."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Autonomous Mobile Robot (AMR) v2"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              className="h-11 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 px-6 text-xs font-semibold shadow-sm"
            >
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 5. Edit Project Drawer */}
      <ResponsiveDrawer
        open={!!editingProject}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null);
        }}
        title={`Edit: ${editingProject?.name || ""}`}
        description="Update project name and current lifecycle status."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full h-11 px-3.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Status *
            </label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              className="w-full h-11 px-3 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              {PROJECT_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingProject(null)}
              className="h-11 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editSaving}
              className="h-11 px-6 text-xs font-semibold shadow-sm"
            >
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>

      {/* 6. Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteData.open}
        onOpenChange={(open) => setDeleteData((prev) => ({ ...prev, open }))}
        title={`Delete "${deleteData.project?.name || "Project"}"?`}
        description="Are you sure you want to delete this project and its related tasks? This action cannot be undone."
        loading={deleteData.loading}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
