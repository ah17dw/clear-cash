import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Users, ArrowUpDown, ChevronRight, CalendarDays, CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  useIncomeSources, 
  useExpenseItems, 
  useDebts,
  useDeleteIncomeSource,
  useDeleteExpenseItem,
  useUpdateExpenseItem,
} from '@/hooks/useFinanceData';
import { useAllSubExpenses } from '@/hooks/useSubExpenses';
import { IncomeFormSheet } from '@/components/cashflow/IncomeFormSheet';
import { ExpenseFormSheet } from '@/components/cashflow/ExpenseFormSheet';
import { SubExpenseSheet } from '@/components/cashflow/SubExpenseSheet';
import { FinanceCalendar } from '@/components/finance/FinanceCalendar';
import { EXPENSE_CATEGORIES, IncomeSource, ExpenseItem } from '@/types/finance';

type SortOption = 'due' | 'value';

export default function Cashflow() {
  const navigate = useNavigate();
  const { data: income } = useIncomeSources();
  const { data: expenses } = useExpenseItems();
  const { data: debts } = useDebts();
  const { data: allSubExpenses } = useAllSubExpenses();
  
  const deleteIncome = useDeleteIncomeSource();
  const deleteExpense = useDeleteExpenseItem();
  const updateExpense = useUpdateExpenseItem();
  
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | undefined>();
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | undefined>();
  const [showSubExpenseSheet, setShowSubExpenseSheet] = useState(false);
  const [selectedExpenseForSub, setSelectedExpenseForSub] = useState<ExpenseItem | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [sortBy, setSortBy] = useState<SortOption>('value');

  const totalIncome = income?.reduce((sum, i) => sum + Number(i.monthly_amount), 0) ?? 0;
  
  // Split expenses by frequency
  const { monthlyExpenses, annualExpenses } = useMemo(() => {
    const monthly = expenses?.filter(e => e.frequency !== 'annual') ?? [];
    const annual = expenses?.filter(e => e.frequency === 'annual') ?? [];
    return { monthlyExpenses: monthly, annualExpenses: annual };
  }, [expenses]);

  // Calculate adjusted expenses (per-item, persisted per expense)
  const adjustedMonthlyExpensesTotal = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => {
      const multiplier = e.couples_mode ? 0.5 : 1;
      return sum + Number(e.monthly_amount) * multiplier;
    }, 0);
  }, [monthlyExpenses]);

  const adjustedAnnualExpensesTotal = useMemo(() => {
    return annualExpenses.reduce((sum, e) => {
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

  const totalMonthlyOutgoings = adjustedMonthlyExpensesTotal + adjustedDebtPaymentsTotal + annualAsMonthly;
  const surplus = totalIncome - totalMonthlyOutgoings;

  // Sorted expenses
  const sortedMonthlyExpenses = useMemo(() => {
    return [...monthlyExpenses].sort((a, b) => {
      if (sortBy === 'value') {
        return Number(b.monthly_amount) - Number(a.monthly_amount);
      }
      return a.name.localeCompare(b.name);
    });
  }, [monthlyExpenses, sortBy]);

  const sortedAnnualExpenses = useMemo(() => {
    return [...annualExpenses].sort((a, b) => {
      if (sortBy === 'value') {
        return Number(b.monthly_amount) - Number(a.monthly_amount);
      }
      return a.name.localeCompare(b.name);
    });
  }, [annualExpenses, sortBy]);

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

  const getCategoryLabel = (value: string | null) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? 'Other';
  };

  const getInitialIcon = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getSubExpenseCount = (expenseId: string) => {
    return allSubExpenses?.filter((s) => s.parent_expense_id === expenseId).length ?? 0;
  };

  const handleDebtClick = (debtId: string) => {
    navigate(`/debts/${debtId}`);
  };

  const renderExpenseItem = (expense: ExpenseItem, isAnnual: boolean = false) => {
    const fullAmount = Number(expense.monthly_amount);
    const isCouples = !!expense.couples_mode;
    const displayAmount = fullAmount * (isCouples ? 0.5 : 1);
    const subCount = getSubExpenseCount(expense.id);
    
    return (
      <div
        key={expense.id}
        className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded transition-colors"
        onDoubleClick={() => { setEditingExpense(expense); setShowExpenseForm(true); }}
      >
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => {
            setSelectedExpenseForSub(expense);
            setShowSubExpenseSheet(true);
          }}
        >
          <div className="w-8 h-8 rounded-full bg-debt/20 flex items-center justify-center text-debt font-semibold text-sm">
            {getInitialIcon(expense.name)}
          </div>
          <div>
            <p className="text-sm flex items-center gap-1">
              {expense.name}
              {subCount > 0 && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                  {subCount} sub
                </span>
              )}
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </p>
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
              onCheckedChange={(checked) => updateExpense.mutate({ id: expense.id, couples_mode: checked })}
              className="scale-75"
            />
          </div>
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
  };

  return (
    <div className="page-container">
      <PageHeader title="Cashflow" />

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
          <div className="space-y-2">
            {income.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded transition-colors"
                onDoubleClick={() => {
                  setEditingIncome(source);
                  setShowIncomeForm(true);
                }}
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
        <h2 className="text-lg font-semibold">Outgoings</h2>
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

        {sortedMonthlyExpenses.length > 0 ? (
          <div className="space-y-2">
            {sortedMonthlyExpenses.map((expense) => renderExpenseItem(expense, false))}
            <div className="flex items-center justify-between pt-2 font-medium">
              <p>Subtotal</p>
              <AmountDisplay amount={adjustedMonthlyExpensesTotal} size="sm" />
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

        {sortedAnnualExpenses.length > 0 ? (
          <div className="space-y-2">
            {sortedAnnualExpenses.map((expense) => renderExpenseItem(expense, true))}
            <div className="flex items-center justify-between pt-2 font-medium border-t border-border">
              <p>Subtotal (Annual)</p>
              <AmountDisplay amount={adjustedAnnualExpensesTotal} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Monthly equivalent</p>
              <p>£{annualAsMonthly.toFixed(2)}/mo</p>
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
                      <p className="text-sm flex items-center gap-1">
                        {debt.name}
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {debt.planned_payment ? 'Planned' : 'Minimum'}
                        {debt.payment_day && ` · Day ${debt.payment_day}`}
                      </p>
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
      {selectedExpenseForSub && (
        <SubExpenseSheet
          open={showSubExpenseSheet}
          onOpenChange={setShowSubExpenseSheet}
          expense={selectedExpenseForSub}
        />
      )}
    </div>
  );
}
