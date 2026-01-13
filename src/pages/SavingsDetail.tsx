import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, TrendingUp, Calendar } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { useSavingsAccount, useDeleteSavingsAccount } from '@/hooks/useFinanceData';
import { formatPercentage } from '@/lib/format';
import { SavingsFormSheet } from '@/components/savings/SavingsFormSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SavingsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: account, isLoading, error } = useSavingsAccount(id!);
  const deleteSavings = useDeleteSavingsAccount();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const monthlyProjections = useMemo(() => {
    if (!account) return [];
    const balance = Number(account.balance);
    const aer = Number(account.aer);
    const projections: { month: Date; balance: number; interest: number }[] = [];
    let runningBalance = balance;
    const monthlyRate = aer / 100 / 12;
    
    for (let i = 0; i < 12; i++) {
      const interest = runningBalance * monthlyRate;
      runningBalance += interest;
      projections.push({
        month: addMonths(new Date(), i),
        balance: runningBalance,
        interest,
      });
    }
    return projections;
  }, [account]);

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeader title="Loading..." showBack />
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="page-container">
        <PageHeader title="Savings" showBack />
        <div className="finance-card p-4">
          <p className="font-medium">Couldn't load that savings account.</p>
          <p className="text-sm text-muted-foreground mt-1">It may have been deleted, or you may not have access.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/savings')}>Back to Savings</Button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteSavings.mutateAsync(account.id);
    navigate('/savings');
  };

  const balance = Number(account.balance);
  const aer = Number(account.aer);
  const monthlyInterest = (balance * aer) / 100 / 12;
  const yearlyInterest = (balance * aer) / 100;
  const projectedBalance12Mo = monthlyProjections[11]?.balance ?? balance;
  const totalProjectedInterest = projectedBalance12Mo - balance;

  return (
    <div className="page-container">
      <PageHeader 
        title={account.name} 
        showBack 
        rightContent={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDelete(true)}
            className="text-debt"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        }
      />

      {/* Balance Card */}
      <div className="finance-card finance-card-savings mb-4 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Balance</p>
        <AmountDisplay amount={balance} size="lg" className="text-savings" />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setShowEdit(true)} variant="outline" className="flex-1">
          Edit Details
        </Button>
      </div>

      {/* Details */}
      <div className="finance-card space-y-4 mb-4">
        <h3 className="font-medium">Details</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          {account.provider && (
            <div>
              <p className="text-muted-foreground text-xs">Provider</p>
              <p className="font-medium">{account.provider}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">AER</p>
            <p className="font-medium">{formatPercentage(aer)}</p>
          </div>
        </div>

        {/* Interest Estimates */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-savings" />
            <p className="font-medium">Estimated Interest</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-savings/10">
              <p className="text-xs text-muted-foreground">Monthly</p>
              <AmountDisplay amount={monthlyInterest} size="sm" className="text-savings" />
            </div>
            <div className="p-3 rounded-lg bg-savings/10">
              <p className="text-xs text-muted-foreground">Yearly (simple)</p>
              <AmountDisplay amount={yearlyInterest} size="sm" className="text-savings" />
            </div>
          </div>
          
          {/* 12-Month Compounding Projection */}
          <div className="p-3 rounded-lg bg-primary/10 mb-4">
            <p className="text-xs text-muted-foreground mb-1">12-Month Projection (Compounding)</p>
            <div className="flex justify-between items-center">
              <div>
                <AmountDisplay amount={projectedBalance12Mo} size="md" className="text-savings" />
                <p className="text-xs text-muted-foreground">
                  +£{totalProjectedInterest.toFixed(2)} interest
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Monthly Breakdown
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {monthlyProjections.map((p, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{format(p.month, 'MMM yyyy')}</span>
                  <span>
                    £{p.balance.toFixed(2)}
                    <span className="text-savings ml-1">(+£{p.interest.toFixed(2)})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        {account.notes && (
          <div className="pt-3 border-t border-border">
            <p className="text-muted-foreground text-xs">Notes</p>
            <p className="text-sm">{account.notes}</p>
          </div>
        )}
      </div>

      <SavingsFormSheet open={showEdit} onOpenChange={setShowEdit} account={account} />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Savings Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{account.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
