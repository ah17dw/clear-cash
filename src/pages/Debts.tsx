import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ChevronRight, Calendar, Percent, CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { useDebts, useExpenseItems, useIncomeSources } from '@/hooks/useFinanceData';
import { getDaysUntil, formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DebtFormSheet } from '@/components/debts/DebtFormSheet';
import { getAdjustedBalance } from '@/lib/debt-utils';
import { FinanceCalendar } from '@/components/finance/FinanceCalendar';

type SortOption = 'balance' | 'apr' | 'promo_ending';

export default function Debts() {
  const navigate = useNavigate();
  const { data: debts, isLoading } = useDebts();
  const { data: expenses } = useExpenseItems();
  const { data: income } = useIncomeSources();
  const [showForm, setShowForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('balance');

  const sortedDebts = [...(debts || [])].sort((a, b) => {
    switch (sortBy) {
      case 'apr':
        return (b.is_promo_0 ? 0 : b.apr) - (a.is_promo_0 ? 0 : a.apr);
      case 'promo_ending':
        if (!a.promo_end_date && !b.promo_end_date) return 0;
        if (!a.promo_end_date) return 1;
        if (!b.promo_end_date) return -1;
        return getDaysUntil(a.promo_end_date) - getDaysUntil(b.promo_end_date);
      default:
        return Number(b.balance) - Number(a.balance);
    }
  });

  // Calculate totals with adjusted balances
  const calculateAdjustedTotal = () => {
    return debts?.reduce((sum, d) => {
      const payment = Number(d.planned_payment) > 0 ? Number(d.planned_payment) : Number(d.minimum_payment) || 0;
      const { adjustedBalance } = getAdjustedBalance(
        Number(d.balance),
        d.payment_day,
        payment,
        d.created_at
      );
      return sum + adjustedBalance;
    }, 0) ?? 0;
  };
  
  const totalDebt = calculateAdjustedTotal();
  const totalMinimums = debts?.reduce((sum, d) => sum + Number(d.minimum_payment || 0), 0) ?? 0;
  const totalPlanned = debts?.reduce((sum, d) => sum + Number(d.planned_payment) > 0 ? Number(d.planned_payment) : Number(d.minimum_payment) || 0, 0) ?? 0;

  return (
    <div className="page-container">
      <PageHeader 
        title="Debts" 
        onAdd={() => setShowForm(true)}
        addLabel="Add"
      />

      {/* Total */}
      <div className="finance-card finance-card-debt mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Debt</p>
        <AmountDisplay amount={totalDebt} size="lg" className="text-debt" />
      </div>

      {/* Monthly Outgoings Summary */}
      <div className="finance-card mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Debt Outgoings</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
            className="text-xs gap-1"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </Button>
        </div>
        <AmountDisplay amount={totalMinimums} size="lg" />
        <p className="text-xs text-muted-foreground mt-1">Sum of minimum monthly payments</p>
        {totalPlanned !== totalMinimums && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Planned payments total</span>
              <AmountDisplay amount={totalPlanned} size="sm" />
            </div>
          </div>
        )}
      </div>

      {/* Sort Options */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {[
          { value: 'balance', label: 'Highest' },
          { value: 'apr', label: 'APR' },
          { value: 'promo_ending', label: '0% Ending' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setSortBy(option.value as SortOption)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              sortBy === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      {showCalendar && (
        <div className="mb-4">
          <FinanceCalendar debts={debts} expenses={expenses} income={income} />
        </div>
      )}

      {/* Debts List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="finance-card animate-pulse h-20" />
          ))}
        </div>
      ) : sortedDebts.length === 0 ? (
        <div className="finance-card text-center py-8">
          <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No debts added yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-primary text-sm mt-2 hover:underline"
          >
            Add your first debt
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedDebts.map((debt, index) => {
            const daysUntilPromoEnds = debt.promo_end_date 
              ? getDaysUntil(debt.promo_end_date) 
              : null;
            const startingBalance = Number(debt.starting_balance) || Number(debt.balance);
            const monthlyPayment = Number(debt.planned_payment) > 0 
              ? Number(debt.planned_payment) 
              : Number(debt.minimum_payment) || 0;
            
            const { adjustedBalance, paymentsMade } = getAdjustedBalance(
              Number(debt.balance),
              debt.payment_day,
              monthlyPayment,
              debt.created_at
            );
            
            const paidOff = startingBalance - adjustedBalance;
            const progress = startingBalance > 0 ? Math.min(100, Math.max(0, (paidOff / startingBalance) * 100)) : 0;
            
            // Calculate percentage of total debt for gradient
            const debtPercentage = totalDebt > 0 ? (adjustedBalance / totalDebt) * 100 : 0;
            const gradientIntensity = Math.min(debtPercentage, 100);
            
            const getNextPaymentDate = () => {
              if (!debt.payment_day) return null;
              const today = new Date();
              const paymentDay = debt.payment_day;
              let nextDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
              if (nextDate <= today) {
                nextDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
              }
              return nextDate;
            };
            const nextPaymentDate = getNextPaymentDate();

            return (
              <button
                key={debt.id}
                onClick={() => navigate(`/debts/${debt.id}`)}
                className="w-full finance-card flex flex-col gap-2 list-item-interactive animate-fade-in overflow-hidden"
                style={{ 
                  animationDelay: `${index * 30}ms`,
                  background: `linear-gradient(90deg, hsl(0 72% 51% / ${gradientIntensity * 0.15}) 0%, hsl(var(--card)) ${Math.max(gradientIntensity, 20)}%)`
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{debt.name}</p>
                      {/* Months remaining pill */}
                      {(() => {
                        if (adjustedBalance <= 0) {
                          return <span className="text-[10px] bg-savings/20 text-savings px-1.5 py-0.5 rounded-full font-medium">Paid off</span>;
                        }
                        if (monthlyPayment <= 0) {
                          return <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Set payment</span>;
                        }
                        const months = Math.ceil(adjustedBalance / monthlyPayment);
                        if (months > 240) {
                          return <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">240+ mo</span>;
                        }
                        return <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{months} mo left</span>;
                      })()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {debt.lender && <span className="truncate">{debt.lender}</span>}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <AmountDisplay amount={adjustedBalance} size="sm" />
                    {paymentsMade > 0 && (
                      <p className="text-[10px] text-muted-foreground">Est. after {paymentsMade} payment{paymentsMade > 1 ? 's' : ''}</p>
                    )}
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      {debt.is_promo_0 ? (
                        <span className="alert-badge alert-badge-info text-[10px] px-1.5 py-0.5">
                          0%
                          {daysUntilPromoEnds !== null && daysUntilPromoEnds <= 90 && (
                            <span className="ml-1">{daysUntilPromoEnds}d</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Percent className="h-3 w-3" />
                          {debt.apr}%
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>

                {/* Progress bar and next payment */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${progress}%`,
                          backgroundColor: `hsl(${Math.round(progress * 1.2)}, 70%, 45%)`
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {progress.toFixed(0)}% paid off
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {monthlyPayment > 0 ? (
                      <div>
                        <p className="text-xs font-medium">
                          £{monthlyPayment.toFixed(2)}
                        </p>
                        {nextPaymentDate && (
                          <p className="text-[10px] text-muted-foreground">
                            Due {nextPaymentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No payment set</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <DebtFormSheet open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
