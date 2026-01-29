import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ConnectedBankAccount {
  id: string;
  user_id: string;
  institution_id: string;
  institution_name: string;
  consent_expires_at: string | null;
  last_synced_at: string | null;
  status: string;
  created_at: string;
  provider: string;
  requisition_id: string | null;
}

export interface SyncedBankAccount {
  id: string;
  user_id: string;
  connection_id: string;
  external_account_id: string;
  account_type: string;
  account_name: string;
  currency: string;
  balance: number;
  available_balance: number | null;
  linked_savings_id: string | null;
  linked_debt_id: string | null;
  last_synced_at: string | null;
}

export interface SyncedTransaction {
  id: string;
  synced_account_id: string;
  amount: number;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  category: string | null;
  transaction_date: string;
  status: string;
}

export interface SyncedStandingOrder {
  id: string;
  synced_account_id: string;
  amount: number;
  currency: string;
  reference: string | null;
  payee_name: string | null;
  frequency: string | null;
  next_payment_date: string | null;
  status: string;
  linked_expense_id: string | null;
}

async function callOpenBanking(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await supabase.functions.invoke("open-banking", {
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

export function useConnectedBankAccounts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["connected-bank-accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connected_bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ConnectedBankAccount[];
    },
    enabled: !!user,
  });
}

export function useSyncedBankAccounts(connectionId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["synced-bank-accounts", user?.id, connectionId],
    queryFn: async () => {
      let query = supabase
        .from("synced_bank_accounts")
        .select("*")
        .order("account_name");
      
      if (connectionId) {
        query = query.eq("connection_id", connectionId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SyncedBankAccount[];
    },
    enabled: !!user,
  });
}

export function useSyncedTransactions(accountId?: string, limit = 50) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["synced-transactions", user?.id, accountId, limit],
    queryFn: async () => {
      let query = supabase
        .from("synced_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(limit);
      
      if (accountId) {
        query = query.eq("synced_account_id", accountId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SyncedTransaction[];
    },
    enabled: !!user,
  });
}

export function useSyncedStandingOrders(accountId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["synced-standing-orders", user?.id, accountId],
    queryFn: async () => {
      let query = supabase
        .from("synced_standing_orders")
        .select("*")
        .order("next_payment_date");
      
      if (accountId) {
        query = query.eq("synced_account_id", accountId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SyncedStandingOrder[];
    },
    enabled: !!user,
  });
}

export function useCreateLinkToken() {
  return useMutation({
    mutationFn: async ({ redirectUri }: { redirectUri?: string } = {}) => {
      return await callOpenBanking("create-link-token", redirectUri ? { redirectUri } : {});
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useExchangeToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ publicToken, institutionId, institutionName }: { 
      publicToken: string; 
      institutionId?: string; 
      institutionName?: string;
    }) => {
      return await callOpenBanking("exchange-token", { publicToken, institutionId, institutionName });
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

export function useSyncAccounts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (connectionId: string) => {
      return await callOpenBanking("sync-accounts", { connectionId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["connected-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["synced-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["synced-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["synced-standing-orders"] });
      queryClient.invalidateQueries({ queryKey: ["savings-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      toast.success(`Synced ${data.accountsCount} accounts, ${data.transactionCount} transactions`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDisconnectBank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (connectionId: string) => {
      return await callOpenBanking("disconnect", { connectionId });
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

export function useLinkAccountToSavings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ syncedAccountId, savingsId }: { syncedAccountId: string; savingsId: string | null }) => {
      const { error } = await supabase
        .from("synced_bank_accounts")
        .update({ linked_savings_id: savingsId })
        .eq("id", syncedAccountId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synced-bank-accounts"] });
      toast.success("Account linked");
    },
  });
}

export function useLinkAccountToDebt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ syncedAccountId, debtId }: { syncedAccountId: string; debtId: string | null }) => {
      const { error } = await supabase
        .from("synced_bank_accounts")
        .update({ linked_debt_id: debtId })
        .eq("id", syncedAccountId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synced-bank-accounts"] });
      toast.success("Account linked");
    },
  });
}
