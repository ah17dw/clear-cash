import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CreditCard, ArrowUpCircle, Wallet, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Debt, ExpenseItem, IncomeSource } from '@/types/finance';

interface CalendarEvent {
  date: Date;
  type: 'debt_payment' | 'promo_end' | 'expense' | 'income' | 'renewal';
  label: string;
  amount?: number;
  isWarning?: boolean;
  color: string;
}

interface FinanceCalendarProps {
  debts?: Debt[];
  expenses?: ExpenseItem[];
  income?: IncomeSource[];
}

export function FinanceCalendar({ debts = [], expenses = [], income = [] }: FinanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Debt payment dates (recurring on payment_day)
    debts.forEach(debt => {
      if (debt.payment_day && Number(debt.balance) > 0) {
        const paymentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), debt.payment_day);
        if (paymentDate >= monthStart && paymentDate <= monthEnd) {
          const payment = Number(debt.planned_payment) || Number(debt.minimum_payment);
          allEvents.push({
            date: paymentDate,
            type: 'debt_payment',
            label: `${debt.name}`,
            amount: payment,
            color: 'bg-debt',
          });
        }
      }

      // 0% promo end dates
      if (debt.promo_end_date && debt.is_promo_0) {
        const promoEnd = new Date(debt.promo_end_date);
        if (promoEnd >= monthStart && promoEnd <= monthEnd) {
          allEvents.push({
            date: promoEnd,
            type: 'promo_end',
            label: `0% ends: ${debt.name}`,
            isWarning: true,
            color: 'bg-amber-500',
          });
        }
      }
    });

    // Expense renewal dates
    expenses.forEach(expense => {
      if (expense.renewal_date) {
        const renewalDate = new Date(expense.renewal_date);
        if (renewalDate >= monthStart && renewalDate <= monthEnd) {
          allEvents.push({
            date: renewalDate,
            type: 'renewal',
            label: `Renewal: ${expense.name}`,
            amount: Number(expense.monthly_amount),
            color: 'bg-primary',
          });
        }
      }
    });

    return allEvents;
  }, [debts, expenses, income, currentMonth]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Pad days to start on correct weekday
  const startDayOfWeek = startOfMonth(currentMonth).getDay(); // 0 = Sunday
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getEventsForDay = (date: Date) => {
    return events.filter(e => isSameDay(e.date, date));
  };

  const goToPrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="finance-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <Button variant="link" size="sm" onClick={goToToday} className="text-xs p-0 h-auto">
            Today
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for start of month */}
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        
        {/* Actual days */}
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          const hasWarning = dayEvents.some(e => e.isWarning);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'aspect-square p-0.5 rounded-md flex flex-col items-center justify-start text-xs relative overflow-hidden',
                isToday(day) && 'ring-2 ring-primary',
                hasEvents && 'bg-muted/50'
              )}
            >
              <span className={cn(
                'font-medium',
                isToday(day) && 'text-primary'
              )}>
                {format(day, 'd')}
              </span>
              
              {/* Event indicators */}
              {hasEvents && (
                <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        event.color
                      )}
                      title={event.label}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-debt" />
            <span>Debt payment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>0% ends</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Renewal</span>
          </div>
        </div>
      </div>

      {/* Events list for current month */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">This Month</p>
          <div className="space-y-2">
            {events
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((event, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', event.color)} />
                    <span className="text-muted-foreground">{format(event.date, 'd MMM')}</span>
                    <span className={event.isWarning ? 'text-amber-600 font-medium' : ''}>
                      {event.label}
                    </span>
                  </div>
                  {event.amount && (
                    <span className="font-medium">£{event.amount.toFixed(2)}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
