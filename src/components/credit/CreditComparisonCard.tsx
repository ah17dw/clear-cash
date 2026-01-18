import { useMemo } from 'react';
import { AlertTriangle, Check, HelpCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AmountDisplay } from '@/components/ui/amount-display';
import { CreditReportEntry } from '@/hooks/useCreditReport';

interface Debt {
  id: string;
  name: string;
  balance: number;
  lender: string | null;
  type: string;
}

interface ComparisonResult {
  creditEntry: CreditReportEntry;
  matchedDebt: Debt | null;
  status: 'matched' | 'unmatched' | 'discrepancy';
  balanceDiff: number | null;
}

interface CreditComparisonCardProps {
  creditEntries: CreditReportEntry[];
  debts: Debt[];
  onLinkDebt: (entryId: string, debtId: string) => void;
  onAddToDebts: (entry: CreditReportEntry) => void;
}

export function CreditComparisonCard({ creditEntries, debts, onLinkDebt, onAddToDebts }: CreditComparisonCardProps) {
  const comparisons = useMemo(() => {
    const results: ComparisonResult[] = [];
    
    creditEntries.forEach((entry) => {
      // Find matched debt by ID or by name similarity
      let matchedDebt = entry.matched_debt_id 
        ? debts.find(d => d.id === entry.matched_debt_id)
        : debts.find(d => 
            d.name.toLowerCase().includes(entry.name.toLowerCase()) ||
            entry.name.toLowerCase().includes(d.name.toLowerCase()) ||
            (d.lender && entry.lender && d.lender.toLowerCase() === entry.lender.toLowerCase())
          );
      
      if (matchedDebt) {
        const balanceDiff = Math.abs(entry.balance - matchedDebt.balance);
        const hasDiscrepancy = balanceDiff > 10; // Allow £10 tolerance
        
        results.push({
          creditEntry: entry,
          matchedDebt,
          status: hasDiscrepancy ? 'discrepancy' : 'matched',
          balanceDiff: hasDiscrepancy ? balanceDiff : null,
        });
      } else {
        results.push({
          creditEntry: entry,
          matchedDebt: null,
          status: 'unmatched',
          balanceDiff: null,
        });
      }
    });
    
    return results;
  }, [creditEntries, debts]);

  const discrepancies = comparisons.filter(c => c.status === 'discrepancy');
  const unmatched = comparisons.filter(c => c.status === 'unmatched');
  const matched = comparisons.filter(c => c.status === 'matched');

  if (creditEntries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Credit Report Comparison</span>
          <div className="flex gap-2">
            {discrepancies.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {discrepancies.length} discrepancy
              </Badge>
            )}
            {unmatched.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unmatched.length} unmatched
              </Badge>
            )}
            {matched.length > 0 && (
              <Badge variant="outline" className="text-xs text-savings">
                {matched.length} matched
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {discrepancies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-debt flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Balance Discrepancies
            </p>
            {discrepancies.map(({ creditEntry, matchedDebt, balanceDiff }) => (
              <div key={creditEntry.id} className="bg-debt/10 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{creditEntry.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    £{balanceDiff?.toFixed(0)} diff
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1">
                    <p className="text-muted-foreground">Experian</p>
                    <AmountDisplay amount={creditEntry.balance} size="sm" />
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-muted-foreground">Your Tracking</p>
                    <AmountDisplay amount={matchedDebt?.balance || 0} size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {unmatched.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Not In Your Debts
            </p>
            {unmatched.map(({ creditEntry }) => (
              <div key={creditEntry.id} className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{creditEntry.name}</p>
                    <p className="text-xs text-muted-foreground">{creditEntry.lender}</p>
                  </div>
                  <div className="text-right">
                    <AmountDisplay amount={creditEntry.balance} size="sm" />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-xs h-6 mt-1"
                      onClick={() => onAddToDebts(creditEntry)}
                    >
                      Add to Debts
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {matched.length > 0 && comparisons.length > 3 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3 text-savings" />
              {matched.length} accounts match your tracked debts
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
