import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { AmountDisplay } from '@/components/ui/amount-display';
import { FinanceSummary } from '@/types/finance';

interface NetPositionCardProps {
  summary: FinanceSummary;
}

export function NetPositionCard({ summary }: NetPositionCardProps) {
  const { totalSavings, totalDebts, netPosition } = summary;
  const isPositive = netPosition >= 0;

  return (
    <SummaryCard 
      title="Net Position" 
      icon={<Scale className="h-4 w-4" />}
    >
      <div className="space-y-4">
        <div className="text-center py-2">
          <AmountDisplay 
            amount={netPosition} 
            size="lg" 
            showSign 
          />
          <p className="text-xs text-muted-foreground mt-1">
            {isPositive ? 'You\'re in the green!' : 'Working towards positive'}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-savings-muted">
              <TrendingUp className="h-3.5 w-3.5 text-savings" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Savings</p>
              <AmountDisplay amount={totalSavings} size="sm" className="text-savings" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-debt-muted">
              <TrendingDown className="h-3.5 w-3.5 text-debt" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Debts</p>
              <AmountDisplay amount={totalDebts} size="sm" className="text-debt" />
            </div>
          </div>
        </div>
      </div>
    </SummaryCard>
  );
}
