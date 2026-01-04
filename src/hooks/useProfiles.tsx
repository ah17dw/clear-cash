import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserProfile } from '@/types/finance';

export function useSearchProfiles(searchTerm: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['searchProfiles', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      // Search by display_name (case insensitive)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user!.id)
        .ilike('display_name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: !!user && searchTerm.length >= 2,
  });
}

// Get user email from auth.users via a function or join
export function useUserEmails(userIds: string[]) {
  return useQuery({
    queryKey: ['userEmails', userIds],
    queryFn: async () => {
      // We can't directly query auth.users, but we can get emails from profiles
      // For now, return empty - emails are stored directly in task_tags
      return {};
    },
    enabled: userIds.length > 0,
  });
}
