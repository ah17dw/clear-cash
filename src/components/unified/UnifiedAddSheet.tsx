import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ArrowLeft, CreditCard, ArrowDownCircle, ArrowUpCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpenseFormSheet } from '@/components/cashflow/ExpenseFormSheet';
import { IncomeFormSheet } from '@/components/cashflow/IncomeFormSheet';
import { DebtFormSheet } from '@/components/debts/DebtFormSheet';
import { RenewalFormSheet } from '@/components/renewals/RenewalFormSheet';

export type AddItemType = 'expense' | 'income' | 'debt' | 'renewal';

interface UnifiedAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: AddItemType;
}

const TYPE_OPTIONS: { value: AddItemType; label: string; description: string; icon: React.ElementType; color: string }[] = [
  {
    value: 'expense',
    label: 'Expense',
    description: 'Regular outgoing payments',
    icon: ArrowUpCircle,
    color: 'text-debt bg-debt/20',
  },
  {
    value: 'income',
    label: 'Income',
    description: 'Money coming in',
    icon: ArrowDownCircle,
    color: 'text-savings bg-savings/20',
  },
  {
    value: 'debt',
    label: 'Debt',
    description: 'Credit cards, loans, etc.',
    icon: CreditCard,
    color: 'text-amber-500 bg-amber-500/20',
  },
  {
    value: 'renewal',
    label: 'Renewal',
    description: 'Contracts & agreements',
    icon: FileText,
    color: 'text-primary bg-primary/20',
  },
];

export function UnifiedAddSheet({ open, onOpenChange, defaultType }: UnifiedAddSheetProps) {
  const [selectedType, setSelectedType] = useState<AddItemType | null>(defaultType ?? null);

  // When sheet opens, reset to type selection (unless defaultType is provided)
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset when closing
      setSelectedType(defaultType ?? null);
    }
    onOpenChange(isOpen);
  };

  const handleTypeSelect = (type: AddItemType) => {
    setSelectedType(type);
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  // Handle closing the form sheets and closing the unified sheet
  const handleFormClose = (isOpen: boolean) => {
    if (!isOpen) {
      handleOpenChange(false);
    }
  };

  // If a type is selected, render the corresponding form sheet
  if (selectedType === 'expense') {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="p-1 -ml-1 rounded-md hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <SheetTitle>Add Expense</SheetTitle>
            </div>
          </SheetHeader>
          <ExpenseFormInline onClose={() => handleFormClose(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  if (selectedType === 'income') {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="p-1 -ml-1 rounded-md hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <SheetTitle>Add Income</SheetTitle>
            </div>
          </SheetHeader>
          <IncomeFormInline onClose={() => handleFormClose(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  if (selectedType === 'debt') {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="p-1 -ml-1 rounded-md hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <SheetTitle>Add Debt</SheetTitle>
            </div>
          </SheetHeader>
          <DebtFormInline onClose={() => handleFormClose(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  if (selectedType === 'renewal') {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="p-1 -ml-1 rounded-md hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <SheetTitle>Add Renewal</SheetTitle>
            </div>
          </SheetHeader>
          <RenewalFormInline onClose={() => handleFormClose(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  // Type selection view
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>What would you like to add?</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 pb-4">
          {TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleTypeSelect(option.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border",
                  "hover:border-primary hover:bg-muted/50 transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                )}
              >
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", option.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Inline form components that work within the unified sheet
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, Loader2, Plus, Link } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateExpenseItem, useExpenseItems, useCreateIncomeSource, useCreateDebt } from '@/hooks/useFinanceData';
import { useCreateRenewal } from '@/hooks/useRenewals';
import { EXPENSE_CATEGORIES, DEBT_TYPES } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { useMemo, useState as useInlineState } from 'react';

// ========== EXPENSE INLINE FORM ==========
const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().min(0),
  category: z.string().optional(),
});

function ExpenseFormInline({ onClose }: { onClose: () => void }) {
  const createExpense = useCreateExpenseItem();
  const { data: allExpenses } = useExpenseItems();
  
  const [isTemporary, setIsTemporary] = useInlineState(false);
  const [startDate, setStartDate] = useInlineState<Date | undefined>();
  const [endDate, setEndDate] = useInlineState<Date | undefined>();
  const [renewalDate, setRenewalDate] = useInlineState<Date | undefined>();
  const [paymentDay, setPaymentDay] = useInlineState<string>('');
  const [isMonthly, setIsMonthly] = useInlineState(false);
  const [linkedParentId, setLinkedParentId] = useInlineState<string | null>(null);
  const [isUploading, setIsUploading] = useInlineState(false);
  const [isExtracting, setIsExtracting] = useInlineState(false);
  const [uploadedFile, setUploadedFile] = useInlineState<File | null>(null);

  const availableParentExpenses = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter(e => !e.linked_parent_id);
  }, [allExpenses]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: { name: '', amount: 0, category: 'other' },
  });

  const currentAmount = watch('amount') || 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setIsUploading(true);
    
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setIsExtracting(true);
      const { data, error } = await supabase.functions.invoke('extract-expense', {
        body: { fileBase64: base64, fileName: file.name, mimeType: file.type },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const extracted = data.data;
      if (extracted) {
        if (extracted.name) setValue('name', extracted.name);
        if (extracted.monthly_amount) setValue('amount', extracted.monthly_amount * 12);
        if (extracted.category) setValue('category', extracted.category);
        toast.success('Information extracted from file!');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract information');
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
      e.target.value = '';
    }
  };

  const onSubmit = async (data: z.infer<typeof expenseSchema>) => {
    const monthlyAmount = data.amount;
    const frequency: 'monthly' | 'annual' = isMonthly ? 'monthly' : 'annual';
    const parsedPaymentDay = paymentDay ? parseInt(paymentDay, 10) : null;
    
    await createExpense.mutateAsync({
      name: data.name,
      monthly_amount: monthlyAmount,
      category: data.category || null,
      frequency,
      renewal_date: renewalDate ? format(renewalDate, 'yyyy-MM-dd') : null,
      payment_day: parsedPaymentDay && parsedPaymentDay >= 1 && parsedPaymentDay <= 31 ? parsedPaymentDay : null,
      start_date: isTemporary && startDate ? format(startDate, 'yyyy-MM-dd') : null,
      end_date: isTemporary && endDate ? format(endDate, 'yyyy-MM-dd') : null,
      linked_parent_id: linkedParentId,
    });
    onClose();
  };

  const monthlyEquivalent = isMonthly ? currentAmount : currentAmount / 12;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
      {/* AI Extraction */}
      <div className="p-4 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Document Extraction
        </div>
        <div className="flex gap-2">
          <Input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="flex-1"
            disabled={isUploading || isExtracting}
          />
          {(isUploading || isExtracting) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isExtracting ? 'Extracting...' : 'Processing...'}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register('name')} placeholder="e.g. Car Insurance" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{isMonthly ? 'Monthly Amount' : 'Annual Amount'} *</Label>
          <Input type="number" step="0.01" {...register('amount')} />
          {!isMonthly && currentAmount > 0 && (
            <p className="text-xs text-muted-foreground">= {formatCurrency(monthlyEquivalent)}/month</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={watch('category')} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Link to Parent */}
      <div className="space-y-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-primary" />
          <Label>Included in another expense?</Label>
        </div>
        <Select value={linkedParentId || 'none'} onValueChange={(v) => setLinkedParentId(v === 'none' ? null : v)}>
          <SelectTrigger><SelectValue placeholder="Select parent expense" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not linked (counts in totals)</SelectItem>
            {availableParentExpenses.map((exp) => (
              <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div>
          <Label>Monthly payment?</Label>
          <p className="text-xs text-muted-foreground">Toggle if paid monthly</p>
        </div>
        <Switch checked={isMonthly} onCheckedChange={setIsMonthly} />
      </div>

      {/* Temporary Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div>
          <Label>Temporary expense?</Label>
          <p className="text-xs text-muted-foreground">Set start/end dates</p>
        </div>
        <Switch checked={isTemporary} onCheckedChange={setIsTemporary} />
      </div>

      <Button type="submit" className="w-full" disabled={createExpense.isPending}>
        Add Expense
      </Button>
    </form>
  );
}

// ========== INCOME INLINE FORM ==========
const incomeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().min(0),
});

function IncomeFormInline({ onClose }: { onClose: () => void }) {
  const createIncome = useCreateIncomeSource();
  
  const [isTemporary, setIsTemporary] = useInlineState(false);
  const [startDate, setStartDate] = useInlineState<Date | undefined>();
  const [endDate, setEndDate] = useInlineState<Date | undefined>();
  const [isMonthly, setIsMonthly] = useInlineState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(incomeSchema),
    defaultValues: { name: '', amount: 0 },
  });

  const currentAmount = watch('amount') || 0;

  const onSubmit = async (data: z.infer<typeof incomeSchema>) => {
    const monthlyAmount = isMonthly ? data.amount : data.amount / 12;
    
    await createIncome.mutateAsync({
      name: data.name,
      monthly_amount: monthlyAmount,
      start_date: isTemporary && startDate ? format(startDate, 'yyyy-MM-dd') : null,
      end_date: isTemporary && endDate ? format(endDate, 'yyyy-MM-dd') : null,
    });
    onClose();
  };

  const monthlyEquivalent = isMonthly ? currentAmount : currentAmount / 12;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register('name')} placeholder="e.g. Salary" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>{isMonthly ? 'Monthly Amount' : 'Annual Amount'} *</Label>
        <Input type="number" step="0.01" {...register('amount')} />
        {!isMonthly && currentAmount > 0 && (
          <p className="text-xs text-muted-foreground">= {formatCurrency(monthlyEquivalent)}/month</p>
        )}
      </div>

      {/* Monthly Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div>
          <Label>Monthly income?</Label>
          <p className="text-xs text-muted-foreground">Toggle if received monthly</p>
        </div>
        <Switch checked={isMonthly} onCheckedChange={setIsMonthly} />
      </div>

      {/* Temporary Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div>
          <Label>Temporary income?</Label>
          <p className="text-xs text-muted-foreground">Set start/end dates</p>
        </div>
        <Switch checked={isTemporary} onCheckedChange={setIsTemporary} />
      </div>

      {isTemporary && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className={cn('w-full justify-start', !startDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd/MM/yyyy') : 'Select'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className={cn('w-full justify-start', !endDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd/MM/yyyy') : 'Select'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={createIncome.isPending}>
        Add Income
      </Button>
    </form>
  );
}

// ========== DEBT INLINE FORM ==========
const debtSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  lender: z.string().optional(),
  starting_balance: z.coerce.number().min(0),
  balance: z.coerce.number().min(0),
  apr: z.coerce.number().min(0).max(100),
  is_promo_0: z.boolean(),
  promo_end_date: z.string().optional(),
  minimum_payment: z.coerce.number().min(0),
  planned_payment: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

function DebtFormInline({ onClose }: { onClose: () => void }) {
  const createDebt = useCreateDebt();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      name: '', type: 'credit_card', lender: '', starting_balance: 0, balance: 0, apr: 0,
      is_promo_0: false, promo_end_date: '', minimum_payment: 0, planned_payment: undefined, notes: '',
    },
  });

  const isPromo = watch('is_promo_0');

  const onSubmit = async (data: z.infer<typeof debtSchema>) => {
    await createDebt.mutateAsync({
      name: data.name,
      type: data.type,
      starting_balance: data.starting_balance,
      balance: data.balance,
      apr: data.apr,
      is_promo_0: data.is_promo_0,
      minimum_payment: data.minimum_payment,
      lender: data.lender || null,
      promo_start_date: null,
      promo_end_date: data.promo_end_date || null,
      post_promo_apr: null,
      payment_day: null,
      planned_payment: data.planned_payment ?? null,
      notes: data.notes || null,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input {...register('name')} placeholder="e.g. Barclaycard" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={watch('type')} onValueChange={(v) => setValue('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEBT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Lender</Label>
          <Input {...register('lender')} placeholder="e.g. Barclays" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Current Balance *</Label>
          <Input type="number" step="0.01" {...register('balance')} />
        </div>
        <div className="space-y-2">
          <Label>Starting Balance</Label>
          <Input type="number" step="0.01" {...register('starting_balance')} />
        </div>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label>0% Promotional Rate</Label>
        <Switch checked={isPromo} onCheckedChange={(checked) => setValue('is_promo_0', checked)} />
      </div>

      {isPromo ? (
        <div className="space-y-2 p-3 rounded-lg bg-muted/50">
          <Label>Promo End Date</Label>
          <Input type="date" {...register('promo_end_date')} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>APR (%)</Label>
          <Input type="number" step="0.01" {...register('apr')} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Minimum Payment</Label>
          <Input type="number" step="0.01" {...register('minimum_payment')} />
        </div>
        <div className="space-y-2">
          <Label>Planned Payment</Label>
          <Input type="number" step="0.01" {...register('planned_payment')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea {...register('notes')} rows={2} />
      </div>

      <Button type="submit" className="w-full" disabled={createDebt.isPending}>
        Add Debt
      </Button>
    </form>
  );
}

// ========== RENEWAL INLINE FORM ==========
function RenewalFormInline({ onClose }: { onClose: () => void }) {
  const createRenewal = useCreateRenewal();
  
  const [name, setName] = useInlineState('');
  const [provider, setProvider] = useInlineState('');
  const [totalCost, setTotalCost] = useInlineState('');
  const [monthlyAmount, setMonthlyAmount] = useInlineState('');
  const [isMonthlyPayment, setIsMonthlyPayment] = useInlineState(true);
  const [frequency, setFrequency] = useInlineState<'weekly' | 'monthly' | 'annually'>('annually');
  const [agreementStart, setAgreementStart] = useInlineState<Date | undefined>();
  const [agreementEnd, setAgreementEnd] = useInlineState<Date | undefined>();
  const [notes, setNotes] = useInlineState('');
  const [personOrAddress, setPersonOrAddress] = useInlineState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    await createRenewal.mutateAsync({
      name: name.trim(),
      provider: provider.trim() || null,
      total_cost: parseFloat(totalCost) || 0,
      monthly_amount: parseFloat(monthlyAmount) || 0,
      is_monthly_payment: isMonthlyPayment,
      frequency,
      agreement_start: agreementStart ? format(agreementStart, 'yyyy-MM-dd') : null,
      agreement_end: agreementEnd ? format(agreementEnd, 'yyyy-MM-dd') : null,
      notes: notes.trim() || null,
      person_or_address: personOrAddress.trim() || null,
      file_url: null,
      file_name: null,
      added_to_expenses: false,
      linked_expense_id: null,
      show_in_cashflow: false,
      couples_mode: false,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-8">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Car Insurance" required />
        </div>
        <div className="space-y-2">
          <Label>Provider</Label>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. Aviva" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <Label>Monthly payments?</Label>
          <Switch checked={isMonthlyPayment} onCheckedChange={setIsMonthlyPayment} />
        </div>
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as 'weekly' | 'monthly' | 'annually')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{isMonthlyPayment ? 'Annual Cost (£)' : 'Total Cost (£)'}</Label>
          <Input type="number" step="0.01" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Monthly Amount (£)</Label>
          <Input 
            type="number" 
            step="0.01" 
            value={monthlyAmount} 
            onChange={(e) => setMonthlyAmount(e.target.value)} 
            readOnly={!isMonthlyPayment}
            className={cn(!isMonthlyPayment && 'bg-muted')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Agreement Start</Label>
          <Input
            type="date"
            value={agreementStart ? format(agreementStart, 'yyyy-MM-dd') : ''}
            onChange={(e) => setAgreementStart(e.target.value ? new Date(e.target.value) : undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label>Agreement End</Label>
          <Input
            type="date"
            value={agreementEnd ? format(agreementEnd, 'yyyy-MM-dd') : ''}
            onChange={(e) => setAgreementEnd(e.target.value ? new Date(e.target.value) : undefined)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Person / Address</Label>
        <Input value={personOrAddress} onChange={(e) => setPersonOrAddress(e.target.value)} placeholder="e.g. John or 123 Main St" />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <Button type="submit" className="w-full" disabled={createRenewal.isPending}>
        Add Renewal
      </Button>
    </form>
  );
}
