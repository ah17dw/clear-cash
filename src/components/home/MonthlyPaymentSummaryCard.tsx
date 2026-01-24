import { format } from 'date-fns';
import { Check, Clock, CalendarDays, ChevronDown } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Badge } from '@/components/ui/badge';
import { useExpenseItems, useDebts } from '@/hooks/useFinanceData';
import { useRenewals } from '@/hooks/useRenewals';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const navigate = useNavigate();
  
  const [paidOpen, setPaidOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);

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

    const paid = items.filter(item => item.paymentDay < currentDay);
    const upcoming = items.filter(item => item.paymentDay >= currentDay);

    const paidSum = paid.reduce((sum, item) => sum + item.amount, 0);
    const upcomingSum = upcoming.reduce((sum, item) => sum + item.amount, 0);

    // Sort by payment day
    paid.sort((a, b) => a.paymentDay - b.paymentDay);
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

  const upcomingDateRange = useMemo(() => {
    if (upcomingItems.length === 0) return null;
    const firstDay = Math.min(...upcomingItems.map(i => i.paymentDay));
    const lastDay = Math.max(...upcomingItems.map(i => i.paymentDay));
    
    if (firstDay === lastDay) {
      return `${firstDay}${getOrdinalSuffix(firstDay)}`;
    }
    return `${firstDay}${getOrdinalSuffix(firstDay)} - ${lastDay}${getOrdinalSuffix(lastDay)}`;
  }, [upcomingItems]);

  const handleItemClick = (item: PaymentItem) => {
    if (item.type === 'expense') {
      navigate('/cashflow');
    } else if (item.type === 'debt') {
      navigate(`/debts/${item.id}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <SummaryCard 
      title={`${currentMonth} Payments`} 
      icon={<CalendarDays className="h-4 w-4" />}
    >
      <div className="space-y-3">
        {/* Paid Section */}
        <Collapsible open={paidOpen} onOpenChange={setPaidOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-savings-muted">
                  <Check className="h-3.5 w-3.5 text-savings" />
                </div>
                <span className="text-sm font-medium">Paid</span>
                <Badge variant="secondary" className="text-xs">
                  {paidItems.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <AmountDisplay amount={paidTotal} size="sm" className="text-savings" />
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${paidOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-1 pl-2">
              {paidItems.length > 0 ? (
                paidItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-savings" />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.paymentDay}{getOrdinalSuffix(item.paymentDay)}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-2 pl-6">No payments yet this month</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Upcoming Section */}
        <Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-muted">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">Upcoming</span>
                <Badge variant="secondary" className="text-xs">
                  {upcomingItems.length}
                </Badge>
                {upcomingDateRange && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {upcomingDateRange}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <AmountDisplay amount={upcomingTotal} size="sm" />
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${upcomingOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-1 pl-2">
              {upcomingItems.length > 0 ? (
                upcomingItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.paymentDay}{getOrdinalSuffix(item.paymentDay)}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-2 pl-6">All payments complete</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

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
