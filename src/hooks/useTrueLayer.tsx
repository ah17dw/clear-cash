import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface TrueLayerProvider {
  provider_id: string;
  display_name: string;
  logo_url?: string;
  country: string;
}

async function callTrueLayer(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await supabase.functions.invoke("truelayer", {
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

export function useTrueLayerProviders(country: string = "gb") {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["truelayer-providers", country],
    queryFn: async () => {
      const result = await callTrueLayer("list-providers", { country });
      return result.providers as TrueLayerProvider[];
    },
    enabled: !!user,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  });
}

export function useCreateTrueLayerAuthLink() {
  return useMutation({
    mutationFn: async ({ redirectUri, providerId }: { 
      redirectUri: string; 
      providerId?: string;
    }) => {
      return await callTrueLayer("create-auth-link", { redirectUri, providerId });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCompleteTrueLayerAuth() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ code, redirectUri, providerName }: { 
      code: string;
      redirectUri: string;
      providerName?: string;
    }) => {
      return await callTrueLayer("complete-auth", { code, redirectUri, providerName });
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

export function useSyncTrueLayerAccounts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (connectionId: string) => {
      return await callTrueLayer("sync-accounts", { connectionId });
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

export function useDisconnectTrueLayerBank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (connectionId: string) => {
      return await callTrueLayer("disconnect", { connectionId });
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
