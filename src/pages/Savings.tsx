import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiggyBank, ChevronRight, Percent, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useSavingsAccounts, useDeleteSavingsAccount, useCreateSavingsAccount } from '@/hooks/useFinanceData';
import { SavingsFormSheet } from '@/components/savings/SavingsFormSheet';
import { InterestStatementSheet } from '@/components/savings/InterestStatementSheet';

interface SavingsAccount {
  id: string;
  name: string;
  provider: string | null;
  balance: number;
  aer: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function Savings() {
  const navigate = useNavigate();
  const { data: accounts, isLoading } = useSavingsAccounts();
  const deleteSavingsAccount = useDeleteSavingsAccount();
  const createSavingsAccount = useCreateSavingsAccount();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SavingsAccount | undefined>();
  const [showStatement, setShowStatement] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });

  const totalSavings = accounts?.reduce((sum, a) => sum + Number(a.balance), 0) ?? 0;
  
  // Calculate estimated annual interest from all accounts
  const estimatedAnnualInterest = accounts?.reduce((sum, a) => {
    return sum + (Number(a.balance) * Number(a.aer)) / 100;
  }, 0) ?? 0;

  const handleDelete = (account: SavingsAccount) => {
    setDeleteConfirm({ open: true, id: account.id, name: account.name });
  };

  const confirmDelete = () => {
    deleteSavingsAccount.mutate(deleteConfirm.id);
    setDeleteConfirm({ open: false, id: '', name: '' });
  };

  const handleDuplicate = (account: SavingsAccount) => {
    createSavingsAccount.mutate({
      name: `${account.name} (Copy)`,
      provider: account.provider,
      balance: account.balance,
      aer: account.aer,
      notes: account.notes,
    });
  };

  const handleEdit = (account: SavingsAccount) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="Savings" 
        onAdd={() => { setEditingAccount(undefined); setShowForm(true); }}
        addLabel="Add"
      />

      {/* Total */}
      <div className="finance-card finance-card-savings mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Savings</p>
        <AmountDisplay amount={totalSavings} size="lg" className="text-savings" />
      </div>

      {/* Estimated Annual Interest - Clickable */}
      {accounts && accounts.length > 0 && (
        <button
          onClick={() => setShowStatement(true)}
          className="w-full finance-card mb-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-savings" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Est. Annual Interest</p>
                <AmountDisplay amount={estimatedAnnualInterest} size="md" className="text-savings" />
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tap to view detailed statement with UK tax info
          </p>
        </button>
      )}

      {/* Accounts List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="finance-card animate-pulse h-20" />
          ))}
        </div>
      ) : accounts && accounts.length === 0 ? (
        <div className="finance-card text-center py-8">
          <PiggyBank className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No savings accounts yet</p>
          <button
            onClick={() => { setEditingAccount(undefined); setShowForm(true); }}
            className="text-primary text-sm mt-2 hover:underline"
          >
            Add your first account
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts?.map((account, index) => {
            const balance = Number(account.balance);
            const aer = Number(account.aer);
            
            // Calculate 12-month compounded projection
            let projectedBalance = balance;
            const monthlyRate = aer / 100 / 12;
            for (let i = 0; i < 12; i++) {
              projectedBalance += projectedBalance * monthlyRate;
            }
            const projectedInterest = projectedBalance - balance;
            
            return (
              <SwipeableRow
                key={account.id}
                onEdit={() => handleEdit(account)}
                onDelete={() => handleDelete(account)}
                onDuplicate={() => handleDuplicate(account)}
              >
                <button
                  onClick={() => navigate(`/savings/${account.id}`)}
                  className="w-full finance-card flex items-center gap-3 list-item-interactive animate-fade-in text-left"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-savings/20 flex items-center justify-center text-savings font-semibold">
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">{account.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {account.provider && <span className="truncate">{account.provider}</span>}
                      <span className="flex items-center gap-0.5">
                        <Percent className="h-3 w-3" />
                        {aer}% AER
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <AmountDisplay amount={balance} size="sm" className="text-savings" />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      +£{projectedInterest.toFixed(0)}/yr
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </SwipeableRow>
            );
          })}
        </div>
      )}

      <SavingsFormSheet open={showForm} onOpenChange={setShowForm} account={editingAccount} />
      <InterestStatementSheet 
        open={showStatement} 
        onOpenChange={setShowStatement}
        accounts={accounts ?? []}
      />

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}
        onConfirm={confirmDelete}
        title="Delete Savings Account"
        itemName={deleteConfirm.name}
      />
    </div>
  );
}
