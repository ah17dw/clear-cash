import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Renewal {
  id: string;
  user_id: string;
  name: string;
  provider: string | null;
  total_cost: number;
  monthly_amount: number;
  is_monthly_payment: boolean;
  agreement_start: string | null;
  agreement_end: string | null;
  notes: string | null;
  file_url: string | null;
  file_name: string | null;
  added_to_expenses: boolean;
  linked_expense_id: string | null;
  person_or_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenewalFile {
  id: string;
  user_id: string;
  renewal_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
}

export function useRenewals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['renewals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renewals')
        .select('*')
        .eq('user_id', user!.id)
        .order('agreement_end', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as Renewal[];
    },
    enabled: !!user,
  });
}

export function useRenewalFiles(renewalId: string) {
  return useQuery({
    queryKey: ['renewal_files', renewalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renewal_files')
        .select('*')
        .eq('renewal_id', renewalId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as RenewalFile[];
    },
    enabled: !!renewalId,
  });
}

// Helper function to get signed URL for private bucket files
export async function getSignedFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('renewal-files')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

export function useAddRenewalFile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ renewalId, fileUrl, fileName, fileSize }: { renewalId: string; fileUrl: string; fileName: string; fileSize?: number }) => {
      const { data, error } = await supabase
        .from('renewal_files')
        .insert({
          user_id: user!.id,
          renewal_id: renewalId,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['renewal_files', variables.renewalId] });
      toast.success('File added');
    },
    onError: () => {
      toast.error('Failed to add file');
    },
  });
}

export function useDeleteRenewalFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, renewalId }: { id: string; renewalId: string }) => {
      const { error } = await supabase
        .from('renewal_files')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return renewalId;
    },
    onSuccess: (renewalId) => {
      queryClient.invalidateQueries({ queryKey: ['renewal_files', renewalId] });
      toast.success('File removed');
    },
    onError: () => {
      toast.error('Failed to remove file');
    },
  });
}

export function useCreateRenewal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (renewal: Omit<Renewal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('renewals')
        .insert({ ...renewal, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] });
      toast.success('Renewal added');
    },
    onError: (error) => {
      console.error('Create renewal error:', error);
      toast.error('Failed to add renewal');
    },
  });
}

export function useUpdateRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Renewal> & { id: string }) => {
      const { data, error } = await supabase
        .from('renewals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] });
      toast.success('Renewal updated');
    },
    onError: (error) => {
      console.error('Update renewal error:', error);
      toast.error('Failed to update renewal');
    },
  });
}

export function useDeleteRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('renewals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] });
      toast.success('Renewal deleted');
    },
    onError: (error) => {
      console.error('Delete renewal error:', error);
      toast.error('Failed to delete renewal');
    },
  });
}

export function useAddRenewalToExpenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (renewal: Renewal) => {
      if (!user) throw new Error('Not authenticated');

      // Create expense item
      const { data: expense, error: expenseError } = await supabase
        .from('expense_items')
        .insert({
          user_id: user.id,
          name: renewal.name,
          provider: renewal.provider,
          monthly_amount: renewal.monthly_amount,
          category: 'subscriptions',
          start_date: renewal.agreement_start,
          end_date: renewal.agreement_end,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Update renewal to link to expense
      const { error: updateError } = await supabase
        .from('renewals')
        .update({
          added_to_expenses: true,
          linked_expense_id: expense.id,
        })
        .eq('id', renewal.id);

      if (updateError) throw updateError;

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] });
      queryClient.invalidateQueries({ queryKey: ['expenseItems'] });
      toast.success('Added to expenses');
    },
    onError: (error) => {
      console.error('Add to expenses error:', error);
      toast.error('Failed to add to expenses');
    },
  });
}

export function useExtractContract() {
  return useMutation({
    mutationFn: async ({ text, fileName }: { text: string; fileName?: string }) => {
      const { data, error } = await supabase.functions.invoke('extract-contract', {
        body: { text, fileName },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.data;
    },
    onError: (error) => {
      console.error('Extract contract error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract contract info');
    },
  });
}
