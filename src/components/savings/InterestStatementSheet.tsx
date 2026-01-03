import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AmountDisplay } from '@/components/ui/amount-display';
import { SavingsAccount } from '@/types/finance';
import { format, addMonths, subMonths } from 'date-fns';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface InterestStatementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: SavingsAccount[];
}

// UK Personal Savings Allowance for 2024/25
const UK_TAX_ALLOWANCE_BASIC = 1000; // Basic rate taxpayer
const UK_TAX_ALLOWANCE_HIGHER = 500; // Higher rate taxpayer
const UK_TAX_RATE = 0.20; // Assuming basic rate

interface MonthlyInterest {
  month: Date;
  interest: number;
  breakdown: { account: string; interest: number }[];
}

export function InterestStatementSheet({ open, onOpenChange, accounts }: InterestStatementSheetProps) {
  const today = new Date();
  
  // Calculate monthly interest for 1 month back and 12 months forward
  const months: MonthlyInterest[] = [];
  
  // 1 month back
  for (let i = -1; i <= 12; i++) {
    const monthDate = addMonths(today, i);
    const breakdown = accounts.map(account => ({
      account: account.name,
      interest: (Number(account.balance) * Number(account.aer)) / 100 / 12
    }));
    
    months.push({
      month: monthDate,
      interest: breakdown.reduce((sum, b) => sum + b.interest, 0),
      breakdown
    });
  }
  
  // Calculate totals
  const totalAnnualInterest = accounts.reduce(
    (sum, a) => sum + (Number(a.balance) * Number(a.aer)) / 100,
    0
  );

  // Special case: "Etorro ISA" assumed tax-free up to £20k of balance
  const ISA_TAX_FREE_BALANCE_CAP = 20000;
  const taxFreeIsaAnnualInterest = accounts.reduce((sum, a) => {
    const name = (a.name ?? '').toLowerCase();
    const isEtoroIsa = name.includes('etor') && name.includes('isa');
    if (!isEtoroIsa) return sum;

    const taxFreeBalance = Math.min(Number(a.balance), ISA_TAX_FREE_BALANCE_CAP);
    return sum + (taxFreeBalance * Number(a.aer)) / 100;
  }, 0);

  const taxableAnnualInterest = Math.max(0, totalAnnualInterest - taxFreeIsaAnnualInterest);

  const overAllowance = taxableAnnualInterest - UK_TAX_ALLOWANCE_BASIC;
  const taxableAmount = Math.max(0, overAllowance);
  const estimatedTax = taxableAmount * UK_TAX_RATE;
  
  const isPast = (date: Date) => date < today;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Interest Statement</SheetTitle>
        </SheetHeader>

        {/* Tax Summary */}
        <div className="finance-card mb-4">
          <h3 className="font-medium mb-3">UK Tax Summary (2024/25)</h3>
          
           <div className="space-y-2">
             <div className="flex justify-between">
               <span className="text-sm text-muted-foreground">Estimated Annual Interest (gross)</span>
               <AmountDisplay amount={totalAnnualInterest} size="sm" />
             </div>

             {taxFreeIsaAnnualInterest > 0 && (
               <div className="flex justify-between">
                 <span className="text-sm text-muted-foreground">Tax-free ISA interest (Etoro cap £20k)</span>
                 <AmountDisplay amount={taxFreeIsaAnnualInterest} size="sm" />
               </div>
             )}

             <div className="flex justify-between">
               <span className="text-sm text-muted-foreground">Taxable Interest (est.)</span>
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
             * Allowance shown is for basic rate (£1,000). This also assumes your Etorro ISA is tax-free only up to £20k of balance.
           </p>
        </div>

        {/* Monthly Breakdown */}
        <div className="finance-card">
          <h3 className="font-medium mb-3">Monthly Interest Projection</h3>
          
          <div className="space-y-3">
            {months.map((m, index) => (
              <div 
                key={index}
                className={`pb-3 border-b border-border last:border-0 ${isPast(m.month) ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">
                    {format(m.month, 'MMMM yyyy')}
                    {isPast(m.month) && <span className="text-xs text-muted-foreground ml-2">(Past)</span>}
                  </span>
                  <AmountDisplay amount={m.interest} size="sm" className="text-savings" />
                </div>
                
                <div className="space-y-1 pl-2">
                  {m.breakdown.map((b, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span>{b.account}</span>
                      <span>£{b.interest.toFixed(2)}</span>
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