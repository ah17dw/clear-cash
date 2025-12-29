import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { AmountDisplay } from '@/components/ui/amount-display';
import { FinanceSummary } from '@/types/finance';

interface CashflowCardProps {
  summary: FinanceSummary;
}

export function CashflowCard({ summary }: CashflowCardProps) {
  const { monthlyIncoming, monthlyOutgoings, monthlySurplus } = summary;
  const isPositive = monthlySurplus >= 0;

  return (
    <SummaryCard 
      title="Monthly Cashflow" 
      icon={<Wallet className="h-4 w-4" />}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-savings" />
            <span className="text-sm">Income</span>
          </div>
          <AmountDisplay amount={monthlyIncoming} size="sm" />
        </div>
        
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-debt" />
            <span className="text-sm">Outgoings</span>
          </div>
          <AmountDisplay amount={monthlyOutgoings} size="sm" />
        </div>
        
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {isPositive ? 'Monthly Surplus' : 'Monthly Deficit'}
            </span>
            <AmountDisplay 
              amount={monthlySurplus} 
              size="md" 
              showSign 
            />
          </div>
        </div>
      </div>
    </SummaryCard>
  );
}
