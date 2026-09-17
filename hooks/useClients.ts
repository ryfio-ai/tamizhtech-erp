"use client";

import { useState, useCallback } from "react";
import { Client } from "@/types";
import { toast } from "sonner";
import { ClientFormValues } from "@/lib/validations";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setClients(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch clients");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = async (data: ClientFormValues) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        const error: any = new Error(json.error || "Failed to save client");
        error.code = json.code;
        error.existingClient = json.existingClient;
        throw error;
      }
      
      setClients(prev => [json.data, ...prev]);
      toast.success("Customer saved successfully");
      return json.data;
    } catch (err: any) {
      if (err.code !== 'DUPLICATE_MOBILE') {
        toast.error(`Failed to save client: ${err.message}`);
      }
      throw err;
    }
  };

  const updateClient = async (id: string, data: ClientFormValues) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        const error: any = new Error(json.error || "Failed to update client");
        error.code = json.code;
        throw error;
      }
      
      setClients(prev => prev.map(c => c.id === id ? json.data : c));
      toast.success("Customer updated successfully");
      return json.data;
    } catch (err: any) {
      if (err.code !== 'DUPLICATE_MOBILE') {
        toast.error(`Failed to update client: ${err.message}`);
      }
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success("Client deleted successfully");
      return true;
    } catch (err: any) {
      toast.error(`Error deleting client: ${err.message}`);
      throw err;
    }
  };

  const getClientProfile = async (id: string) => {
     try {
       const res = await fetch(`/api/clients/${id}`);
       const json = await res.json();
       if(!json.success) throw new Error(json.error);
       return json.data as Client;
     } catch (err: any) {
       toast.error(err.message);
       throw err;
     }
  }

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    getClientProfile
  };
}
