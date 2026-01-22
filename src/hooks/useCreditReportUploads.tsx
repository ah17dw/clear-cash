import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';

export interface CreditReportUpload {
  id: string;
  user_id: string;
  file_names: string[];
  entries_found: number;
  discrepancies_found: number;
  updates_applied: number;
  raw_results: unknown;
  uploaded_at: string;
  created_at: string;
}

export interface CreateUploadData {
  file_names: string[];
  entries_found: number;
  discrepancies_found: number;
  raw_results: unknown;
}

export function useCreditReportUploads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: uploads, isLoading } = useQuery({
    queryKey: ['credit-report-uploads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('credit_report_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as CreditReportUpload[];
    },
    enabled: !!user?.id,
  });

  const createUpload = useMutation({
    mutationFn: async (data: CreateUploadData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('credit_report_uploads')
        .insert([{
          user_id: user.id,
          file_names: data.file_names,
          entries_found: data.entries_found,
          discrepancies_found: data.discrepancies_found,
          raw_results: data.raw_results as Json,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-report-uploads'] });
    },
    onError: (error) => {
      toast.error('Failed to save upload history: ' + error.message);
    },
  });

  const incrementUpdatesApplied = useMutation({
    mutationFn: async (uploadId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get current count
      const { data: current, error: fetchError } = await supabase
        .from('credit_report_uploads')
        .select('updates_applied')
        .eq('id', uploadId)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('credit_report_uploads')
        .update({ updates_applied: (current?.updates_applied || 0) + 1 })
        .eq('id', uploadId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-report-uploads'] });
    },
  });

  const deleteUpload = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('credit_report_uploads')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-report-uploads'] });
      toast.success('Upload history deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  // Calculate days since last upload
  const latestUpload = uploads?.[0];
  const daysSinceLastUpload = latestUpload 
    ? differenceInDays(new Date(), new Date(latestUpload.uploaded_at))
    : null;
  
  const daysUntilNextUpload = daysSinceLastUpload !== null 
    ? Math.max(0, 30 - daysSinceLastUpload)
    : null;

  const shouldUpload = daysSinceLastUpload === null || daysSinceLastUpload >= 30;

  return {
    uploads,
    isLoading,
    createUpload,
    incrementUpdatesApplied,
    deleteUpload,
    latestUpload,
    daysSinceLastUpload,
    daysUntilNextUpload,
    shouldUpload,
  };
}
