import { LogOut, Download, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useDebts, useSavingsAccounts, useIncomeSources, useExpenseItems } from '@/hooks/useFinanceData';
import { toast } from 'sonner';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { data: debts } = useDebts();
  const { data: savings } = useSavingsAccounts();
  const { data: income } = useIncomeSources();
  const { data: expenses } = useExpenseItems();

  const handleExport = () => {
    const data = {
      debts: debts ?? [],
      savings: savings ?? [],
      income: income ?? [],
      expenses: expenses ?? [],
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <div className="page-container">
      <PageHeader title="Settings" />

      {/* Account */}
      <div className="finance-card mb-4">
        <h3 className="font-medium mb-3">Account</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Data */}
      <div className="finance-card mb-4">
        <h3 className="font-medium mb-3">Data</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Debts</p>
              <p className="font-medium">{debts?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Savings Accounts</p>
              <p className="font-medium">{savings?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Income Sources</p>
              <p className="font-medium">{income?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expenses</p>
              <p className="font-medium">{expenses?.length ?? 0}</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export Data (JSON)
          </Button>
        </div>
      </div>

      {/* Preferences */}
      <div className="finance-card">
        <h3 className="font-medium mb-3">Preferences</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium">GBP (£)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Date Format</span>
            <span className="font-medium">DD/MM/YYYY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
