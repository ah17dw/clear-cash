import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ChevronRight, Calendar, Percent } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { useDebts } from '@/hooks/useFinanceData';
import { getDaysUntil, formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DebtFormSheet } from '@/components/debts/DebtFormSheet';

type SortOption = 'balance' | 'apr' | 'promo_ending';

export default function Debts() {
  const navigate = useNavigate();
  const { data: debts, isLoading } = useDebts();
  const [showForm, setShowForm] = useState(false);
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

  const totalDebt = debts?.reduce((sum, d) => sum + Number(d.balance), 0) ?? 0;
  const totalMinimums = debts?.reduce((sum, d) => sum + Number(d.minimum_payment || 0), 0) ?? 0;
  const totalPlanned = debts?.reduce((sum, d) => sum + Number(d.planned_payment ?? d.minimum_payment ?? 0), 0) ?? 0;

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
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly Debt Outgoings</p>
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
            
            return (
              <button
                key={debt.id}
                onClick={() => navigate(`/debts/${debt.id}`)}
                className="w-full finance-card flex items-center gap-3 list-item-interactive animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{debt.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {debt.lender && <span className="truncate">{debt.lender}</span>}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <AmountDisplay amount={Number(debt.balance)} size="sm" />
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
              </button>
            );
          })}
        </div>
      )}

      <DebtFormSheet open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
