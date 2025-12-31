import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Debt, DebtPayment, SavingsAccount, IncomeSource, ExpenseItem, FinanceSummary, Alert } from '@/types/finance';
import { getDaysUntil, getDaysUntilPayment } from '@/lib/format';
import { toast } from 'sonner';

// Debts
export function useDebts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['debts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('balance', { ascending: false });
      
      if (error) throw error;
      return data as Debt[];
    },
    enabled: !!user,
  });
}

export function useDebt(id: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['debt', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Debt;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('debts')
        .insert({ ...debt, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success('Debt added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add debt: ' + error.message);
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...debt }: Partial<Debt> & { id: string }) => {
      const { data, error } = await supabase
        .from('debts')
        .update(debt)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['debt', variables.id] });
      toast.success('Debt updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update debt: ' + error.message);
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success('Debt deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete debt: ' + error.message);
    },
  });
}

// Debt Payments
export function useDebtPayments(debtId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['debtPayments', debtId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('paid_on', { ascending: false });
      
      if (error) throw error;
      return data as DebtPayment[];
    },
    enabled: !!user && !!debtId,
  });
}

export function useCreateDebtPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (payment: Omit<DebtPayment, 'id' | 'user_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('debt_payments')
        .insert({ ...payment, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['debtPayments', variables.debt_id] });
      toast.success('Payment recorded');
    },
    onError: (error) => {
      toast.error('Failed to record payment: ' + error.message);
    },
  });
}

// Savings Accounts
export function useSavingsAccounts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['savingsAccounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_accounts')
        .select('*')
        .order('balance', { ascending: false });
      
      if (error) throw error;
      return data as SavingsAccount[];
    },
    enabled: !!user,
  });
}

export function useSavingsAccount(id: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['savingsAccount', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_accounts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as SavingsAccount;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateSavingsAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (account: Omit<SavingsAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('savings_accounts')
        .insert({ ...account, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savingsAccounts'] });
      toast.success('Savings account added');
    },
    onError: (error) => {
      toast.error('Failed to add savings account: ' + error.message);
    },
  });
}

export function useUpdateSavingsAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...account }: Partial<SavingsAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('savings_accounts')
        .update(account)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['savingsAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['savingsAccount', variables.id] });
      toast.success('Savings account updated');
    },
    onError: (error) => {
      toast.error('Failed to update savings account: ' + error.message);
    },
  });
}

export function useDeleteSavingsAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('savings_accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savingsAccounts'] });
      toast.success('Savings account deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete savings account: ' + error.message);
    },
  });
}

// Income Sources
export function useIncomeSources() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['incomeSources', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .order('monthly_amount', { ascending: false });
      
      if (error) throw error;
      return data as IncomeSource[];
    },
    enabled: !!user,
  });
}

export function useCreateIncomeSource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (source: Omit<IncomeSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('income_sources')
        .insert({ ...source, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources'] });
      toast.success('Income source added');
    },
    onError: (error) => {
      toast.error('Failed to add income source: ' + error.message);
    },
  });
}

export function useUpdateIncomeSource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...source }: Partial<IncomeSource> & { id: string }) => {
      const { data, error } = await supabase
        .from('income_sources')
        .update(source)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources'] });
      toast.success('Income source updated');
    },
    onError: (error) => {
      toast.error('Failed to update income source: ' + error.message);
    },
  });
}

export function useDeleteIncomeSource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources'] });
      toast.success('Income source deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete income source: ' + error.message);
    },
  });
}

// Expense Items
export function useExpenseItems() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['expenseItems', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_items')
        .select('*')
        .order('monthly_amount', { ascending: false });
      
      if (error) throw error;
      return data as ExpenseItem[];
    },
    enabled: !!user,
  });
}

export function useCreateExpenseItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (item: Omit<ExpenseItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('expense_items')
        .insert({ ...item, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseItems'] });
      toast.success('Expense added');
    },
    onError: (error) => {
      toast.error('Failed to add expense: ' + error.message);
    },
  });
}

export function useUpdateExpenseItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<ExpenseItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('expense_items')
        .update(item)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseItems'] });
      toast.success('Expense updated');
    },
    onError: (error) => {
      toast.error('Failed to update expense: ' + error.message);
    },
  });
}

export function useDeleteExpenseItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseItems'] });
      toast.success('Expense deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete expense: ' + error.message);
    },
  });
}

// Finance Summary
export function useFinanceSummary() {
  const { data: debts } = useDebts();
  const { data: savings } = useSavingsAccounts();
  const { data: income } = useIncomeSources();
  const { data: expenses } = useExpenseItems();

  const totalDebts = debts?.reduce((sum, d) => sum + Number(d.balance), 0) ?? 0;
  const totalSavings = savings?.reduce((sum, s) => sum + Number(s.balance), 0) ?? 0;
  const netPosition = totalSavings - totalDebts;
  
  const monthlyIncoming = income?.reduce((sum, i) => sum + Number(i.monthly_amount), 0) ?? 0;
  
  const expensesTotal = expenses?.reduce((sum, e) => sum + Number(e.monthly_amount), 0) ?? 0;
  const debtPayments = debts?.reduce((sum, d) => {
    const payment = d.planned_payment ?? d.minimum_payment;
    return sum + Number(payment);
  }, 0) ?? 0;
  
  const monthlyOutgoings = expensesTotal + debtPayments;
  const monthlySurplus = monthlyIncoming - monthlyOutgoings;

  const summary: FinanceSummary = {
    totalDebts,
    totalSavings,
    netPosition,
    monthlyIncoming,
    monthlyOutgoings,
    monthlySurplus,
  };

  return summary;
}

// Alerts
export function useAlerts(highAprThreshold: number = 20) {
  const { data: debts } = useDebts();
  
  const alerts: Alert[] = [];
  
  // Calculate total debt payments this month and next 3 months
  const getMonthlyDebtPayment = (debt: Debt): number => {
    if (Number(debt.balance) <= 0) return 0;
    const planned = Number(debt.planned_payment);
    return planned > 0 ? planned : Number(debt.minimum_payment);
  };
  
  const thisMonthTotal = debts?.reduce((sum, d) => sum + getMonthlyDebtPayment(d), 0) ?? 0;
  
  // Add this month's payments alert
  if (thisMonthTotal > 0) {
    alerts.push({
      id: 'monthly-payments',
      type: 'monthly_payments',
      title: 'Debt Payments This Month',
      description: `Total due: £${thisMonthTotal.toFixed(2)}`,
      severity: 'info',
    });
  }
  
  // Next 3 months upcoming
  if (debts && debts.length > 0) {
    const now = new Date();
    const upcomingMonths: string[] = [];
    
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = futureDate.toLocaleDateString('en-GB', { month: 'short' });
      // Same total for each month (simplified - assumes no payoffs mid-period)
      upcomingMonths.push(`${monthName}: £${thisMonthTotal.toFixed(0)}`);
    }
    
    if (upcomingMonths.length > 0 && thisMonthTotal > 0) {
      alerts.push({
        id: 'upcoming-payments',
        type: 'upcoming_payments',
        title: 'Next 3 Months',
        description: upcomingMonths.join(', '),
        severity: 'info',
      });
    }
  }
  
  debts?.forEach((debt) => {
    // 0% promo ending in 90 days
    if (debt.is_promo_0 && debt.promo_end_date) {
      const daysUntil = getDaysUntil(debt.promo_end_date);
      if (daysUntil >= 0 && daysUntil <= 90) {
        alerts.push({
          id: `promo-${debt.id}`,
          type: 'promo_ending',
          title: '0% Period Ending Soon',
          description: `${debt.name}: ${daysUntil} days remaining`,
          severity: daysUntil <= 30 ? 'danger' : 'warning',
          debtId: debt.id,
        });
      }
    }
    
    // Payment due in 14 days
    if (debt.payment_day) {
      const daysUntil = getDaysUntilPayment(debt.payment_day);
      if (daysUntil >= 0 && daysUntil <= 14) {
        alerts.push({
          id: `payment-${debt.id}`,
          type: 'payment_due',
          title: 'Payment Due Soon',
          description: `${debt.name}: Due in ${daysUntil} days`,
          severity: daysUntil <= 3 ? 'danger' : 'info',
          debtId: debt.id,
        });
      }
    }
    
    // High APR
    if (!debt.is_promo_0 && debt.apr >= highAprThreshold) {
      alerts.push({
        id: `apr-${debt.id}`,
        type: 'high_apr',
        title: 'High Interest Rate',
        description: `${debt.name}: ${debt.apr}% APR`,
        severity: 'warning',
        debtId: debt.id,
      });
    }
  });
  
  // Sort by severity
  const severityOrder = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return alerts;
}
