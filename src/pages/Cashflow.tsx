import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Edit2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
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

  const totalIncome = income?.reduce((sum, i) => sum + Number(i.monthly_amount), 0) ?? 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.monthly_amount), 0) ?? 0;
  const debtPayments = debts?.reduce((sum, d) => {
    const payment = d.planned_payment ?? d.minimum_payment;
    return sum + Number(payment);
  }, 0) ?? 0;
  const totalOutgoings = totalExpenses + debtPayments;
  const surplus = totalIncome - totalOutgoings;

  const getCategoryLabel = (value: string | null) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? 'Other';
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
                <p className="text-sm">{source.name}</p>
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

      {/* Expenses Section */}
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

        {expenses && expenses.length > 0 ? (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm">{expense.name}</p>
                  <p className="text-xs text-muted-foreground">{getCategoryLabel(expense.category)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AmountDisplay amount={Number(expense.monthly_amount)} size="sm" />
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
            ))}
            <div className="flex items-center justify-between pt-2 font-medium">
              <p>Subtotal</p>
              <AmountDisplay amount={totalExpenses} size="sm" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No expenses added
          </p>
        )}
      </div>

      {/* Debt Payments Section */}
      {debts && debts.length > 0 && (
        <div className="finance-card">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpCircle className="h-4 w-4 text-debt" />
            <h3 className="font-medium">Debt Payments</h3>
          </div>

          <div className="space-y-2">
            {debts.map((debt) => {
              const payment = debt.planned_payment ?? debt.minimum_payment;
              return (
                <div
                  key={debt.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm">{debt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {debt.planned_payment ? 'Planned' : 'Minimum'}
                    </p>
                  </div>
                  <AmountDisplay amount={Number(payment)} size="sm" />
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 font-medium">
              <p>Subtotal</p>
              <AmountDisplay amount={debtPayments} size="sm" />
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
