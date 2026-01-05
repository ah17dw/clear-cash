import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { SubExpense } from '@/types/finance';
import { toast } from 'sonner';

export function useSubExpenses(parentExpenseId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subExpenses', parentExpenseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_expenses')
        .select('*')
        .eq('parent_expense_id', parentExpenseId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as SubExpense[];
    },
    enabled: !!user && !!parentExpenseId,
  });
}

export function useAllSubExpenses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['allSubExpenses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_expenses')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;
      return data as SubExpense[];
    },
    enabled: !!user,
  });
}

export function useCreateSubExpense() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subExpense: { parent_expense_id: string; name: string; monthly_amount: number }) => {
      const { data, error } = await supabase
        .from('sub_expenses')
        .insert({ ...subExpense, user_id: user!.id })
        .select()
        .single();

      if (error) throw error;
      
      // Update parent expense total
      await updateParentTotal(subExpense.parent_expense_id);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subExpenses', variables.parent_expense_id] });
      queryClient.invalidateQueries({ queryKey: ['allSubExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseItems'] });
      toast.success('Sub-expense added');
    },
    onError: () => {
      toast.error('Failed to add sub-expense');
    },
  });
}

async function updateParentTotal(parentExpenseId: string) {
  // Get all sub-expenses for this parent
  const { data: subExpenses, error: fetchError } = await supabase
    .from('sub_expenses')
    .select('monthly_amount')
    .eq('parent_expense_id', parentExpenseId);
  
  if (fetchError) {
    console.error('Error fetching sub-expenses:', fetchError);
    return;
  }
  
  // Calculate total
  const total = subExpenses?.reduce((sum, s) => sum + Number(s.monthly_amount), 0) ?? 0;
  
  // Only update parent if there are sub-expenses
  if (subExpenses && subExpenses.length > 0) {
    const { error: updateError } = await supabase
      .from('expense_items')
      .update({ monthly_amount: total })
      .eq('id', parentExpenseId);
    
    if (updateError) {
      console.error('Error updating parent expense:', updateError);
    }
  }
}

export function useUpdateSubExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, parent_expense_id, ...updates }: { id: string; parent_expense_id: string; name?: string; monthly_amount?: number }) => {
      const { data, error } = await supabase
        .from('sub_expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update parent expense total
      await updateParentTotal(parent_expense_id);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subExpenses', variables.parent_expense_id] });
      queryClient.invalidateQueries({ queryKey: ['allSubExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseItems'] });
      toast.success('Sub-expense updated');
    },
    onError: () => {
      toast.error('Failed to update sub-expense');
    },
  });
}

export function useDeleteSubExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, parent_expense_id }: { id: string; parent_expense_id: string }) => {
      const { error } = await supabase
        .from('sub_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update parent expense total
      await updateParentTotal(parent_expense_id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subExpenses', variables.parent_expense_id] });
      queryClient.invalidateQueries({ queryKey: ['allSubExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseItems'] });
      toast.success('Sub-expense deleted');
    },
    onError: () => {
      toast.error('Failed to delete sub-expense');
    },
  });
}
