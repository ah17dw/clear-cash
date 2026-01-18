import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CreditReportEntry {
  id: string;
  user_id: string;
  name: string;
  lender: string | null;
  type: string;
  balance: number;
  credit_limit: number | null;
  monthly_payment: number | null;
  account_status: string;
  matched_debt_id: string | null;
  last_verified_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditScoreEntry {
  id: string;
  user_id: string;
  score: number;
  score_band: string | null;
  source: string;
  recorded_at: string;
  notes: string | null;
  created_at: string;
}

export interface CreditReportFormData {
  name: string;
  lender?: string;
  type: string;
  balance: number;
  credit_limit?: number;
  monthly_payment?: number;
  account_status?: string;
  matched_debt_id?: string;
  notes?: string;
}

export interface CreditScoreFormData {
  score: number;
  score_band?: string;
  source?: string;
  recorded_at?: string;
  notes?: string;
}

export function useCreditReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: creditEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['credit-report-entries', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('credit_report_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return data as CreditReportEntry[];
    },
    enabled: !!user?.id,
  });

  const { data: scoreHistory, isLoading: scoresLoading } = useQuery({
    queryKey: ['credit-score-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('credit_score_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return data as CreditScoreEntry[];
    },
    enabled: !!user?.id,
  });

  const addEntry = useMutation({
    mutationFn: async (data: CreditReportFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('credit_report_entries')
        .insert({
          user_id: user.id,
          name: data.name,
          lender: data.lender || null,
          type: data.type,
          balance: data.balance,
          credit_limit: data.credit_limit || null,
          monthly_payment: data.monthly_payment || null,
          account_status: data.account_status || 'open',
          matched_debt_id: data.matched_debt_id || null,
          notes: data.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-report-entries'] });
      toast.success('Credit entry added');
    },
    onError: (error) => {
      toast.error('Failed to add entry: ' + error.message);
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreditReportFormData> }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('credit_report_entries')
        .update({
          ...data,
          last_verified_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-report-entries'] });
      toast.success('Credit entry updated');
    },
    onError: (error) => {
      toast.error('Failed to update entry: ' + error.message);
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('credit_report_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-report-entries'] });
      toast.success('Credit entry deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete entry: ' + error.message);
    },
  });

  const addScore = useMutation({
    mutationFn: async (data: CreditScoreFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('credit_score_history')
        .insert({
          user_id: user.id,
          score: data.score,
          score_band: data.score_band || null,
          source: data.source || 'experian',
          recorded_at: data.recorded_at || new Date().toISOString(),
          notes: data.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-score-history'] });
      toast.success('Credit score recorded');
    },
    onError: (error) => {
      toast.error('Failed to record score: ' + error.message);
    },
  });

  const deleteScore = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('credit_score_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-score-history'] });
      toast.success('Score entry deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete score: ' + error.message);
    },
  });

  return {
    creditEntries,
    scoreHistory,
    isLoading: entriesLoading || scoresLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    addScore,
    deleteScore,
    latestScore: scoreHistory?.[0],
  };
}
