import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { useSavingsAccount, useDeleteSavingsAccount } from '@/hooks/useFinanceData';
import { formatPercentage, formatCurrency } from '@/lib/format';
import { SavingsFormSheet } from '@/components/savings/SavingsFormSheet';
import { useState } from 'react';
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
  const { data: account, isLoading } = useSavingsAccount(id!);
  const deleteSavings = useDeleteSavingsAccount();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (isLoading || !account) {
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

  const handleDelete = async () => {
    await deleteSavings.mutateAsync(account.id);
    navigate('/savings');
  };

  const balance = Number(account.balance);
  const aer = Number(account.aer);
  const monthlyInterest = (balance * aer) / 100 / 12;
  const yearlyInterest = (balance * aer) / 100;

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
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-savings-muted">
              <p className="text-xs text-muted-foreground">Monthly</p>
              <AmountDisplay amount={monthlyInterest} size="sm" className="text-savings" />
            </div>
            <div className="p-3 rounded-lg bg-savings-muted">
              <p className="text-xs text-muted-foreground">Yearly</p>
              <AmountDisplay amount={yearlyInterest} size="sm" className="text-savings" />
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
