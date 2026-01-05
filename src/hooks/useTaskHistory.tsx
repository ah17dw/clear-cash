import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TaskHistoryEntry {
  id: string;
  task_id: string;
  user_id: string;
  action: 'created' | 'completed' | 'delegated' | 'accepted' | 'rejected';
  details: Record<string, any>;
  created_at: string;
}

export interface TaskStats {
  userId: string;
  displayName: string;
  assignedCount: number;
  completedCount: number;
  onTimeCount: number;
}

export function useTaskHistory(taskId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['taskHistory', taskId],
    queryFn: async () => {
      let query = supabase
        .from('task_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (taskId) {
        query = query.eq('task_id', taskId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as TaskHistoryEntry[];
    },
    enabled: !!user,
  });
}

export function useAllTaskHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['allTaskHistory', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as TaskHistoryEntry[];
    },
    enabled: !!user,
  });
}

export function useAddTaskHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: { task_id: string; action: string; details?: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('task_history')
        .insert({
          task_id: entry.task_id,
          user_id: user!.id,
          action: entry.action,
          details: entry.details || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskHistory', variables.task_id] });
      queryClient.invalidateQueries({ queryKey: ['allTaskHistory'] });
    },
  });
}

export function useTaskStats() {
  const { data: history } = useAllTaskHistory();
  const { user } = useAuth();

  // Calculate stats from history
  const stats: Map<string, TaskStats> = new Map();

  if (history) {
    history.forEach((entry) => {
      const userId = entry.user_id;
      const existing = stats.get(userId) || {
        userId,
        displayName: entry.details?.user_name || 'Unknown',
        assignedCount: 0,
        completedCount: 0,
        onTimeCount: 0,
      };

      if (entry.action === 'delegated') {
        existing.assignedCount++;
      }
      if (entry.action === 'completed') {
        existing.completedCount++;
        if (entry.details?.on_time) {
          existing.onTimeCount++;
        }
      }

      stats.set(userId, existing);
    });
  }

  return Array.from(stats.values());
}
