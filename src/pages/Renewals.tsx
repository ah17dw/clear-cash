import { useState, useMemo } from 'react';
import { FileText, Plus, ArrowUpDown, ExternalLink, Check, Calendar, User } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useRenewals, useDeleteRenewal, useAddRenewalToExpenses, useCreateRenewal, Renewal } from '@/hooks/useRenewals';
import { RenewalFormSheet } from '@/components/renewals/RenewalFormSheet';
import { UnifiedAddSheet } from '@/components/unified/UnifiedAddSheet';

type SortOption = 'expiry' | 'value' | 'name';

export default function Renewals() {
  const { data: renewals, isLoading } = useRenewals();
  const deleteRenewal = useDeleteRenewal();
  const addToExpenses = useAddRenewalToExpenses();
  const createRenewal = useCreateRenewal();
  
  const [showForm, setShowForm] = useState(false);
  const [showUnifiedAdd, setShowUnifiedAdd] = useState(false);
  const [editingRenewal, setEditingRenewal] = useState<Renewal | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>('expiry');
  const [filterPerson, setFilterPerson] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });

  // Get unique persons/addresses for filter
  const uniquePersons = useMemo(() => {
    if (!renewals) return [];
    const persons = renewals
      .map(r => r.person_or_address)
      .filter((p): p is string => !!p);
    return [...new Set(persons)].sort();
  }, [renewals]);

  const filteredRenewals = useMemo(() => {
    if (!renewals) return [];
    if (!filterPerson) return renewals;
    return renewals.filter(r => r.person_or_address === filterPerson);
  }, [renewals, filterPerson]);

  const sortedRenewals = useMemo(() => {
    return [...filteredRenewals].sort((a, b) => {
      if (sortBy === 'expiry') {
        if (!a.agreement_end && !b.agreement_end) return 0;
        if (!a.agreement_end) return 1;
        if (!b.agreement_end) return -1;
        return new Date(a.agreement_end).getTime() - new Date(b.agreement_end).getTime();
      }
      if (sortBy === 'value') {
        return (b.total_cost || 0) - (a.total_cost || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [filteredRenewals, sortBy]);

  const totalAnnualCost = filteredRenewals.reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalMonthlyCost = filteredRenewals.reduce((sum, r) => sum + (r.monthly_amount || 0), 0);
  const expiringThisMonth = filteredRenewals.filter(r => {
    if (!r.agreement_end) return false;
    const endDate = new Date(r.agreement_end);
    const daysUntil = differenceInDays(endDate, new Date());
    return daysUntil >= 0 && daysUntil <= 30;
  }).length;

  // Calculate next payment date based on start date and frequency
  const getNextPaymentDate = (renewal: Renewal) => {
    if (!renewal.agreement_start) return null;
    
    const start = new Date(renewal.agreement_start);
    const today = new Date();
    const frequency = renewal.frequency || 'annually';
    
    let nextPayment = new Date(start);
    
    // Find the next payment date from start date
    while (nextPayment < today) {
      if (frequency === 'weekly') {
        nextPayment.setDate(nextPayment.getDate() + 7);
      } else if (frequency === 'monthly') {
        nextPayment.setMonth(nextPayment.getMonth() + 1);
      } else {
        nextPayment.setFullYear(nextPayment.getFullYear() + 1);
      }
    }
    
    return nextPayment;
  };

  const getPaymentStatus = (renewal: Renewal) => {
    const nextPayment = getNextPaymentDate(renewal);
    if (!nextPayment) return null;
    
    const daysUntil = differenceInDays(nextPayment, new Date());
    
    if (daysUntil <= 7) {
      return { label: `${daysUntil}d`, variant: 'destructive' as const, date: nextPayment };
    }
    if (daysUntil <= 30) {
      return { label: `${daysUntil}d`, variant: 'secondary' as const, date: nextPayment };
    }
    return { label: `${daysUntil}d`, variant: 'outline' as const, date: nextPayment };
  };

  const getInitialIcon = (name: string) => name.charAt(0).toUpperCase();

  const handleDelete = (renewal: Renewal) => {
    setDeleteConfirm({ open: true, id: renewal.id, name: renewal.name });
  };

  const confirmDelete = () => {
    deleteRenewal.mutate(deleteConfirm.id);
    setDeleteConfirm({ open: false, id: '', name: '' });
  };

  const handleDuplicate = (renewal: Renewal) => {
    createRenewal.mutate({
      name: `${renewal.name} (Copy)`,
      provider: renewal.provider,
      total_cost: renewal.total_cost,
      monthly_amount: renewal.monthly_amount,
      frequency: renewal.frequency,
      is_monthly_payment: renewal.is_monthly_payment,
      agreement_start: renewal.agreement_start,
      agreement_end: renewal.agreement_end,
      person_or_address: renewal.person_or_address,
      notes: renewal.notes,
      file_url: null,
      file_name: null,
      added_to_expenses: false,
      linked_expense_id: null,
      show_in_cashflow: false,
      couples_mode: renewal.couples_mode,
    });
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeader title="Renewals" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title="Renewals" 
        onAdd={() => setShowUnifiedAdd(true)}
        addLabel="Add"
      />

      {/* Summary Card */}
      <div className="finance-card mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Annual Total</p>
            <AmountDisplay amount={totalAnnualCost} size="sm" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly</p>
            <AmountDisplay amount={totalMonthlyCost} size="sm" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Expiring Soon</p>
            <p className={`text-lg font-bold ${expiringThisMonth > 0 ? 'text-amber-500' : ''}`}>
              {expiringThisMonth}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-lg font-semibold flex-shrink-0">Contracts</h2>
        <div className="flex items-center gap-2 overflow-x-auto">
          {uniquePersons.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={filterPerson === null ? 'secondary' : 'outline'}
                onClick={() => setFilterPerson(null)}
                className="text-xs px-2 h-7"
              >
                All
              </Button>
              {uniquePersons.map((person) => (
                <Button
                  key={person}
                  size="sm"
                  variant={filterPerson === person ? 'secondary' : 'outline'}
                  onClick={() => setFilterPerson(person)}
                  className="text-xs px-2 h-7"
                >
                  <User className="h-3 w-3 mr-1" />
                  {person}
                </Button>
              ))}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortBy(sortBy === 'expiry' ? 'value' : sortBy === 'value' ? 'name' : 'expiry')}
            className="text-xs h-7"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            {sortBy === 'expiry' ? 'Expiry' : sortBy === 'value' ? 'Value' : 'Name'}
          </Button>
        </div>
      </div>

      {/* Renewals List */}
      <div className="finance-card">
        {sortedRenewals.length > 0 ? (
          <div className="space-y-1">
            {sortedRenewals.map((renewal) => {
              const paymentStatus = getPaymentStatus(renewal);
              return (
                <SwipeableRow
                  key={renewal.id}
                  onEdit={() => { setEditingRenewal(renewal); setShowForm(true); }}
                  onDelete={() => handleDelete(renewal)}
                  onDuplicate={() => handleDuplicate(renewal)}
                >
                  <div className="flex items-center justify-between py-3 px-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors bg-card">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                        {getInitialIcon(renewal.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{renewal.name}</p>
                          {renewal.added_to_expenses && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Check className="h-2.5 w-2.5 mr-0.5" />
                              In Expenses
                            </Badge>
                          )}
                          {paymentStatus && (
                            <Badge variant={paymentStatus.variant} className="text-[10px] px-1.5 py-0">
                              <Calendar className="h-2.5 w-2.5 mr-0.5" />
                              Next: {paymentStatus.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {renewal.person_or_address && (
                            <>
                              <span className="flex items-center gap-0.5">
                                <User className="h-3 w-3" />
                                {renewal.person_or_address}
                              </span>
                              <span>·</span>
                            </>
                          )}
                          {renewal.provider && <span>{renewal.provider}</span>}
                          {renewal.provider && renewal.agreement_end && <span>·</span>}
                          {renewal.agreement_end && (
                            <span>Ends {format(new Date(renewal.agreement_end), 'dd/MM/yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <AmountDisplay amount={renewal.total_cost || 0} size="sm" />
                        <p className="text-[10px] text-muted-foreground">
                          {renewal.is_monthly_payment ? 'annual' : 'one-off'}
                        </p>
                      </div>
                      
                      {!renewal.added_to_expenses && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToExpenses.mutate(renewal);
                          }}
                          title="Add to expenses"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </SwipeableRow>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No renewals added yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add contracts, agreements, or invoices to track
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => { setEditingRenewal(undefined); setShowForm(true); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Renewal
            </Button>
          </div>
        )}
      </div>

      <RenewalFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        renewal={editingRenewal}
      />

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}
        onConfirm={confirmDelete}
        title="Delete Renewal"
        itemName={deleteConfirm.name}
      />

      <UnifiedAddSheet open={showUnifiedAdd} onOpenChange={setShowUnifiedAdd} />
    </div>
  );
}
