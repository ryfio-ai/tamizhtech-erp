"use client";

import { useState, useCallback } from "react";
import { FollowUp } from "@/types";
import { toast } from "sonner";
import { FollowUpFormValues } from "@/lib/validations";

export function useFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/followups');
      const json = await res.json();
      if (json.success && json.data) {
        setFollowUps(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch follow-ups");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFollowUp = async (data: FollowUpFormValues) => {
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setFollowUps(prev => {
        const next = [json.data, ...prev];
        return next.sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      });
      toast.success("Follow-up task scheduled");
      return json.data as FollowUp;
    } catch (err: any) {
      toast.error(`Failed to schedule: ${err.message}`);
      throw err;
    }
  };

  const updateFollowUp = async (id: string, data: FollowUpFormValues) => {
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setFollowUps(prev => prev.map(f => f.id === id ? json.data : f));
      toast.success("Task updated");
      return json.data as FollowUp;
    } catch (err: any) {
      toast.error(`Failed to update task: ${err.message}`);
      throw err;
    }
  };

  const deleteFollowUp = async (id: string) => {
    try {
      const res = await fetch(`/api/followups/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setFollowUps(prev => prev.filter(f => f.id !== id));
      toast.success("Follow-up task removed");
      return true;
    } catch (err: any) {
      toast.error(`Error deleting task: ${err.message}`);
      throw err;
    }
  };

  const markAsDone = async (id: string, currentData: FollowUp) => {
    try {
       await updateFollowUp(id, {
         clientId: currentData.clientId,
         date: currentData.date,
         time: currentData.time,
         mode: currentData.mode,
         summary: currentData.summary,
         nextAction: currentData.nextAction,
         status: 'Done'
       });
    } catch (e) {
       console.error(e);
    }
  };

  return {
    followUps,
    loading,
    error,
    fetchFollowUps,
    createFollowUp,
    updateFollowUp,
    deleteFollowUp,
    markAsDone
  };
}
