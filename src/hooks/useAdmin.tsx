import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  display_name: string | null;
  roles: string[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  action: string;
  changes: unknown;
  created_at: string;
}

async function adminRequest(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...params }
  });
  
  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data;
}

export function useIsAdmin() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Admin check error:', error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!user,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const result = await adminRequest('list_users');
      return result.users as AdminUser[];
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      await adminRequest('delete_user', { user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      await adminRequest('update_password', { user_id: userId, password });
    },
    onSuccess: () => {
      toast.success('Password updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update password');
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (email: string) => {
      await adminRequest('invite_user', { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('Invitation sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to invite user');
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await adminRequest('set_role', { user_id: userId, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('Role updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update role');
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: async () => {
      const result = await adminRequest('get_audit_logs');
      return result.logs as AuditLog[];
    },
  });
}