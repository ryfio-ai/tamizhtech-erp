"use client";

import { useState, useCallback } from "react";
import { Application } from "@/types";
import { toast } from "sonner";
import { ApplicationFormValues } from "@/lib/validations";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/applications');
      const json = await res.json();
      if (json.success && json.data) {
        setApplications(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch applications");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createApplication = async (data: ApplicationFormValues) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setApplications(prev => [json.data, ...prev]);
      toast.success("Application successfully captured");
      return json.data as Application;
    } catch (err: any) {
      toast.error(`Failed to capture application: ${err.message}`);
      throw err;
    }
  };

  const updateApplicationStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setApplications(prev => prev.map(a => a.id === id ? json.data : a));
      toast.success(`Applicant moved to ${newStatus}`);
      return json.data as Application;
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message}`);
      throw err;
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setApplications(prev => prev.filter(a => a.id !== id));
      toast.success("Application deleted");
      return true;
    } catch (err: any) {
      toast.error(`Error deleting application: ${err.message}`);
      throw err;
    }
  };

  return {
    applications,
    loading,
    error,
    fetchApplications,
    createApplication,
    updateApplicationStatus,
    deleteApplication
  };
}
