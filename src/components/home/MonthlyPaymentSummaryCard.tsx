import { format } from 'date-fns';
import { Check, Clock, CalendarDays } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Badge } from '@/components/ui/badge';
import { useExpenseItems, useDebts } from '@/hooks/useFinanceData';
import { useRenewals } from '@/hooks/useRenewals';
import { useMemo } from 'react';

interface PaymentItem {
  id: string;
  name: string;
  amount: number;
  paymentDay: number;
  type: 'expense' | 'debt' | 'renewal';
}

export function MonthlyPaymentSummaryCard() {
  const { data: expenses } = useExpenseItems();
  const { data: debts } = useDebts();
  const { data: renewals } = useRenewals();

  const currentMonth = format(new Date(), 'MMMM');
  const currentDay = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  const { paidItems, upcomingItems, paidTotal, upcomingTotal } = useMemo(() => {
    const items: PaymentItem[] = [];

    // Add monthly expenses (not linked, not annual)
    expenses?.forEach(expense => {
      if (expense.linked_parent_id) return;
      if (expense.frequency === 'annual') return;
      if (!expense.payment_day) return;
      
      const multiplier = expense.couples_mode ? 0.5 : 1;
      items.push({
        id: expense.id,
        name: expense.name,
        amount: Number(expense.monthly_amount) * multiplier,
        paymentDay: expense.payment_day,
        type: 'expense',
      });
    });

    // Add debts
    debts?.forEach(debt => {
      if (!debt.payment_day) return;
      const payment = Number(debt.planned_payment) || Number(debt.minimum_payment);
      items.push({
        id: debt.id,
        name: debt.name,
        amount: payment,
        paymentDay: debt.payment_day,
        type: 'debt',
      });
    });

    // Add monthly renewals shown in cashflow
    renewals?.forEach(renewal => {
      if (!renewal.show_in_cashflow) return;
      if (renewal.linked_expense_id) return;
      if (renewal.frequency === 'annually' && !renewal.is_monthly_payment) return;
      
      // For renewals, we don't have payment_day - skip them from day-based tracking
      // They contribute to totals but not to paid/upcoming split
    });

    const paid = items.filter(item => item.paymentDay < currentDay);
    const upcoming = items.filter(item => item.paymentDay >= currentDay);

    const paidSum = paid.reduce((sum, item) => sum + item.amount, 0);
    const upcomingSum = upcoming.reduce((sum, item) => sum + item.amount, 0);

    // Sort upcoming by payment day
    upcoming.sort((a, b) => a.paymentDay - b.paymentDay);

    return {
      paidItems: paid,
      upcomingItems: upcoming,
      paidTotal: paidSum,
      upcomingTotal: upcomingSum,
    };
  }, [expenses, debts, renewals, currentDay]);

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Get date range for upcoming payments
  const upcomingDateRange = useMemo(() => {
    if (upcomingItems.length === 0) return null;
    const firstDay = Math.min(...upcomingItems.map(i => i.paymentDay));
    const lastDay = Math.max(...upcomingItems.map(i => i.paymentDay));
    
    if (firstDay === lastDay) {
      return `${firstDay}${getOrdinalSuffix(firstDay)}`;
    }
    return `${firstDay}${getOrdinalSuffix(firstDay)} - ${lastDay}${getOrdinalSuffix(lastDay)}`;
  }, [upcomingItems]);

  // Truncate list to first 4 items with "+X more" indicator
  const truncateList = (items: PaymentItem[], max: number = 4) => {
    if (items.length <= max) {
      return { visible: items, remaining: 0 };
    }
    return { visible: items.slice(0, max), remaining: items.length - max };
  };

  const paidDisplay = truncateList(paidItems);
  const upcomingDisplay = truncateList(upcomingItems);

  return (
    <SummaryCard 
      title={`${currentMonth} Payments`} 
      icon={<CalendarDays className="h-4 w-4" />}
    >
      <div className="space-y-4">
        {/* Paid Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-savings" />
              <span className="text-sm font-medium">Paid</span>
            </div>
            <AmountDisplay amount={paidTotal} size="sm" className="text-savings" />
          </div>
          
          {paidItems.length > 0 ? (
            <div className="pl-5">
              <p className="text-xs text-muted-foreground">
                {paidDisplay.visible.map(i => i.name).join(', ')}
                {paidDisplay.remaining > 0 && ` +${paidDisplay.remaining} more`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground pl-5 italic">No payments yet this month</p>
          )}
        </div>

        {/* Upcoming Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Upcoming</span>
            </div>
            <AmountDisplay amount={upcomingTotal} size="sm" />
          </div>
          
          {upcomingItems.length > 0 ? (
            <div className="pl-5 space-y-1">
              <p className="text-xs text-muted-foreground">
                {upcomingItems.length} payment{upcomingItems.length !== 1 ? 's' : ''}: {upcomingDisplay.visible.map(i => i.name).join(', ')}
                {upcomingDisplay.remaining > 0 && ` +${upcomingDisplay.remaining} more`}
              </p>
              {upcomingDateRange && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {upcomingDateRange}
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground pl-5 italic">All payments complete</p>
          )}
        </div>

        {/* Progress indicator */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Month progress</span>
            <span>{Math.round((currentDay / daysInMonth) * 100)}% ({currentDay}/{daysInMonth} days)</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(currentDay / daysInMonth) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </SummaryCard>
  );
}
