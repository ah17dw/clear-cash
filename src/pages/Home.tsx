import { PageHeader } from '@/components/layout/PageHeader';
import { NetPositionCard } from '@/components/home/NetPositionCard';
import { CashflowCard } from '@/components/home/CashflowCard';
import { AlertsList } from '@/components/home/AlertsList';
import { useFinanceSummary, useAlerts } from '@/hooks/useFinanceData';

export default function Home() {
  const summary = useFinanceSummary();
  const alerts = useAlerts();

  return (
    <div className="page-container">
      <PageHeader title="Summary" />
      
      <div className="space-y-4">
        <NetPositionCard summary={summary} />
        <CashflowCard summary={summary} />
        <AlertsList alerts={alerts} />
      </div>
    </div>
  );
}
