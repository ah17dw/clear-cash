import { useState, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Edit2, Users, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  useIncomeSources, 
  useExpenseItems, 
  useDebts,
  useDeleteIncomeSource,
  useDeleteExpenseItem 
} from '@/hooks/useFinanceData';
import { IncomeFormSheet } from '@/components/cashflow/IncomeFormSheet';
import { ExpenseFormSheet } from '@/components/cashflow/ExpenseFormSheet';
import { EXPENSE_CATEGORIES, IncomeSource, ExpenseItem } from '@/types/finance';

type SortOption = 'due' | 'value';

// Store per-item couples mode in local state (keyed by expense id)
type CouplesMap = Record<string, boolean>;

export default function Cashflow() {
  const { data: income } = useIncomeSources();
  const { data: expenses } = useExpenseItems();
  const { data: debts } = useDebts();
  
  const deleteIncome = useDeleteIncomeSource();
  const deleteExpense = useDeleteExpenseItem();
  
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | undefined>();
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | undefined>();
  
  // Per-item couples mode (default: all ON)
  const [expenseCouplesMode, setExpenseCouplesMode] = useState<CouplesMap>({});
  const [debtCouplesMode, setDebtCouplesMode] = useState<CouplesMap>({});
  const [sortBy, setSortBy] = useState<SortOption>('value');

  // Helper to get couples mode for an expense (default true)
  const getExpenseCouples = (id: string) => expenseCouplesMode[id] ?? true;
  const getDebtCouples = (id: string) => debtCouplesMode[id] ?? true;

  const toggleExpenseCouples = (id: string) => {
    setExpenseCouplesMode(prev => ({ ...prev, [id]: !getExpenseCouples(id) }));
  };

  const toggleDebtCouples = (id: string) => {
    setDebtCouplesMode(prev => ({ ...prev, [id]: !getDebtCouples(id) }));
  };

  const totalIncome = income?.reduce((sum, i) => sum + Number(i.monthly_amount), 0) ?? 0;
  
  // Calculate adjusted expenses (per-item)
  const adjustedExpensesTotal = useMemo(() => {
    return expenses?.reduce((sum, e) => {
      const multiplier = getExpenseCouples(e.id) ? 0.5 : 1;
      return sum + Number(e.monthly_amount) * multiplier;
    }, 0) ?? 0;
  }, [expenses, expenseCouplesMode]);

  // Calculate adjusted debt payments (per-item) - Fix: use || instead of ?? for proper fallback
  const adjustedDebtPaymentsTotal = useMemo(() => {
    return debts?.reduce((sum, d) => {
      const payment = Number(d.planned_payment) || Number(d.minimum_payment);
      const multiplier = getDebtCouples(d.id) ? 0.5 : 1;
      return sum + payment * multiplier;
    }, 0) ?? 0;
  }, [debts, debtCouplesMode]);

  const totalOutgoings = adjustedExpensesTotal + adjustedDebtPaymentsTotal;
  const surplus = totalIncome - totalOutgoings;

  // Sorted expenses
  const sortedExpenses = useMemo(() => {
    if (!expenses) return [];
    return [...expenses].sort((a, b) => {
      if (sortBy === 'value') {
        return Number(b.monthly_amount) - Number(a.monthly_amount);
      }
      // Sort by due - no payment_day on expenses, so just alphabetical as fallback
      return a.name.localeCompare(b.name);
    });
  }, [expenses, sortBy]);

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
      // Sort by days until next payment
      const aDays = a.payment_day ? (a.payment_day >= currentDay ? a.payment_day - currentDay : 30 - currentDay + a.payment_day) : 999;
      const bDays = b.payment_day ? (b.payment_day >= currentDay ? b.payment_day - currentDay : 30 - currentDay + b.payment_day) : 999;
      return aDays - bDays;
    });
  }, [debts, sortBy]);

  const getCategoryLabel = (value: string | null) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? 'Other';
  };

  const getInitialIcon = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="page-container">
      <PageHeader title="Cashflow" />

      {/* Summary Card */}
      <div className="finance-card mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Income</p>
            <AmountDisplay amount={totalIncome} size="sm" className="text-savings" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Outgoings</p>
            <AmountDisplay amount={totalOutgoings} size="sm" className="text-debt" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {surplus >= 0 ? 'Surplus' : 'Deficit'}
            </p>
            <AmountDisplay amount={surplus} size="sm" showSign />
          </div>
        </div>
      </div>

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
          <div className="space-y-2">
            {income.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-savings/20 flex items-center justify-center text-savings font-semibold text-sm">
                    {getInitialIcon(source.name)}
                  </div>
                  <p className="text-sm">{source.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AmountDisplay amount={Number(source.monthly_amount)} size="sm" />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingIncome(source);
                      setShowIncomeForm(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-debt"
                    onClick={() => deleteIncome.mutate(source.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 font-medium">
              <p>Total</p>
              <AmountDisplay amount={totalIncome} size="sm" className="text-savings" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No income sources added
          </p>
        )}
      </div>

      {/* Outgoings Header with Sort */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Monthly Outgoings</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSortBy(sortBy === 'value' ? 'due' : 'value')}
          className="text-xs"
        >
          <ArrowUpDown className="h-3 w-3 mr-1" />
          {sortBy === 'value' ? 'By Value' : 'By Due'}
        </Button>
      </div>

      {/* Expenses Section */}
      <div className="finance-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-debt" />
            <h3 className="font-medium">Expenses</h3>
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

        {sortedExpenses.length > 0 ? (
          <div className="space-y-2">
            {sortedExpenses.map((expense) => {
              const fullAmount = Number(expense.monthly_amount);
              const isCouples = getExpenseCouples(expense.id);
              const displayAmount = fullAmount * (isCouples ? 0.5 : 1);
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-debt/20 flex items-center justify-center text-debt font-semibold text-sm">
                      {getInitialIcon(expense.name)}
                    </div>
                    <div>
                      <p className="text-sm">{expense.name}</p>
                      <p className="text-xs text-muted-foreground">{getCategoryLabel(expense.category)}</p>
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
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <Switch
                        checked={isCouples}
                        onCheckedChange={() => toggleExpenseCouples(expense.id)}
                        className="scale-75"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingExpense(expense);
                        setShowExpenseForm(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-debt"
                      onClick={() => deleteExpense.mutate(expense.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 font-medium">
              <p>Subtotal</p>
              <AmountDisplay amount={adjustedExpensesTotal} size="sm" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No expenses added
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
              const fullPayment = Number(debt.planned_payment) || Number(debt.minimum_payment);
              const isCouples = getDebtCouples(debt.id);
              const displayPayment = fullPayment * (isCouples ? 0.5 : 1);
              return (
                <div
                  key={debt.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-debt/20 flex items-center justify-center text-debt font-semibold text-sm">
                      {getInitialIcon(debt.name)}
                    </div>
                    <div>
                      <p className="text-sm">{debt.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {debt.planned_payment ? 'Planned' : 'Minimum'}
                        {debt.payment_day && ` · Day ${debt.payment_day}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <AmountDisplay amount={displayPayment} size="sm" />
                      {isCouples && (
                        <p className="text-[10px] text-muted-foreground line-through">
                          £{fullPayment.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <Switch
                        checked={isCouples}
                        onCheckedChange={() => toggleDebtCouples(debt.id)}
                        className="scale-75"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 font-medium">
              <p>Subtotal</p>
              <AmountDisplay amount={adjustedDebtPaymentsTotal} size="sm" />
            </div>
          </div>
        </div>
      )}

      <IncomeFormSheet 
        open={showIncomeForm} 
        onOpenChange={setShowIncomeForm}
        income={editingIncome}
      />
      <ExpenseFormSheet 
        open={showExpenseForm} 
        onOpenChange={setShowExpenseForm}
        expense={editingExpense}
      />
    </div>
  );
}