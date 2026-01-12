import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays } from 'date-fns';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  changes: Record<string, any> | null;
  created_at: string;
}

export function useAuditLog(daysBack: number = 30) {
  const { user } = useAuth();
  const since = subDays(new Date(), daysBack).toISOString();

  return useQuery({
    queryKey: ['audit_log', user?.id, daysBack],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('user_id', user!.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!user,
  });
}

export function useLogAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      entity_type,
      entity_id,
      entity_name,
      changes,
    }: {
      action: 'create' | 'update' | 'delete';
      entity_type: string;
      entity_id: string;
      entity_name?: string;
      changes?: Record<string, any>;
    }) => {
      if (!user) return;

      const { error } = await supabase.from('audit_log').insert({
        user_id: user.id,
        action,
        entity_type,
        entity_id,
        entity_name: entity_name ?? null,
        changes: changes ?? null,
      });

      if (error) {
        console.error('Failed to log action:', error);
        // Don't throw - audit logging shouldn't break the app
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_log'] });
    },
  });
}
