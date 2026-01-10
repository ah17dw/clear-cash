import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AmountDisplay } from '@/components/ui/amount-display';
import { SavingsAccount } from '@/types/finance';
import { format, addMonths } from 'date-fns';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

interface InterestStatementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: SavingsAccount[];
}

// UK Personal Savings Allowance for 2024/25
const UK_TAX_ALLOWANCE_BASIC = 1000; // Basic rate taxpayer
const UK_TAX_RATE = 0.20; // Assuming basic rate

interface MonthlyProjection {
  month: Date;
  startingBalance: number;
  interestEarned: number;
  endingBalance: number;
  breakdown: { account: string; balance: number; interest: number }[];
}

function calculateCompoundingProjections(accounts: SavingsAccount[], months: number = 12): MonthlyProjection[] {
  const today = new Date();
  const projections: MonthlyProjection[] = [];
  
  // Track running balance per account
  const balances = accounts.map(a => ({
    account: a.name,
    balance: Number(a.balance),
    aer: Number(a.aer),
  }));

  for (let i = 0; i < months; i++) {
    const monthDate = addMonths(today, i);
    const startingBalance = balances.reduce((sum, b) => sum + b.balance, 0);
    
    const breakdown = balances.map(b => {
      const monthlyRate = b.aer / 100 / 12;
      const interest = b.balance * monthlyRate;
      return {
        account: b.account,
        balance: b.balance,
        interest,
      };
    });
    
    const interestEarned = breakdown.reduce((sum, b) => sum + b.interest, 0);
    
    // Add interest to balances for next month (compounding)
    balances.forEach((b, idx) => {
      b.balance += breakdown[idx].interest;
    });
    
    const endingBalance = balances.reduce((sum, b) => sum + b.balance, 0);
    
    projections.push({
      month: monthDate,
      startingBalance,
      interestEarned,
      endingBalance,
      breakdown,
    });
  }

  return projections;
}

export function InterestStatementSheet({ open, onOpenChange, accounts }: InterestStatementSheetProps) {
  const today = new Date();
  
  // Generate 12-month compounding projections
  const projections = calculateCompoundingProjections(accounts, 12);
  
  // Calculate totals
  const currentBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalProjectedInterest = projections.reduce((sum, p) => sum + p.interestEarned, 0);
  const finalProjectedBalance = projections.length > 0 ? projections[projections.length - 1].endingBalance : currentBalance;

  // Simple annual interest (no compounding) for tax estimate
  const simpleAnnualInterest = accounts.reduce(
    (sum, a) => sum + (Number(a.balance) * Number(a.aer)) / 100,
    0
  );

  // Special case: ISA accounts assumed tax-free
  const ISA_TAX_FREE_BALANCE_CAP = 20000;
  const taxFreeIsaAnnualInterest = accounts.reduce((sum, a) => {
    const name = (a.name ?? '').toLowerCase();
    const isIsa = name.includes('isa');
    if (!isIsa) return sum;

    const taxFreeBalance = Math.min(Number(a.balance), ISA_TAX_FREE_BALANCE_CAP);
    return sum + (taxFreeBalance * Number(a.aer)) / 100;
  }, 0);

  const taxableAnnualInterest = Math.max(0, simpleAnnualInterest - taxFreeIsaAnnualInterest);
  const overAllowance = taxableAnnualInterest - UK_TAX_ALLOWANCE_BASIC;
  const taxableAmount = Math.max(0, overAllowance);
  const estimatedTax = taxableAmount * UK_TAX_RATE;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Interest Projection & Statement</SheetTitle>
        </SheetHeader>

        {/* 12-Month Summary */}
        <div className="finance-card finance-card-savings mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-savings" />
            <h3 className="font-medium">12-Month Projection</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-savings-muted">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <AmountDisplay amount={currentBalance} size="md" className="text-savings" />
            </div>
            <div className="p-3 rounded-lg bg-savings-muted">
              <p className="text-xs text-muted-foreground">Projected in 12 Months</p>
              <AmountDisplay amount={finalProjectedBalance} size="md" className="text-savings" />
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-primary/10">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Total Interest (Compounded)</p>
              <AmountDisplay amount={totalProjectedInterest} size="md" className="text-savings" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assuming no withdrawals and constant AER rates
            </p>
          </div>
        </div>

        {/* Tax Summary */}
        <div className="finance-card mb-4">
          <h3 className="font-medium mb-3">UK Tax Summary (2024/25)</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Est. Annual Interest (simple)</span>
              <AmountDisplay amount={simpleAnnualInterest} size="sm" />
            </div>

            {taxFreeIsaAnnualInterest > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tax-free ISA interest</span>
                <AmountDisplay amount={taxFreeIsaAnnualInterest} size="sm" />
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Taxable Interest</span>
              <AmountDisplay amount={taxableAnnualInterest} size="sm" />
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Personal Savings Allowance</span>
              <AmountDisplay amount={UK_TAX_ALLOWANCE_BASIC} size="sm" />
            </div>
            
            <div className="border-t border-border pt-2">
              {overAllowance <= 0 ? (
                <div className="flex items-center gap-2 text-savings">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    £{Math.abs(overAllowance).toFixed(2)} under allowance - No tax due
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-debt">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      £{overAllowance.toFixed(2)} over allowance
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Taxable Interest</span>
                    <AmountDisplay amount={taxableAmount} size="sm" className="text-debt" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Est. Tax @ 20%</span>
                    <AmountDisplay amount={estimatedTax} size="sm" className="text-debt" />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-3">
            * Allowance shown is for basic rate (£1,000). ISA interest is tax-free.
          </p>
        </div>

        {/* Monthly Breakdown with Compounding */}
        <div className="finance-card">
          <h3 className="font-medium mb-3">Monthly Projection (Compounding)</h3>
          
          <div className="space-y-3">
            {projections.map((p, index) => (
              <div 
                key={index}
                className="pb-3 border-b border-border last:border-0"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    {format(p.month, 'MMMM yyyy')}
                  </span>
                  <div className="text-right">
                    <AmountDisplay amount={p.endingBalance} size="sm" className="text-savings" />
                    <p className="text-xs text-muted-foreground">
                      +£{p.interestEarned.toFixed(2)} interest
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1 pl-2">
                  {p.breakdown.map((b, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span>{b.account}</span>
                      <span>£{b.balance.toFixed(2)} → +£{b.interest.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
