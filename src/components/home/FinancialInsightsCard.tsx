import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Clock, PiggyBank, Loader2, Wallet, AlertCircle } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { useExpenseItems, useSavingsAccounts, useDebts, useIncomeSources } from '@/hooks/useFinanceData';
import { useRenewals } from '@/hooks/useRenewals';
import { supabase } from '@/integrations/supabase/client';
import { FinanceSummary } from '@/types/finance';

interface SpendingCategory {
  category: string;
  monthlyTotal: number;
}

interface FinancialInsightsCardProps {
  summary: FinanceSummary;
}

export function FinancialInsightsCard({ summary }: FinancialInsightsCardProps) {
  const { data: expenses } = useExpenseItems();
  const { data: savings } = useSavingsAccounts();
  const { data: debts } = useDebts();
  const { data: renewals } = useRenewals();
  const { data: incomeSources } = useIncomeSources();
  
  const [spendingCategories, setSpendingCategories] = useState<SpendingCategory[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculate permanent vs temporary income
  const { permanentIncome, temporaryIncome, totalIncome } = useMemo(() => {
    let permanent = 0;
    let temporary = 0;
    
    incomeSources?.forEach(source => {
      const amount = Number(source.monthly_amount);
      if (source.end_date) {
        temporary += amount;
      } else {
        permanent += amount;
      }
    });
    
    return { permanentIncome: permanent, temporaryIncome: temporary, totalIncome: permanent + temporary };
  }, [incomeSources]);

  // Calculate funds runway incorporating income
  // Net position (savings - debts) + monthly income vs monthly outgoings
  const fundsRunway = useMemo(() => {
    const netPosition = summary.totalSavings - summary.totalDebts;
    const monthlyOutgoings = summary.monthlyOutgoings;
    const monthlyNet = totalIncome - monthlyOutgoings; // income minus expenses
    
    // If we're in surplus (income > outgoings), no runway concern
    if (monthlyNet >= 0) {
      return { months: null, netPosition, monthlyNet, totalIncome };
    }
    
    // Monthly deficit (how much we're losing per month after income)
    const monthlyDeficit = Math.abs(monthlyNet);
    
    // If net position is negative, runway is 0
    if (netPosition <= 0) {
      return { months: 0, netPosition, monthlyNet, totalIncome };
    }
    
    return { 
      months: Math.floor(netPosition / monthlyDeficit), 
      netPosition, 
      monthlyNet, 
      totalIncome 
    };
  }, [summary, totalIncome]);

  // Calculate projected annual interest
  const projectedAnnualInterest = useMemo(() => {
    if (!savings) return 0;
    
    return savings.reduce((total, account) => {
      const interest = (account.balance * (account.aer / 100));
      return total + interest;
    }, 0);
  }, [savings]);

  // Analyze spending categories with AI
  useEffect(() => {
    const analyzeSpending = async () => {
      if (!expenses || expenses.length === 0) return;
      
      setIsAnalyzing(true);
      
      try {
        const spendingItems = [
          ...expenses.map(e => ({
            name: e.name,
            monthlyAmount: e.monthly_amount,
            category: e.category,
            provider: e.provider
          })),
          ...(renewals?.filter(r => r.show_in_cashflow).map(r => ({
            name: r.name,
            monthlyAmount: r.monthly_amount,
            category: 'renewal',
            provider: r.provider
          })) || [])
        ];

        const { data, error } = await supabase.functions.invoke('analyze-spending', {
          body: { items: spendingItems }
        });

        if (error) {
          console.error('Error analyzing spending:', error);
          return;
        }

        if (data?.categories) {
          setSpendingCategories(data.categories);
        }
      } catch (err) {
        console.error('Failed to analyze spending:', err);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeSpending();
  }, [expenses, renewals]);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <SummaryCard 
      title="Financial Insights" 
      icon={<TrendingUp className="h-4 w-4" />}
    >
      <div className="space-y-4">
        {/* Funds Runway */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Funds Runway</span>
          </div>
          
          {/* Income breakdown */}
          <div className="flex items-center gap-2 mb-2 text-xs">
            <Wallet className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">
              Monthly income: <span className="text-primary font-medium">{formatCurrency(fundsRunway.totalIncome)}</span>
            </span>
            {temporaryIncome > 0 && (
              <span className="flex items-center gap-0.5 text-warning">
                <AlertCircle className="h-3 w-3" />
                {formatCurrency(temporaryIncome)} temp
              </span>
            )}
          </div>
          
          {fundsRunway.months !== null ? (
            fundsRunway.months <= 0 ? (
              <p className="text-sm text-debt">
                Your net position of <span className="font-medium">{formatCurrency(fundsRunway.netPosition)}</span> means 
                you have no runway. Focus on increasing income or reducing expenses.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your net position of <span className={fundsRunway.netPosition >= 0 ? "text-savings font-medium" : "text-debt font-medium"}>{formatCurrency(fundsRunway.netPosition)}</span> will 
                cover your monthly shortfall of <span className="text-debt font-medium">{formatCurrency(Math.abs(fundsRunway.monthlyNet))}</span> for 
                approximately <span className="text-foreground font-bold">{fundsRunway.months} months</span>
              </p>
            )
          ) : (
            <p className="text-sm text-savings">
              You're in surplus! Your income covers expenses with <span className="font-bold">{formatCurrency(fundsRunway.monthlyNet)}</span> to spare each month.
            </p>
          )}
        </div>

        {/* Projected Interest */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Projected Annual Interest</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Based on your current savings of <span className="text-savings font-medium">{formatCurrency(summary.totalSavings)}</span>, 
            you'll earn approximately <span className="text-savings font-bold">{formatCurrency(projectedAnnualInterest)}</span> in interest this year.
          </p>
        </div>

        {/* Top Spending Categories */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Top Spending Categories</span>
          </div>
          {isAnalyzing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your spending...
            </div>
          ) : spendingCategories.length > 0 ? (
            <div className="space-y-1">
              {spendingCategories.slice(0, 5).map((cat, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cat.category}</span>
                  <span className="font-medium">{formatCurrency(cat.monthlyTotal)}/mo</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add expenses to see your top spending categories
            </p>
          )}
        </div>
      </div>
    </SummaryCard>
  );
}
