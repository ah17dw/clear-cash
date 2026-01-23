// Cashflow page - last updated: 2026-01-17 v5
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle, Plus, Users, ArrowUpDown, ChevronRight, CalendarDays, CalendarClock, FileText, Check, Clock, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useIncomeSources, 
  useExpenseItems, 
  useDebts,
  useDeleteIncomeSource,
  useDeleteExpenseItem,
  useUpdateExpenseItem,
  useCreateExpenseItem,
  useCreateIncomeSource,
} from '@/hooks/useFinanceData';
import { useAllSubExpenses } from '@/hooks/useSubExpenses';
import { useRenewals, useUpdateRenewal, Renewal } from '@/hooks/useRenewals';
import { IncomeFormSheet } from '@/components/cashflow/IncomeFormSheet';
import { ExpenseFormSheet } from '@/components/cashflow/ExpenseFormSheet';
import { SubExpenseSheet } from '@/components/cashflow/SubExpenseSheet';
import { FinanceCalendar } from '@/components/finance/FinanceCalendar';
import { UnifiedAddSheet } from '@/components/unified/UnifiedAddSheet';
import { EXPENSE_CATEGORIES, IncomeSource, ExpenseItem } from '@/types/finance';
import { BANK_ACCOUNTS, getBankAccountLabel } from '@/types/bank-accounts';

type SortOption = 'due' | 'value';

export default function Cashflow() {
  const navigate = useNavigate();
  const { data: income } = useIncomeSources();
  const { data: expenses } = useExpenseItems();
  const { data: debts } = useDebts();
  const { data: allSubExpenses } = useAllSubExpenses();
  const { data: renewals } = useRenewals();
  
  const deleteIncome = useDeleteIncomeSource();
  const deleteExpense = useDeleteExpenseItem();
  const updateExpense = useUpdateExpenseItem();
  const updateRenewal = useUpdateRenewal();
  const createExpense = useCreateExpenseItem();
  const createIncome = useCreateIncomeSource();
  
  const [showUnifiedAdd, setShowUnifiedAdd] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | undefined>();
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | undefined>();
  const [viewingIncome, setViewingIncome] = useState<IncomeSource | undefined>();
  const [viewingExpense, setViewingExpense] = useState<ExpenseItem | undefined>();
  const [showSubExpenseSheet, setShowSubExpenseSheet] = useState(false);
  const [selectedExpenseForSub, setSelectedExpenseForSub] = useState<ExpenseItem | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [sortBy, setSortBy] = useState<SortOption>('value');
  const [bankAccountFilter, setBankAccountFilter] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: 'expense' | 'income';
    id: string;
    name: string;
  }>({ open: false, type: 'expense', id: '', name: '' });

  const totalIncome = income?.reduce((sum, i) => sum + Number(i.monthly_amount), 0) ?? 0;
  
  // Split expenses by frequency
  const { monthlyExpenses, annualExpenses } = useMemo(() => {
    const monthly = expenses?.filter(e => e.frequency !== 'annual') ?? [];
    const annual = expenses?.filter(e => e.frequency === 'annual') ?? [];
    return { monthlyExpenses: monthly, annualExpenses: annual };
  }, [expenses]);

  // Renewals marked to show in cashflow (split by frequency)
  const { monthlyRenewals, annualRenewals } = useMemo(() => {
    const visible = renewals?.filter(r => r.show_in_cashflow && !r.linked_expense_id) ?? [];
    const monthly = visible.filter(r => r.frequency === 'monthly' || r.is_monthly_payment);
    const annual = visible.filter(r => r.frequency === 'annually' && !r.is_monthly_payment);
    return { monthlyRenewals: monthly, annualRenewals: annual };
  }, [renewals]);

  // Calculate adjusted expenses (per-item, persisted per expense)
  // Exclude linked expenses from totals (they're accounted for in their parent)
  const adjustedMonthlyExpensesTotal = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => {
      if (e.linked_parent_id) return sum; // Skip linked expenses
      const multiplier = e.couples_mode ? 0.5 : 1;
      return sum + Number(e.monthly_amount) * multiplier;
    }, 0);
  }, [monthlyExpenses]);

  const adjustedAnnualExpensesTotal = useMemo(() => {
    return annualExpenses.reduce((sum, e) => {
      if (e.linked_parent_id) return sum; // Skip linked expenses
      const multiplier = e.couples_mode ? 0.5 : 1;
      return sum + Number(e.monthly_amount) * multiplier;
    }, 0);
  }, [annualExpenses]);

  // Monthly equivalent of annual expenses
  const annualAsMonthly = adjustedAnnualExpensesTotal / 12;

  // Debt payments are never 50%
  const adjustedDebtPaymentsTotal = useMemo(() => {
    return debts?.reduce((sum, d) => {
      const payment = Number(d.planned_payment) || Number(d.minimum_payment);
      return sum + payment;
    }, 0) ?? 0;
  }, [debts]);

  // Renewals reflected in cashflow - add their monthly amounts to totals (respecting couples_mode)
  const renewalsMonthlyTotal = useMemo(() => {
    return monthlyRenewals.reduce((sum, r) => {
      const multiplier = r.couples_mode ? 0.5 : 1;
      return sum + Number(r.monthly_amount) * multiplier;
    }, 0);
  }, [monthlyRenewals]);

  const renewalsAnnualTotal = useMemo(() => {
    return annualRenewals.reduce((sum, r) => {
      const multiplier = r.couples_mode ? 0.5 : 1;
      return sum + Number(r.total_cost) * multiplier;
    }, 0);
  }, [annualRenewals]);

  const renewalsAnnualAsMonthly = renewalsAnnualTotal / 12;

  const totalMonthlyOutgoings = adjustedMonthlyExpensesTotal + adjustedDebtPaymentsTotal + annualAsMonthly + renewalsMonthlyTotal + renewalsAnnualAsMonthly;
  const surplus = totalIncome - totalMonthlyOutgoings;

  // Filtered expenses by bank account
  const filteredMonthlyExpenses = useMemo(() => {
    if (!bankAccountFilter) return monthlyExpenses;
    return monthlyExpenses.filter(e => e.bank_account === bankAccountFilter);
  }, [monthlyExpenses, bankAccountFilter]);

  const filteredAnnualExpenses = useMemo(() => {
    if (!bankAccountFilter) return annualExpenses;
    return annualExpenses.filter(e => e.bank_account === bankAccountFilter);
  }, [annualExpenses, bankAccountFilter]);

  // Sorted expenses
  const sortedMonthlyExpenses = useMemo(() => {
    return [...filteredMonthlyExpenses].sort((a, b) => {
      if (sortBy === 'value') {
        return Number(b.monthly_amount) - Number(a.monthly_amount);
      }
      return a.name.localeCompare(b.name);
    });
  }, [filteredMonthlyExpenses, sortBy]);

  const sortedAnnualExpenses = useMemo(() => {
    return [...filteredAnnualExpenses].sort((a, b) => {
      if (sortBy === 'value') {
        return Number(b.monthly_amount) - Number(a.monthly_amount);
      }
      return a.name.localeCompare(b.name);
    });
  }, [filteredAnnualExpenses, sortBy]);

  // Sorted debts
  const sortedDebts = useMemo(() => {
    if (!debts) return [];
    const today = new Date();
    const currentDay = today.getDate();
    
    return [...debts].sort((a, b) => {
      if (sortBy === 'value') {
        const aPayment = Number(a.planned_payment) || Number(a.minimum_payment);
        const bPayment = Number(b.planned_payment) || Number(b.minimum_payment);
        return bPayment - aPayment;
      }
      const aDays = a.payment_day ? (a.payment_day >= currentDay ? a.payment_day - currentDay : 30 - currentDay + a.payment_day) : 999;
      const bDays = b.payment_day ? (b.payment_day >= currentDay ? b.payment_day - currentDay : 30 - currentDay + b.payment_day) : 999;
      return aDays - bDays;
    });
  }, [debts, sortBy]);

  // Calculate outgoings by bank account
  const outgoingsByAccount = useMemo(() => {
    const accountTotals: Record<string, number> = {};
    
    // Add expenses
    expenses?.forEach(expense => {
      if (expense.linked_parent_id) return; // Skip linked expenses
      const account = expense.bank_account || 'unassigned';
      const multiplier = expense.couples_mode ? 0.5 : 1;
      const amount = Number(expense.monthly_amount) * multiplier;
      // For annual expenses, use monthly equivalent
      const monthlyAmount = expense.frequency === 'annual' ? amount / 12 : amount;
      accountTotals[account] = (accountTotals[account] || 0) + monthlyAmount;
    });
    
    // Add debts
    debts?.forEach(debt => {
      const account = debt.bank_account || 'unassigned';
      const payment = Number(debt.planned_payment) || Number(debt.minimum_payment);
      accountTotals[account] = (accountTotals[account] || 0) + payment;
    });
    
    // Add income (as positive for tracking, but we'll display separately)
    // For now, just outgoings
    
    // Convert to sorted array
    return Object.entries(accountTotals)
      .map(([account, total]) => ({
        account,
        label: getBankAccountLabel(account) || 'Unassigned',
        total
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, debts]);

  const getCategoryLabel = (value: string | null) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? 'Other';
  };

  const getInitialIcon = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getSubExpenseCount = (expenseId: string) => {
    return allSubExpenses?.filter((s) => s.parent_expense_id === expenseId).length ?? 0;
  };

  const getLinkedParentName = (linkedParentId: string | null | undefined) => {
    if (!linkedParentId || !expenses) return null;
    return expenses.find((e) => e.id === linkedParentId)?.name ?? null;
  };

  // Get payment status for an expense based on payment day
  const getPaymentStatus = (paymentDay: number | null | undefined) => {
    if (!paymentDay) return null;
    
    const today = new Date();
    const currentDay = today.getDate();
    const daysUntilPayment = paymentDay >= currentDay 
      ? paymentDay - currentDay 
      : (new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - currentDay) + paymentDay;
    
    // If payment day has passed this month, it's paid
    if (paymentDay < currentDay) {
      return { status: 'paid', label: 'Paid', daysUntil: 0 };
    }
    
    // Due soon (within 3 days)
    if (daysUntilPayment <= 3) {
      return { status: 'due_soon', label: 'Due Soon', daysUntil: daysUntilPayment };
    }
    
    // Upcoming (within 7 days)
    if (daysUntilPayment <= 7) {
      return { status: 'upcoming', label: `In ${daysUntilPayment} days`, daysUntil: daysUntilPayment };
    }
    
    return null;
  };

  const handleDebtClick = (debtId: string) => {
    navigate(`/debts/${debtId}`);
  };

  const handleDeleteExpense = (expense: ExpenseItem) => {
    setDeleteConfirm({ open: true, type: 'expense', id: expense.id, name: expense.name });
  };

  const handleDeleteIncome = (source: IncomeSource) => {
    setDeleteConfirm({ open: true, type: 'income', id: source.id, name: source.name });
  };

  const confirmDelete = () => {
    if (deleteConfirm.type === 'expense') {
      deleteExpense.mutate(deleteConfirm.id);
    } else {
      deleteIncome.mutate(deleteConfirm.id);
    }
    setDeleteConfirm({ open: false, type: 'expense', id: '', name: '' });
  };

  const handleDuplicateExpense = (expense: ExpenseItem) => {
    createExpense.mutate({
      name: `${expense.name} (Copy)`,
      monthly_amount: expense.monthly_amount,
      category: expense.category,
      frequency: expense.frequency,
      couples_mode: expense.couples_mode,
      provider: expense.provider,
      renewal_date: expense.renewal_date,
      reminder_days_before: expense.reminder_days_before,
      reminder_email: expense.reminder_email,
      reminder_sms: expense.reminder_sms,
      start_date: expense.start_date,
      end_date: expense.end_date,
    });
  };

  const handleDuplicateIncome = (source: IncomeSource) => {
    createIncome.mutate({
      name: `${source.name} (Copy)`,
      monthly_amount: source.monthly_amount,
      start_date: source.start_date,
      end_date: source.end_date,
    });
  };

  const renderExpenseItem = (expense: ExpenseItem, isAnnual: boolean = false) => {
    const fullAmount = Number(expense.monthly_amount);
    const isCouples = !!expense.couples_mode;
    const isLinked = !!expense.linked_parent_id;
    const linkedParentName = getLinkedParentName(expense.linked_parent_id);
    // Linked expenses show as £0 since they're accounted for in parent
    const displayAmount = isLinked ? 0 : fullAmount * (isCouples ? 0.5 : 1);
    const subCount = getSubExpenseCount(expense.id);
    const paymentStatus = getPaymentStatus(expense.payment_day);
    const bankLabel = getBankAccountLabel(expense.bank_account);
    
    return (
      <SwipeableRow
        key={expense.id}
        onEdit={() => { setEditingExpense(expense); setShowExpenseForm(true); }}
        onDelete={() => handleDeleteExpense(expense)}
        onDuplicate={() => handleDuplicateExpense(expense)}
      >
        <div
          className={cn(
            "flex items-center justify-between py-2 px-2 border-b border-border last:border-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors",
            isLinked && "opacity-60"
          )}
          onClick={() => setViewingExpense(expense)}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
              isLinked ? "bg-muted text-muted-foreground" : "bg-debt/20 text-debt"
            )}>
              {getInitialIcon(expense.name)}
            </div>
            <div>
              <p className="text-sm flex items-center gap-1 flex-wrap">
                {expense.name}
                {subCount > 0 && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                    {subCount} sub
                  </span>
                )}
                {paymentStatus && (
                  <Badge 
                    variant={paymentStatus.status === 'paid' ? 'default' : paymentStatus.status === 'due_soon' ? 'destructive' : 'secondary'}
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4",
                      paymentStatus.status === 'paid' && "bg-savings/20 text-savings border-savings/30"
                    )}
                  >
                    {paymentStatus.status === 'paid' && <Check className="h-2.5 w-2.5 mr-0.5" />}
                    {paymentStatus.status === 'due_soon' && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                    {paymentStatus.label}
                  </Badge>
                )}
              </p>
              <div className="flex items-center gap-1.5">
                {isLinked && linkedParentName ? (
                  <p className="text-xs text-muted-foreground italic">
                    Included in {linkedParentName}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{getCategoryLabel(expense.category)}</p>
                )}
                {bankLabel && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                    {bankLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              {isLinked ? (
                <span className="text-xs text-muted-foreground">£0</span>
              ) : (
                <>
                  <AmountDisplay amount={displayAmount} size="sm" />
                  {isCouples && (
                    <p className="text-[10px] text-muted-foreground line-through">
                      £{fullAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  )}
                  {isAnnual ? (
                    <p className="text-[10px] text-muted-foreground">
                      £{(displayAmount / 12).toFixed(0)}/mo
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">
                      ≈ £{(displayAmount * 12).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr
                    </p>
                  )}
                </>
              )}
            </div>
            {!isLinked && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <Switch
                  checked={isCouples}
                  onCheckedChange={(checked) => updateExpense.mutate({ id: expense.id, couples_mode: checked })}
                  className="scale-75"
                />
              </div>
            )}
          </div>
        </div>
      </SwipeableRow>
    );
  };

  // Render a renewal item (for display in cashflow - shows actual amount with couples toggle)
  const renderRenewalItem = (renewal: Renewal, isAnnual: boolean = false) => {
    const fullAmount = isAnnual ? Number(renewal.total_cost) : Number(renewal.monthly_amount);
    const isCouples = !!renewal.couples_mode;
    const displayAmount = fullAmount * (isCouples ? 0.5 : 1);
    
    return (
      <div
        key={`renewal-${renewal.id}`}
        className="flex items-center justify-between py-2 px-2 border-b border-border last:border-0 bg-card"
      >
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/renewals')}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm bg-primary/20 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm flex items-center gap-1">
              {renewal.name}
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                Renewal
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {renewal.provider || 'Subscription'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <AmountDisplay amount={displayAmount} size="sm" />
            {isCouples && (
              <p className="text-[10px] text-muted-foreground line-through">
                £{fullAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            )}
            {isAnnual && (
              <p className="text-[10px] text-muted-foreground">
                £{(displayAmount / 12).toFixed(0)}/mo
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <Switch
              checked={isCouples}
              onCheckedChange={(checked) => updateRenewal.mutate({ id: renewal.id, couples_mode: checked })}
              className="scale-75"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="Cashflow" 
        onAdd={() => setShowUnifiedAdd(true)}
        addLabel="Add"
      />

      {/* Summary Card */}
      <div className="finance-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="grid grid-cols-3 gap-4 text-center flex-1">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Income</p>
              <AmountDisplay amount={totalIncome} size="sm" className="text-savings" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Outgoings</p>
              <AmountDisplay amount={totalMonthlyOutgoings} size="sm" className="text-debt" />
              <p className="text-[10px] text-muted-foreground">/month</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {surplus >= 0 ? 'Surplus' : 'Deficit'}
              </p>
              <AmountDisplay amount={surplus} size="sm" showSign />
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full text-xs gap-1"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {showCalendar ? 'Hide Calendar' : 'View Calendar'}
        </Button>
      </div>

      {/* Calendar View */}
      {showCalendar && (
        <div className="mb-4">
          <FinanceCalendar debts={debts} expenses={expenses} income={income} />
        </div>
      )}

      {/* Income Section */}
      <div className="finance-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-savings" />
            <h3 className="font-medium">Monthly Income</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingIncome(undefined);
              setShowIncomeForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {income && income.length > 0 ? (
          <div className="space-y-1">
            {income.map((source) => (
              <SwipeableRow
                key={source.id}
                onEdit={() => { setEditingIncome(source); setShowIncomeForm(true); }}
                onDelete={() => handleDeleteIncome(source)}
                onDuplicate={() => handleDuplicateIncome(source)}
              >
                <div 
                  className="flex items-center justify-between py-2 px-2 border-b border-border last:border-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setViewingIncome(source)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-savings/20 flex items-center justify-center text-savings font-semibold text-sm">
                      {getInitialIcon(source.name)}
                    </div>
                    <p className="text-sm">{source.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AmountDisplay amount={Number(source.monthly_amount)} size="sm" />
                  </div>
                </div>
              </SwipeableRow>
            ))}
            <div className="flex items-center justify-between pt-2 font-medium border-t border-border">
              <p>Subtotal</p>
              <AmountDisplay amount={totalIncome} size="sm" className="text-savings" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Annual equivalent</p>
              <p>£{(totalIncome * 12).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No income sources added
          </p>
        )}
      </div>

      {/* Outgoings Header with Sort and Filter */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-lg font-semibold">Outgoings</h2>
        <div className="flex items-center gap-2">
          <Select
            value={bankAccountFilter || 'all'}
            onValueChange={(v) => setBankAccountFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {BANK_ACCOUNTS.map((acc) => (
                <SelectItem key={acc.value} value={acc.value}>
                  {acc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortBy(sortBy === 'value' ? 'due' : 'value')}
            className="text-xs h-8"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            {sortBy === 'value' ? 'Value' : 'Due'}
          </Button>
        </div>
      </div>

      {/* Monthly Expenses Section */}
      <div className="finance-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-debt" />
            <h3 className="font-medium">Monthly Expenses</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingExpense(undefined);
              setShowExpenseForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {(sortedMonthlyExpenses.length > 0 || monthlyRenewals.length > 0) ? (
          <div className="space-y-1">
            {sortedMonthlyExpenses.map((expense) => renderExpenseItem(expense, false))}
            {monthlyRenewals.map((renewal) => renderRenewalItem(renewal, false))}
            <div className="flex items-center justify-between pt-2 font-medium border-t border-border">
              <p>Subtotal</p>
              <AmountDisplay amount={adjustedMonthlyExpensesTotal + renewalsMonthlyTotal} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Annual equivalent</p>
              <p>£{((adjustedMonthlyExpensesTotal + renewalsMonthlyTotal) * 12).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No monthly expenses added
          </p>
        )}
      </div>

      {/* Annual Expenses Section */}
      <div className="finance-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-debt" />
            <h3 className="font-medium">Annual Expenses</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingExpense(undefined);
              setShowExpenseForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {(sortedAnnualExpenses.length > 0 || annualRenewals.length > 0) ? (
          <div className="space-y-1">
            {sortedAnnualExpenses.map((expense) => renderExpenseItem(expense, true))}
            {annualRenewals.map((renewal) => renderRenewalItem(renewal, true))}
            <div className="flex items-center justify-between pt-2 font-medium border-t border-border">
              <p>Subtotal (Annual)</p>
              <AmountDisplay amount={adjustedAnnualExpensesTotal + renewalsAnnualTotal} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Monthly equivalent</p>
              <p>£{(annualAsMonthly + renewalsAnnualAsMonthly).toFixed(2)}/mo</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No annual expenses added
          </p>
        )}
      </div>

      {/* Debt Payments Section */}
      {sortedDebts.length > 0 && (
        <div className="finance-card">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpCircle className="h-4 w-4 text-debt" />
            <h3 className="font-medium">Debt Payments</h3>
          </div>

          <div className="space-y-2">
            {sortedDebts.map((debt) => {
              const payment = Number(debt.planned_payment) || Number(debt.minimum_payment);
              const paymentStatus = getPaymentStatus(debt.payment_day);
              const bankLabel = getBankAccountLabel(debt.bank_account);
              return (
                <div
                  key={debt.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded transition-colors"
                  onClick={() => handleDebtClick(debt.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-debt/20 flex items-center justify-center text-debt font-semibold text-sm">
                      {getInitialIcon(debt.name)}
                    </div>
                    <div>
                      <p className="text-sm flex items-center gap-1 flex-wrap">
                        {debt.name}
                        {paymentStatus && (
                          <Badge 
                            variant={paymentStatus.status === 'paid' ? 'default' : paymentStatus.status === 'due_soon' ? 'destructive' : 'secondary'}
                            className={cn(
                              "text-[9px] px-1.5 py-0 h-4",
                              paymentStatus.status === 'paid' && "bg-savings/20 text-savings border-savings/30"
                            )}
                          >
                            {paymentStatus.status === 'paid' && <Check className="h-2.5 w-2.5 mr-0.5" />}
                            {paymentStatus.status === 'due_soon' && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                            {paymentStatus.label}
                          </Badge>
                        )}
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">
                          {debt.planned_payment ? 'Planned' : 'Minimum'}
                          {debt.payment_day && ` · Day ${debt.payment_day}`}
                        </p>
                        {bankLabel && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                            {bankLabel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <AmountDisplay amount={payment} size="sm" />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 font-medium border-t border-border">
              <p>Subtotal</p>
              <AmountDisplay amount={adjustedDebtPaymentsTotal} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Annual equivalent</p>
              <p>£{(adjustedDebtPaymentsTotal * 12).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr</p>
            </div>
          </div>
        </div>
      )}

      {/* Bank Account Summary */}
      {outgoingsByAccount.length > 0 && (
        <div className="finance-card mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Outgoings by Account</p>
          </div>
          <div className="space-y-2">
            {outgoingsByAccount.map(({ account, label, total }) => (
              <div 
                key={account} 
                className="flex items-center justify-between py-2 px-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setBankAccountFilter(account === 'unassigned' ? null : account)}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {label}
                  </Badge>
                </div>
                <div className="text-right">
                  <AmountDisplay amount={total} size="sm" />
                  <p className="text-[10px] text-muted-foreground">
                    {((total / totalMonthlyOutgoings) * 100).toFixed(0)}% of total
                  </p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 font-medium border-t border-border">
              <p>Total Outgoings</p>
              <AmountDisplay amount={totalMonthlyOutgoings} size="sm" />
            </div>
          </div>
        </div>
      )}

      <IncomeFormSheet
        open={showIncomeForm} 
        onOpenChange={setShowIncomeForm}
        income={editingIncome}
      />
      <IncomeFormSheet 
        open={!!viewingIncome} 
        onOpenChange={(open) => !open && setViewingIncome(undefined)}
        income={viewingIncome}
        readOnly
      />
      <ExpenseFormSheet 
        open={showExpenseForm} 
        onOpenChange={setShowExpenseForm}
        expense={editingExpense}
      />
      <ExpenseFormSheet 
        open={!!viewingExpense} 
        onOpenChange={(open) => !open && setViewingExpense(undefined)}
        expense={viewingExpense}
        readOnly
      />
      {selectedExpenseForSub && (
        <SubExpenseSheet
          open={showSubExpenseSheet}
          onOpenChange={setShowSubExpenseSheet}
          expense={selectedExpenseForSub}
        />
      )}

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}
        onConfirm={confirmDelete}
        title={deleteConfirm.type === 'expense' ? 'Delete Expense' : 'Delete Income'}
        itemName={deleteConfirm.name}
      />

      <UnifiedAddSheet open={showUnifiedAdd} onOpenChange={setShowUnifiedAdd} />
    </div>
  );
}
