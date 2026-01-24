import { PageHeader } from '@/components/layout/PageHeader';
import { NetPositionCard } from '@/components/home/NetPositionCard';
import { CashflowCard } from '@/components/home/CashflowCard';
import { FinancialInsightsCard } from '@/components/home/FinancialInsightsCard';
import { MonthlyPaymentSummaryCard } from '@/components/home/MonthlyPaymentSummaryCard';
import { useFinanceSummary } from '@/hooks/useFinanceData';

export default function Home() {
  const summary = useFinanceSummary();

  return (
    <div className="page-container">
      <PageHeader title="Summary" />
      
      <div className="space-y-4">
        <NetPositionCard summary={summary} />
        <MonthlyPaymentSummaryCard />
        <CashflowCard summary={summary} />
        <FinancialInsightsCard summary={summary} />
      </div>
    </div>
  );
}
