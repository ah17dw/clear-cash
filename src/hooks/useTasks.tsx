import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: 'low' | 'medium' | 'high';
  repeat_type: 'daily' | 'weekly' | 'monthly' | null;
  is_completed: boolean;
  auto_complete: boolean;
  created_at: string;
  updated_at: string;
}

export function useTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...task, user_id: user!.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });
}

export function useTaskTags(taskId: string) {
  return useQuery({
    queryKey: ['task_tags', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_tags')
        .select(`
          id,
          tagged_user_id,
          profiles!task_tags_tagged_user_id_fkey (
            user_id,
            phone_number,
            avatar_url
          )
        `)
        .eq('task_id', taskId);

      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

export function useAddTaskTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, taggedUserId }: { taskId: string; taggedUserId: string }) => {
      const { data, error } = await supabase
        .from('task_tags')
        .insert({ task_id: taskId, tagged_user_id: taggedUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task_tags', variables.taskId] });
      toast.success('User tagged');
    },
    onError: () => {
      toast.error('Failed to tag user');
    },
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ['all_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, phone_number, avatar_url');

      if (error) throw error;
      return data;
    },
  });
}
