import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Calendar, Percent, CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { useDebt, useDeleteDebt, useDebtPayments } from '@/hooks/useFinanceData';
import { formatDateShort, formatPercentage, getDaysUntil } from '@/lib/format';
import { getAdjustedBalance } from '@/lib/debt-utils';
import { DEBT_TYPES } from '@/types/finance';
import { DebtFormSheet } from '@/components/debts/DebtFormSheet';
import { PaymentFormSheet } from '@/components/debts/PaymentFormSheet';
import { useState, useMemo } from 'react';
import { addMonths, format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DebtDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: debt, isLoading } = useDebt(id!);
  const { data: payments } = useDebtPayments(id!);
  const deleteDebt = useDeleteDebt();
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Calculate derived values - must be before any early returns to keep hooks consistent
  const rawMonthlyPayment = debt ? (Number(debt.planned_payment) > 0 ? Number(debt.planned_payment) : Number(debt.minimum_payment)) : 0;
  const rawBalance = debt ? Number(debt.balance) : 0;
  const apr = debt ? (debt.is_promo_0 ? 0 : Number(debt.apr)) : 0;
  const paymentDay = debt?.payment_day || 1;
  
  // Calculate adjusted balance (assumes payments made after due date)
  const { adjustedBalance, paymentsMade } = debt 
    ? getAdjustedBalance(rawBalance, debt.payment_day, rawMonthlyPayment, debt.created_at)
    : { adjustedBalance: 0, paymentsMade: 0 };
  
  const balance = adjustedBalance;
  const monthlyPayment = rawMonthlyPayment;

  // Generate projected statement (up to 24 months or until paid off)
  const projectedStatement = useMemo(() => {
    if (!debt || monthlyPayment <= 0 || balance <= 0) return [];
    
    const statement: { date: Date; payment: number; interest: number; balance: number }[] = [];
    let runningBalance = balance;
    const monthlyRate = apr / 100 / 12;
    
    // Start from next month
    let currentDate = new Date();
    currentDate.setDate(paymentDay);
    if (currentDate <= new Date()) {
      currentDate = addMonths(currentDate, 1);
    }

    for (let i = 0; i < 24 && runningBalance > 0; i++) {
      const interest = runningBalance * monthlyRate;
      const payment = Math.min(monthlyPayment, runningBalance + interest);
      runningBalance = Math.max(0, runningBalance + interest - payment);
      
      statement.push({
        date: currentDate,
        payment,
        interest,
        balance: runningBalance,
      });
      
      currentDate = addMonths(currentDate, 1);
    }
    
    return statement;
  }, [debt, balance, monthlyPayment, apr, paymentDay]);

  if (isLoading || !debt) {
    return (
      <div className="page-container">
        <PageHeader title="Loading..." showBack />
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const debtType = DEBT_TYPES.find((t) => t.value === debt.type)?.label || debt.type;
  const daysUntilPromoEnds = debt.promo_end_date ? getDaysUntil(debt.promo_end_date) : null;
  const monthsToPayoff = monthlyPayment > 0 ? Math.ceil(balance / monthlyPayment) : null;

  const handleDelete = async () => {
    await deleteDebt.mutateAsync(debt.id);
    navigate('/debts');
  };

  return (
    <div className="page-container">
      <PageHeader 
        title={debt.name} 
        showBack 
        rightContent={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDelete(true)}
            className="text-debt"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        }
      />

      {/* Balance Card */}
      <div className="finance-card finance-card-debt mb-4 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {paymentsMade > 0 ? 'Estimated Balance' : 'Current Balance'}
        </p>
        <AmountDisplay amount={balance} size="lg" className="text-debt" />
        {paymentsMade > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            After {paymentsMade} assumed payment{paymentsMade > 1 ? 's' : ''} (DB: {formatCurrency(rawBalance)})
          </p>
        )}
        {debt.starting_balance > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Started at {formatCurrency(Number(debt.starting_balance))}
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setShowEdit(true)} variant="outline" className="flex-1">
          Edit Details
        </Button>
        <Button onClick={() => setShowPayment(true)} className="flex-1">
          Record Payment
        </Button>
      </div>

      {/* Details */}
      <div className="finance-card space-y-4 mb-4">
        <h3 className="font-medium">Details</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Type</p>
            <p className="font-medium">{debtType}</p>
          </div>
          {debt.lender && (
            <div>
              <p className="text-muted-foreground text-xs">Lender</p>
              <p className="font-medium">{debt.lender}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">APR</p>
            <p className="font-medium flex items-center gap-1">
              {debt.is_promo_0 ? (
                <span className="alert-badge alert-badge-info">0% Promo</span>
              ) : (
                <>{formatPercentage(Number(debt.apr))}</>
              )}
            </p>
          </div>
          {debt.payment_day && (
            <div>
              <p className="text-muted-foreground text-xs">Payment Day</p>
              <p className="font-medium">{debt.payment_day}th of month</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Minimum Payment</p>
            <AmountDisplay amount={Number(debt.minimum_payment)} size="sm" />
          </div>
          {debt.planned_payment && (
            <div>
              <p className="text-muted-foreground text-xs">Planned Payment</p>
              <AmountDisplay amount={Number(debt.planned_payment)} size="sm" />
            </div>
          )}
        </div>

        {/* Promo Period */}
        {debt.is_promo_0 && debt.promo_end_date && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">0% Period Ends</p>
                <p className="font-medium">{formatDateShort(debt.promo_end_date)}</p>
              </div>
              {daysUntilPromoEnds !== null && (
                <span className={`alert-badge ${daysUntilPromoEnds <= 30 ? 'alert-badge-danger' : 'alert-badge-warning'}`}>
                  <Calendar className="h-3 w-3" />
                  {daysUntilPromoEnds} days left
                </span>
              )}
            </div>
            {debt.post_promo_apr && (
              <p className="text-xs text-muted-foreground mt-1">
                Then {formatPercentage(Number(debt.post_promo_apr))} APR
              </p>
            )}
          </div>
        )}

        {/* Payoff Estimate */}
        {monthsToPayoff && monthsToPayoff > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-muted-foreground text-xs">Estimated Payoff</p>
            <p className="font-medium">
              ~{monthsToPayoff} months at current payment
            </p>
          </div>
        )}

        {/* Notes */}
        {debt.notes && (
          <div className="pt-3 border-t border-border">
            <p className="text-muted-foreground text-xs">Notes</p>
            <p className="text-sm">{debt.notes}</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="finance-card">
        <h3 className="font-medium mb-3">Payment History</h3>
        {payments && payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm">{formatDateShort(payment.paid_on)}</p>
                  {payment.note && (
                    <p className="text-xs text-muted-foreground">{payment.note}</p>
                  )}
                </div>
                <AmountDisplay amount={Number(payment.amount)} size="sm" className="text-savings" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payments recorded yet
          </p>
        )}
      </div>

      {/* Projected Statement */}
      {projectedStatement.length > 0 && (
        <div className="finance-card mt-4">
          <h3 className="font-medium mb-3">Projected Statement</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Based on £{monthlyPayment.toFixed(2)}/mo payment on the {debt.payment_day || 1}th
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b border-border sticky top-0 bg-card">
              <span>Date</span>
              <span className="text-right">Payment</span>
              <span className="text-right">Interest</span>
              <span className="text-right">Balance</span>
            </div>
            {projectedStatement.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-4 gap-2 text-xs py-1.5 border-b border-border/50 last:border-0"
              >
                <span>{format(row.date, 'd MMM yy')}</span>
                <span className="text-right text-savings">-£{row.payment.toFixed(2)}</span>
                <span className="text-right text-muted-foreground">
                  {row.interest > 0 ? `+£${row.interest.toFixed(2)}` : '—'}
                </span>
                <span className="text-right font-medium">
                  £{row.balance.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          {projectedStatement.length > 0 && projectedStatement[projectedStatement.length - 1].balance === 0 && (
            <p className="text-xs text-savings font-medium mt-3 text-center">
              🎉 Paid off in {projectedStatement.length} months!
            </p>
          )}
        </div>
      )}

      <DebtFormSheet open={showEdit} onOpenChange={setShowEdit} debt={debt} />
      <PaymentFormSheet open={showPayment} onOpenChange={setShowPayment} debtId={debt.id} />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Debt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{debt.name}"? This will also remove all payment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}
