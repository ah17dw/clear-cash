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
  repeat_type: 'daily' | 'weekly' | 'monthly' | 'none';
  is_completed: boolean;
  auto_complete: boolean;
  delegation_status: 'none' | 'pending' | 'accepted' | 'rejected';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTag {
  id: string;
  task_id: string;
  tagged_email: string;
  created_by: string;
  created_at: string;
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
    // Delegation accept/decline happens outside the app (via email link), so we poll briefly
    // to reflect updated delegation_status without requiring a manual refresh.
    refetchInterval: user ? 5000 : false,
    refetchIntervalInBackground: true,
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('You must be signed in to create tasks');

      // Ensure repeat_type is never null - DB expects string with default 'none'
      const taskData = {
        ...task,
        user_id: user.id,
        repeat_type: task.repeat_type || 'none',
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create task';
      console.error('Task creation error:', error);
      toast.error(message);
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
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TaskTag[];
    },
    enabled: !!taskId,
  });
}

export function useAddTaskTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, taggedEmail }: { taskId: string; taggedEmail: string }) => {
      const { data, error } = await supabase.functions.invoke('tag-task', {
        body: { taskId, taggedEmail },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task_tags', variables.taskId] });
      toast.success('User tagged (email sent)');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to tag user';
      console.error('Tag user error:', error);
      toast.error(message);
    },
  });
}
