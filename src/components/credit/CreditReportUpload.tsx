import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertTriangle, Check, X, History, Clock, Plus, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { AmountDisplay } from '@/components/ui/amount-display';
import { useCreditReportUploads } from '@/hooks/useCreditReportUploads';
import { CreditUploadHistorySheet } from './CreditUploadHistorySheet';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  status: 'pending' | 'linked' | 'dismissed' | 'added';
  manuallyLinkedDebtId?: string;
  selectedFields?: string[];
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
      status: 'pending',
      selectedFields: differences.map(d => d.field), // Default select all
    });
  }
  
  return discrepancies;
}

function calculateDifferencesForDebt(entry: CreditEntry, debt: Debt): Discrepancy['differences'] {
  const differences: Discrepancy['differences'] = [];
  
  // Check balance difference
  if (Math.abs(entry.balance - debt.balance) > 1) {
    differences.push({
      field: 'Balance',
      reportValue: entry.balance,
      trackedValue: debt.balance,
    });
  }
  
  // Check lender
  if (entry.lender && (!debt.lender || normalizeString(entry.lender) !== normalizeString(debt.lender))) {
    differences.push({
      field: 'Lender',
      reportValue: entry.lender,
      trackedValue: debt.lender,
    });
  }
  
  // Check starting balance (original borrowed) for loans
  if (entry.originalBorrowed && Math.abs(entry.originalBorrowed - debt.starting_balance) > 1) {
    differences.push({
      field: 'Original Amount',
      reportValue: entry.originalBorrowed,
      trackedValue: debt.starting_balance,
    });
  }
  
  // Check monthly payment
  const trackedPayment = debt.planned_payment || debt.minimum_payment;
  if (entry.monthlyPayment && Math.abs(entry.monthlyPayment - trackedPayment) > 1) {
    differences.push({
      field: 'Monthly Payment',
      reportValue: entry.monthlyPayment,
      trackedValue: trackedPayment,
    });
  }
  
  return differences;
}

export function CreditReportUpload({ debts, onUpdateDebt, onAddDebt }: CreditReportUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    createUpload, 
    incrementUpdatesApplied,
    daysUntilNextUpload, 
    shouldUpload,
    daysSinceLastUpload,
    uploads
  } = useCreditReportUploads();

  const toggleExpanded = (idx: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed at once');
      return;
    }
    
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error('Please upload only PNG, JPEG, or PDF files');
      return;
    }
    
    const oversizedFiles = files.filter(f => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Each file must be under 10MB');
      return;
    }
    
    setSelectedFiles(files);
    setIsUploading(true);
    setAnalysisResult(null);
    setDiscrepancies([]);
    setUploadProgress(0);
    setExpandedItems(new Set());
    
    try {
      const allEntries: CreditEntry[] = [];
      let processedFiles = 0;
      
      // Process each file
      for (const file of files) {
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
          throw new Error(error.error || `Failed to analyze ${file.name}`);
        }
        
        const result: AnalysisResult = await response.json();
        allEntries.push(...result.entries);
        
        processedFiles++;
        setUploadProgress((processedFiles / files.length) * 100);
      }
      
      // Deduplicate entries by name
      const uniqueEntries = allEntries.reduce((acc, entry) => {
        const existing = acc.find(e => 
          normalizeString(e.name) === normalizeString(entry.name) &&
          normalizeString(e.lender) === normalizeString(entry.lender)
        );
        if (!existing) acc.push(entry);
        return acc;
      }, [] as CreditEntry[]);
      
      // Create combined result
      const combinedResult: AnalysisResult = {
        entries: uniqueEntries,
        summary: {
          totalCreditCards: uniqueEntries.filter(e => e.type === 'credit_card').length,
          totalLoans: uniqueEntries.filter(e => e.type === 'loan').length,
          totalMortgages: uniqueEntries.filter(e => e.type === 'mortgage').length,
          totalDebt: uniqueEntries.reduce((sum, e) => sum + e.balance, 0),
          totalCreditLimit: uniqueEntries.reduce((sum, e) => sum + (e.creditLimit || 0), 0),
        },
      };
      
      setAnalysisResult(combinedResult);
      
      // Find discrepancies
      const foundDiscrepancies = findDiscrepancies(combinedResult.entries, debts);
      setDiscrepancies(foundDiscrepancies);
      
      const withIssues = foundDiscrepancies.filter(d => d.differences.length > 0 || !d.matchedDebt);
      
      // Save to history
      await createUpload.mutateAsync({
        file_names: files.map(f => f.name),
        entries_found: combinedResult.entries.length,
        discrepancies_found: withIssues.length,
        raw_results: combinedResult,
      });
      
      if (withIssues.length > 0) {
        toast.warning(`Found ${withIssues.length} item(s) needing attention`);
      } else {
        toast.success('All accounts match your tracked debts!');
      }
      
    } catch (error) {
      console.error('Error analyzing report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze report');
      setSelectedFiles([]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLinkToDebt = (discrepancyIdx: number, debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;
    
    setDiscrepancies(prev => prev.map((d, idx) => {
      if (idx !== discrepancyIdx) return d;
      
      const newDifferences = calculateDifferencesForDebt(d.reportEntry, debt);
      
      return {
        ...d,
        matchedDebt: debt,
        manuallyLinkedDebtId: debtId,
        differences: newDifferences,
        selectedFields: newDifferences.map(diff => diff.field),
        status: 'linked' as const,
      };
    }));
    
    // Auto-expand to show field selection
    setExpandedItems(prev => new Set(prev).add(discrepancyIdx));
  };

  const toggleFieldSelection = (discrepancyIdx: number, field: string) => {
    setDiscrepancies(prev => prev.map((d, idx) => {
      if (idx !== discrepancyIdx) return d;
      
      const selectedFields = d.selectedFields || [];
      const newSelectedFields = selectedFields.includes(field)
        ? selectedFields.filter(f => f !== field)
        : [...selectedFields, field];
      
      return { ...d, selectedFields: newSelectedFields };
    }));
  };

  const handleApplySelectedUpdates = (discrepancy: Discrepancy, discrepancyIdx: number) => {
    const targetDebt = discrepancy.matchedDebt;
    if (!targetDebt) return;
    
    const updates: Partial<Debt> = {};
    const selectedFields = discrepancy.selectedFields || [];
    
    for (const diff of discrepancy.differences) {
      if (!selectedFields.includes(diff.field)) continue;
      
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
    
    if (Object.keys(updates).length === 0) {
      toast.info('No fields selected to update');
      return;
    }
    
    onUpdateDebt(targetDebt.id, updates);
    
    // Increment updates applied if we have a current upload
    if (currentUploadId) {
      incrementUpdatesApplied.mutate(currentUploadId);
    }
    
    // Mark as completed
    setDiscrepancies(prev => prev.map((d, idx) => 
      idx === discrepancyIdx 
        ? { ...d, differences: [], status: 'linked' as const }
        : d
    ));
    
    toast.success(`Updated ${targetDebt.name}`);
  };

  const handleAddAsNew = (entry: CreditEntry, discrepancyIdx: number) => {
    onAddDebt(entry);
    
    // Mark as added
    setDiscrepancies(prev => prev.map((d, idx) => 
      idx === discrepancyIdx
        ? { ...d, status: 'added' as const }
        : d
    ));
    
    toast.success(`Added ${entry.name} as new debt`);
  };

  const handleDismiss = (discrepancyIdx: number) => {
    setDiscrepancies(prev => prev.map((d, idx) => 
      idx === discrepancyIdx 
        ? { ...d, status: 'dismissed' as const, differences: [] }
        : d
    ));
    toast.info('Item dismissed');
  };

  // Filter by status
  const pendingItems = discrepancies.filter(d => d.status === 'pending');
  const unmatchedPending = pendingItems.filter(d => !d.matchedDebt);
  const matchedWithDiffsPending = pendingItems.filter(d => d.matchedDebt && d.differences.length > 0);
  const matchedNoDiffsPending = pendingItems.filter(d => d.matchedDebt && d.differences.length === 0);
  
  const linkedItems = discrepancies.filter(d => d.status === 'linked' && d.differences.length > 0);
  const completedItems = discrepancies.filter(d => 
    d.status === 'added' || 
    d.status === 'dismissed' || 
    (d.status === 'linked' && d.differences.length === 0)
  );

  // Get available debts for linking (not already matched)
  const getAvailableDebtsForLinking = (currentDiscrepancyIdx: number) => {
    const usedDebtIds = new Set(
      discrepancies
        .filter((d, idx) => idx !== currentDiscrepancyIdx && d.matchedDebt)
        .map(d => d.matchedDebt!.id)
    );
    return debts.filter(d => !usedDebtIds.has(d.id));
  };

  const renderEntryCard = (discrepancy: Discrepancy, idx: number, variant: 'unmatched' | 'needs-attention' | 'matched' | 'linking') => {
    const isExpanded = expandedItems.has(idx);
    const availableDebts = getAvailableDebtsForLinking(idx);
    
    const cardStyles = {
      'unmatched': 'border-warning/50 bg-warning/5',
      'needs-attention': 'border-destructive/50 bg-destructive/5',
      'matched': 'border-savings/50 bg-savings/5',
      'linking': 'border-primary/50 bg-primary/5',
    };
    
    return (
      <Card key={idx} className={`p-4 ${cardStyles[variant]}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{discrepancy.reportEntry.name}</p>
              {discrepancy.differences.length > 0 && variant !== 'linking' && (
                <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">
                  {discrepancy.differences.length} difference{discrepancy.differences.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{discrepancy.reportEntry.lender}</p>
            
            {discrepancy.matchedDebt && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-primary">→ Linked to:</span> {discrepancy.matchedDebt.name}
              </p>
            )}
            
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
          
          {(discrepancy.differences.length > 0 || variant === 'unmatched') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleExpanded(idx)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
        
        {/* Field selection - always show when there are differences (not hidden behind expand) */}
        {discrepancy.matchedDebt && discrepancy.differences.length > 0 && (
          <div className="mt-4 pt-3 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Select fields to update:</p>
            <div className="space-y-2">
              {discrepancy.differences.map((diff, diffIdx) => (
                <div 
                  key={diffIdx} 
                  className="flex items-center gap-3 bg-background rounded p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleFieldSelection(idx, diff.field)}
                >
                  <Checkbox 
                    checked={(discrepancy.selectedFields || []).includes(diff.field)}
                    onCheckedChange={() => toggleFieldSelection(idx, diff.field)}
                  />
                  <span className="text-sm flex-1 font-medium">{diff.field}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-destructive line-through">
                      {typeof diff.trackedValue === 'number' ? `£${diff.trackedValue.toLocaleString()}` : diff.trackedValue || 'Not set'}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-savings font-medium">
                      {typeof diff.reportValue === 'number' ? `£${diff.reportValue.toLocaleString()}` : diff.reportValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Expanded section - for linking to different debt */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Link to different debt option */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {discrepancy.matchedDebt ? 'Link to different debt:' : 'Link to existing debt:'}
              </p>
              <Select 
                value={discrepancy.manuallyLinkedDebtId || discrepancy.matchedDebt?.id || ''} 
                onValueChange={(value) => handleLinkToDebt(idx, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a debt to link..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDebts.map(debt => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name} - £{debt.balance.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* No differences message for linked items */}
            {discrepancy.matchedDebt && discrepancy.differences.length === 0 && (
              <p className="text-sm text-savings flex items-center gap-2">
                <Check className="h-4 w-4" />
                All fields match - no updates needed
              </p>
            )}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {discrepancy.matchedDebt && discrepancy.differences.length > 0 && (
            <Button
              size="sm"
              onClick={() => handleApplySelectedUpdates(discrepancy, idx)}
              className="flex-1 gap-1"
              disabled={(discrepancy.selectedFields || []).length === 0}
            >
              <Check className="h-3 w-3" />
              Update Selected ({(discrepancy.selectedFields || []).length})
            </Button>
          )}
          
          {!discrepancy.matchedDebt && (
            <Button
              size="sm"
              onClick={() => handleAddAsNew(discrepancy.reportEntry, idx)}
              className="flex-1 gap-1"
            >
              <Plus className="h-3 w-3" />
              Add as New Debt
            </Button>
          )}
          
          {!discrepancy.matchedDebt && availableDebts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleExpanded(idx)}
              className="gap-1"
            >
              <Link2 className="h-3 w-3" />
              Link
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDismiss(idx)}
            title="Dismiss - this entry is incorrect or not applicable"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Reminder */}
      {shouldUpload && (
        <Card className="p-3 border-primary/50 bg-primary/5">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Time to upload your credit report</p>
              <p className="text-xs text-muted-foreground">
                {daysSinceLastUpload === null 
                  ? "You haven't uploaded a report yet"
                  : `Last uploaded ${daysSinceLastUpload} days ago`
                }
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Countdown */}
      {!shouldUpload && daysUntilNextUpload !== null && (
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-savings/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-savings" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Report up to date</p>
              <p className="text-xs text-muted-foreground">
                Next upload recommended in {daysUntilNextUpload} days
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Upload Button */}
      <Card className="p-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          multiple
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
                Up to 5 PNG, JPEG, or PDF files
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {uploads && uploads.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowHistory(true)}
              >
                <History className="h-4 w-4" />
              </Button>
            )}
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
        </div>
        
        {isUploading && uploadProgress > 0 && (
          <div className="mt-3">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Processing files... {Math.round(uploadProgress)}%
            </p>
          </div>
        )}
        
        {selectedFiles.length > 0 && !isUploading && (
          <div className="mt-2 text-xs text-muted-foreground">
            Analyzed: {selectedFiles.map(f => f.name).join(', ')}
          </div>
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
      
      {/* Items requiring linking (user chose to link) */}
      {linkedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Ready to Update ({linkedItems.length})
          </p>
          {linkedItems.map((d, idx) => {
            const originalIdx = discrepancies.indexOf(d);
            return renderEntryCard(d, originalIdx, 'linking');
          })}
        </div>
      )}
      
      {/* Needs Attention - matched but has differences */}
      {matchedWithDiffsPending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Needs Attention ({matchedWithDiffsPending.length})
          </p>
          {matchedWithDiffsPending.map((d, idx) => {
            const originalIdx = discrepancies.indexOf(d);
            return renderEntryCard(d, originalIdx, 'needs-attention');
          })}
        </div>
      )}
      
      {/* Unmatched - not found in debts */}
      {unmatchedPending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Not In Your Debts ({unmatchedPending.length})
          </p>
          {unmatchedPending.map((d, idx) => {
            const originalIdx = discrepancies.indexOf(d);
            return renderEntryCard(d, originalIdx, 'unmatched');
          })}
        </div>
      )}
      
      {/* Matched - no issues */}
      {matchedNoDiffsPending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Check className="h-4 w-4 text-savings" />
            Matched ({matchedNoDiffsPending.length})
          </p>
          <Card className="p-3">
            <div className="space-y-2">
              {matchedNoDiffsPending.map((d, idx) => {
                const originalIdx = discrepancies.indexOf(d);
                return (
                  <div key={idx} className="flex items-center justify-between py-1 text-sm">
                    <div className="flex-1">
                      <span>{d.reportEntry.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">→ {d.matchedDebt?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AmountDisplay amount={d.reportEntry.balance} size="sm" />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpanded(originalIdx)}
                        className="h-6 w-6 p-0"
                      >
                        <Link2 className="h-3 w-3" />
                      </Button>
                      <Check className="h-3 w-3 text-savings" />
                    </div>
                    {expandedItems.has(originalIdx) && (
                      <div className="w-full mt-2">
                        {renderEntryCard(d, originalIdx, 'matched')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
      
      {/* Completed/Dismissed items */}
      {completedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            Processed ({completedItems.length})
          </p>
          <Card className="p-3 opacity-60">
            <div className="space-y-1">
              {completedItems.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 text-sm text-muted-foreground">
                  <span>{d.reportEntry.name}</span>
                  <span className="text-xs">
                    {d.status === 'added' && '✓ Added'}
                    {d.status === 'dismissed' && '✕ Dismissed'}
                    {d.status === 'linked' && d.differences.length === 0 && '✓ Updated'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      
      {/* History Sheet */}
      <CreditUploadHistorySheet 
        open={showHistory} 
        onOpenChange={setShowHistory} 
      />
    </div>
  );
}
