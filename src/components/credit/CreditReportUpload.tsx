import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { AmountDisplay } from '@/components/ui/amount-display';
import { cn } from '@/lib/utils';

interface CreditEntry {
  name: string;
  type: 'credit_card' | 'loan' | 'mortgage';
  lender: string;
  balance: number;
  creditLimit?: number;
  monthlyPayment?: number;
  originalBorrowed?: number;
  lastUpdated?: string;
  available?: number;
}

interface AnalysisResult {
  entries: CreditEntry[];
  summary: {
    totalCreditCards: number;
    totalLoans: number;
    totalMortgages: number;
    totalDebt: number;
    totalCreditLimit: number;
  };
}

interface Debt {
  id: string;
  name: string;
  balance: number;
  starting_balance: number;
  lender: string | null;
  type: string;
  minimum_payment: number;
  planned_payment: number | null;
}

interface Discrepancy {
  reportEntry: CreditEntry;
  matchedDebt: Debt | null;
  differences: {
    field: string;
    reportValue: string | number;
    trackedValue: string | number | null;
  }[];
  matchScore: number;
}

interface CreditReportUploadProps {
  debts: Debt[];
  onUpdateDebt: (debtId: string, updates: Partial<Debt>) => void;
  onAddDebt: (entry: CreditEntry) => void;
}

// Fuzzy matching function
function normalizeString(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/creditcard/g, '')
    .replace(/unsecuredloan/g, '')
    .replace(/securedloan/g, '')
    .replace(/loan/g, '')
    .replace(/mortgage/g, '')
    .replace(/plc/g, '')
    .replace(/ltd/g, '')
    .replace(/limited/g, '');
}

function calculateMatchScore(entry: CreditEntry, debt: Debt): number {
  let score = 0;
  
  const entryName = normalizeString(entry.name);
  const entryLender = normalizeString(entry.lender);
  const debtName = normalizeString(debt.name);
  const debtLender = normalizeString(debt.lender || '');
  
  // Check if names or lenders contain each other
  if (entryName.includes(debtName) || debtName.includes(entryName)) score += 40;
  if (entryLender.includes(debtLender) || debtLender.includes(entryLender)) score += 30;
  if (entryName.includes(debtLender) || debtLender.includes(entryName)) score += 20;
  if (entryLender.includes(debtName) || debtName.includes(entryLender)) score += 20;
  
  // Type matching
  const typeMatch = (
    (entry.type === 'credit_card' && debt.type === 'credit_card') ||
    (entry.type === 'loan' && (debt.type === 'loan' || debt.type === 'personal_loan')) ||
    (entry.type === 'mortgage' && debt.type === 'mortgage')
  );
  if (typeMatch) score += 20;
  
  // Balance proximity (within 20%)
  const balanceDiff = Math.abs(entry.balance - debt.balance) / Math.max(entry.balance, debt.balance, 1);
  if (balanceDiff < 0.2) score += 10;
  
  return Math.min(score, 100);
}

function findDiscrepancies(entries: CreditEntry[], debts: Debt[]): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const usedDebts = new Set<string>();
  
  for (const entry of entries) {
    let bestMatch: Debt | null = null;
    let bestScore = 0;
    
    for (const debt of debts) {
      if (usedDebts.has(debt.id)) continue;
      const score = calculateMatchScore(entry, debt);
      if (score > bestScore && score >= 40) {
        bestScore = score;
        bestMatch = debt;
      }
    }
    
    if (bestMatch) {
      usedDebts.add(bestMatch.id);
    }
    
    const differences: Discrepancy['differences'] = [];
    
    if (bestMatch) {
      // Check balance difference
      if (Math.abs(entry.balance - bestMatch.balance) > 1) {
        differences.push({
          field: 'Balance',
          reportValue: entry.balance,
          trackedValue: bestMatch.balance,
        });
      }
      
      // Check lender
      if (entry.lender && (!bestMatch.lender || normalizeString(entry.lender) !== normalizeString(bestMatch.lender))) {
        differences.push({
          field: 'Lender',
          reportValue: entry.lender,
          trackedValue: bestMatch.lender,
        });
      }
      
      // Check starting balance (original borrowed) for loans
      if (entry.originalBorrowed && Math.abs(entry.originalBorrowed - bestMatch.starting_balance) > 1) {
        differences.push({
          field: 'Original Amount',
          reportValue: entry.originalBorrowed,
          trackedValue: bestMatch.starting_balance,
        });
      }
      
      // Check monthly payment
      const trackedPayment = bestMatch.planned_payment || bestMatch.minimum_payment;
      if (entry.monthlyPayment && Math.abs(entry.monthlyPayment - trackedPayment) > 1) {
        differences.push({
          field: 'Monthly Payment',
          reportValue: entry.monthlyPayment,
          trackedValue: trackedPayment,
        });
      }
    }
    
    discrepancies.push({
      reportEntry: entry,
      matchedDebt: bestMatch,
      differences,
      matchScore: bestScore,
    });
  }
  
  return discrepancies;
}

export function CreditReportUpload({ debts, onUpdateDebt, onAddDebt }: CreditReportUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPEG, or PDF file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }
    
    setSelectedFile(file);
    setIsUploading(true);
    setAnalysisResult(null);
    setDiscrepancies([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-credit-report`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze report');
      }
      
      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
      
      // Find discrepancies
      const foundDiscrepancies = findDiscrepancies(result.entries, debts);
      setDiscrepancies(foundDiscrepancies);
      
      const withIssues = foundDiscrepancies.filter(d => d.differences.length > 0 || !d.matchedDebt);
      if (withIssues.length > 0) {
        toast.warning(`Found ${withIssues.length} item(s) needing attention`);
      } else {
        toast.success('All accounts match your tracked debts!');
      }
      
    } catch (error) {
      console.error('Error analyzing report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze report');
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateDebt = (discrepancy: Discrepancy) => {
    if (!discrepancy.matchedDebt) return;
    
    const updates: Partial<Debt> = {};
    
    for (const diff of discrepancy.differences) {
      switch (diff.field) {
        case 'Balance':
          updates.balance = diff.reportValue as number;
          break;
        case 'Lender':
          updates.lender = diff.reportValue as string;
          break;
        case 'Original Amount':
          updates.starting_balance = diff.reportValue as number;
          break;
        case 'Monthly Payment':
          updates.minimum_payment = diff.reportValue as number;
          updates.planned_payment = diff.reportValue as number;
          break;
      }
    }
    
    onUpdateDebt(discrepancy.matchedDebt.id, updates);
    
    // Remove from discrepancies
    setDiscrepancies(prev => 
      prev.map(d => 
        d.matchedDebt?.id === discrepancy.matchedDebt?.id 
          ? { ...d, differences: [] }
          : d
      )
    );
    
    toast.success(`Updated ${discrepancy.matchedDebt.name}`);
  };

  const handleAddAsNew = (entry: CreditEntry) => {
    onAddDebt(entry);
    
    // Remove from unmatched
    setDiscrepancies(prev => 
      prev.filter(d => d.reportEntry !== entry)
    );
    
    toast.success(`Added ${entry.name} as new debt`);
  };

  const handleDismiss = (discrepancy: Discrepancy) => {
    setDiscrepancies(prev => 
      prev.map(d => 
        d === discrepancy 
          ? { ...d, differences: [] }
          : d
      )
    );
  };

  const unmatchedEntries = discrepancies.filter(d => !d.matchedDebt);
  const entriesWithDifferences = discrepancies.filter(d => d.matchedDebt && d.differences.length > 0);
  const matchedEntries = discrepancies.filter(d => d.matchedDebt && d.differences.length === 0);

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <Card className="p-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          className="hidden"
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Upload Credit Report</p>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG, or PDF from TransUnion/Experian
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
        
        {selectedFile && !isUploading && (
          <p className="text-xs text-muted-foreground mt-2">
            Analyzed: {selectedFile.name}
          </p>
        )}
      </Card>
      
      {/* Summary */}
      {analysisResult && (
        <Card className="p-4">
          <p className="text-sm font-medium mb-3">Report Summary</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{analysisResult.summary.totalCreditCards}</p>
              <p className="text-xs text-muted-foreground">Credit Cards</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{analysisResult.summary.totalLoans}</p>
              <p className="text-xs text-muted-foreground">Loans</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{analysisResult.summary.totalMortgages}</p>
              <p className="text-xs text-muted-foreground">Mortgages</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Debt (from report)</span>
              <AmountDisplay amount={analysisResult.summary.totalDebt} className="text-debt" />
            </div>
          </div>
        </Card>
      )}
      
      {/* Discrepancies - needs attention */}
      {entriesWithDifferences.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Needs Attention ({entriesWithDifferences.length})
          </p>
          
          {entriesWithDifferences.map((discrepancy, idx) => (
            <Card key={idx} className="p-4 border-destructive/50 bg-destructive/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{discrepancy.reportEntry.name}</p>
                    <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">
                      {discrepancy.differences.length} difference{discrepancy.differences.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Matched to: {discrepancy.matchedDebt?.name}
                  </p>
                  
                  <div className="mt-3 space-y-2">
                    {discrepancy.differences.map((diff, diffIdx) => (
                      <div key={diffIdx} className="flex items-center justify-between text-sm bg-background rounded p-2">
                        <span className="text-muted-foreground">{diff.field}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-destructive line-through">
                            {typeof diff.trackedValue === 'number' ? `£${diff.trackedValue.toLocaleString()}` : diff.trackedValue || 'Not set'}
                          </span>
                          <span>→</span>
                          <span className="text-savings font-medium">
                            {typeof diff.reportValue === 'number' ? `£${diff.reportValue.toLocaleString()}` : diff.reportValue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleUpdateDebt(discrepancy)}
                  className="flex-1 gap-1"
                >
                  <Check className="h-3 w-3" />
                  Update All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDismiss(discrepancy)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Unmatched entries */}
      {unmatchedEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Not In Your Debts ({unmatchedEntries.length})
          </p>
          
          {unmatchedEntries.map((discrepancy, idx) => (
            <Card key={idx} className="p-4 border-warning/50 bg-warning/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium">{discrepancy.reportEntry.name}</p>
                  <p className="text-xs text-muted-foreground">{discrepancy.reportEntry.lender}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <AmountDisplay amount={discrepancy.reportEntry.balance} size="sm" />
                    </div>
                    {discrepancy.reportEntry.creditLimit && (
                      <div>
                        <p className="text-xs text-muted-foreground">Limit</p>
                        <AmountDisplay amount={discrepancy.reportEntry.creditLimit} size="sm" />
                      </div>
                    )}
                    {discrepancy.reportEntry.monthlyPayment && (
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly</p>
                        <AmountDisplay amount={discrepancy.reportEntry.monthlyPayment} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleAddAsNew(discrepancy.reportEntry)}
                  className="flex-1 gap-1"
                >
                  <Check className="h-3 w-3" />
                  Add to Debts
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDiscrepancies(prev => prev.filter(d => d !== discrepancy))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Matched entries */}
      {matchedEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Check className="h-4 w-4 text-savings" />
            Matched ({matchedEntries.length})
          </p>
          
          <Card className="p-3">
            <div className="space-y-2">
              {matchedEntries.map((discrepancy, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 text-sm">
                  <span>{discrepancy.reportEntry.name}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AmountDisplay amount={discrepancy.reportEntry.balance} size="sm" />
                    <Check className="h-3 w-3 text-savings" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
