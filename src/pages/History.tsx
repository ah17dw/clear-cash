import { useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { History as HistoryIcon, Plus, Pencil, Trash2, Filter } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuditLog } from '@/hooks/useAuditLog';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ENTITY_LABELS: Record<string, string> = {
  task: 'Task',
  debt: 'Debt',
  expense: 'Expense',
  income: 'Income',
  savings: 'Savings',
  renewal: 'Renewal',
  debt_payment: 'Debt Payment',
  savings_transaction: 'Savings Transaction',
};

const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-savings text-savings-foreground',
  update: 'bg-primary text-primary-foreground',
  delete: 'bg-debt text-debt-foreground',
};

export default function History() {
  const [filter, setFilter] = useState<string>('all');
  const [daysBack, setDaysBack] = useState<number>(30);
  
  const { data: auditLog, isLoading } = useAuditLog(daysBack);

  const filteredLog = auditLog?.filter(entry => {
    if (filter === 'all') return true;
    return entry.entity_type === filter;
  }) ?? [];

  // Group entries by date
  const groupedEntries = filteredLog.reduce((acc, entry) => {
    const date = format(parseISO(entry.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, typeof filteredLog>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeader title="History" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title="History" />

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="debt">Debts</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="renewal">Renewals</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(daysBack)} onValueChange={(v) => setDaysBack(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* History List */}
      {sortedDates.length === 0 ? (
        <div className="finance-card text-center py-8">
          <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No activity recorded yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Changes you make will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="space-y-2">
                {groupedEntries[date].map(entry => {
                  const Icon = ACTION_ICONS[entry.action] ?? Pencil;
                  return (
                    <div
                      key={entry.id}
                      className="finance-card p-3 flex items-start gap-3"
                    >
                      <div className={cn(
                        'p-1.5 rounded-full shrink-0',
                        ACTION_COLORS[entry.action] ?? 'bg-muted'
                      )}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {entry.action === 'create' && 'Created'}
                            {entry.action === 'update' && 'Updated'}
                            {entry.action === 'delete' && 'Deleted'}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                          </Badge>
                        </div>
                        <p className="text-sm truncate mt-0.5">
                          {entry.entity_name || 'Unnamed item'}
                        </p>
                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Changed: {Object.keys(entry.changes).join(', ')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(entry.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
