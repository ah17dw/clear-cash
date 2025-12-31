import { AlertTriangle, Clock, Percent, CreditCard, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/types/finance';
import { cn } from '@/lib/utils';

interface AlertsListProps {
  alerts: Alert[];
}

const alertIcons = {
  promo_ending: Clock,
  payment_due: AlertTriangle,
  high_apr: Percent,
  monthly_payments: CreditCard,
  upcoming_payments: CalendarDays,
};

export function AlertsList({ alerts }: AlertsListProps) {
  const navigate = useNavigate();

  if (alerts.length === 0) {
    return (
      <div className="finance-card animate-fade-in">
        <p className="text-center text-muted-foreground py-4">
          No alerts at the moment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground mb-3">Alerts</h2>
      {alerts.map((alert, index) => {
        const Icon = alertIcons[alert.type];
        
        return (
          <button
            key={alert.id}
            onClick={() => alert.debtId && navigate(`/debts/${alert.debtId}`)}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors animate-fade-in',
              'hover:bg-muted/50 active:bg-muted',
              alert.severity === 'danger' && 'bg-debt-muted',
              alert.severity === 'warning' && 'bg-warning/10',
              alert.severity === 'info' && 'bg-primary/5'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={cn(
                'p-1.5 rounded-full flex-shrink-0',
                alert.severity === 'danger' && 'bg-debt/20 text-debt',
                alert.severity === 'warning' && 'bg-warning/20 text-warning',
                alert.severity === 'info' && 'bg-primary/20 text-primary'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{alert.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {alert.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
