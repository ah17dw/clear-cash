import { TrendingUp, TrendingDown, Scale, Wallet, AlertCircle } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Badge } from '@/components/ui/badge';
import { FinanceSummary } from '@/types/finance';
import { useIncomeSources } from '@/hooks/useFinanceData';
import { useMemo } from 'react';

interface NetPositionCardProps {
  summary: FinanceSummary;
}

export function NetPositionCard({ summary }: NetPositionCardProps) {
  const { totalSavings, totalDebts, monthlyIncoming } = summary;
  const { data: incomeSources } = useIncomeSources();
  
  // Calculate permanent vs temporary income
  const { permanentIncome, temporaryIncome } = useMemo(() => {
    let permanent = 0;
    let temporary = 0;
    
    incomeSources?.forEach(source => {
      const amount = Number(source.monthly_amount);
      // Income with an end_date is considered temporary
      if (source.end_date) {
        temporary += amount;
      } else {
        permanent += amount;
      }
    });
    
    return { permanentIncome: permanent, temporaryIncome: temporary };
  }, [incomeSources]);
  
  // Net position now includes: savings + monthly income - debts
  const netPosition = totalSavings + monthlyIncoming - totalDebts;
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
        
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
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
            <div className="p-1.5 rounded-full bg-primary/10">
              <Wallet className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Income</p>
              <AmountDisplay amount={monthlyIncoming} size="sm" className="text-primary" />
              {temporaryIncome > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
              <AlertCircle className="h-2.5 w-2.5 text-warning" />
                  <span className="text-[9px] text-warning">
                    £{temporaryIncome.toLocaleString()} temp
                  </span>
                </div>
              )}
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
