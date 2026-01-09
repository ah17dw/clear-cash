import { useState, useMemo } from 'react';
import { FileText, Plus, Trash2, Edit2, ArrowUpDown, ExternalLink, Check, Calendar, User, Filter } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRenewals, useDeleteRenewal, useAddRenewalToExpenses, Renewal } from '@/hooks/useRenewals';
import { RenewalFormSheet } from '@/components/renewals/RenewalFormSheet';

type SortOption = 'expiry' | 'value' | 'name';

export default function Renewals() {
  const { data: renewals, isLoading } = useRenewals();
  const deleteRenewal = useDeleteRenewal();
  const addToExpenses = useAddRenewalToExpenses();
  
  const [showForm, setShowForm] = useState(false);
  const [editingRenewal, setEditingRenewal] = useState<Renewal | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>('expiry');
  const [filterPerson, setFilterPerson] = useState<string | null>(null);

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

  const getExpiryStatus = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const daysUntil = differenceInDays(end, new Date());
    
    if (isPast(end)) {
      return { label: 'Expired', variant: 'destructive' as const };
    }
    if (daysUntil <= 7) {
      return { label: `${daysUntil}d`, variant: 'destructive' as const };
    }
    if (daysUntil <= 30) {
      return { label: `${daysUntil}d`, variant: 'secondary' as const };
    }
    return { label: `${daysUntil}d`, variant: 'outline' as const };
  };

  const getInitialIcon = (name: string) => name.charAt(0).toUpperCase();

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
        onAdd={() => { setEditingRenewal(undefined); setShowForm(true); }}
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
          <div className="space-y-2">
            {sortedRenewals.map((renewal) => {
              const expiryStatus = getExpiryStatus(renewal.agreement_end);
              return (
                <div
                  key={renewal.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
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
                        {expiryStatus && (
                          <Badge variant={expiryStatus.variant} className="text-[10px] px-1.5 py-0">
                            <Calendar className="h-2.5 w-2.5 mr-0.5" />
                            {expiryStatus.label}
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
                        onClick={() => addToExpenses.mutate(renewal)}
                        title="Add to expenses"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingRenewal(renewal);
                        setShowForm(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteRenewal.mutate(renewal.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
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
    </div>
  );
}
