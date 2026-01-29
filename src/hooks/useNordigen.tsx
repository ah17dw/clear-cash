import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface NordigenInstitution {
  id: string;
  name: string;
  logo: string;
  countries: string[];
  transactionTotalDays: number;
}

async function callNordigen(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await supabase.functions.invoke("nordigen", {
    body: { action, ...params },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  return response.data;
}

export function useNordigenInstitutions(country: string = "GB") {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["nordigen-institutions", country],
    queryFn: async () => {
      const result = await callNordigen("list-institutions", { country });
      return result.institutions as NordigenInstitution[];
    },
    enabled: !!user,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  });
}

export function useCreateNordigenRequisition() {
  return useMutation({
    mutationFn: async ({ institutionId, redirectUri }: { 
      institutionId: string; 
      redirectUri: string;
    }) => {
      return await callNordigen("create-requisition", { institutionId, redirectUri });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCompleteNordigenRequisition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requisitionId, institutionName }: { 
      requisitionId: string;
      institutionName: string;
    }) => {
      return await callNordigen("complete-requisition", { requisitionId, institutionName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["synced-bank-accounts"] });
      toast.success("Bank account connected successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSyncNordigenAccounts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (connectionId: string) => {
      return await callNordigen("sync-accounts", { connectionId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["connected-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["synced-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["synced-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["savings-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      toast.success(`Synced ${data.accountsCount} accounts, ${data.transactionCount} transactions`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDisconnectNordigenBank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (connectionId: string) => {
      return await callNordigen("disconnect", { connectionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["synced-bank-accounts"] });
      toast.success("Bank disconnected");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
