import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, Loader2, Plus, Trash2, Link } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateExpenseItem, useUpdateExpenseItem, useExpenseItems } from '@/hooks/useFinanceData';
import { useSubExpenses, useCreateSubExpense, useDeleteSubExpense } from '@/hooks/useSubExpenses';
import { ExpenseItem, EXPENSE_CATEGORIES } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { AmountDisplay } from '@/components/ui/amount-display';

const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().min(0),
  category: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseItem;
  readOnly?: boolean;
}

export function ExpenseFormSheet({ open, onOpenChange, expense, readOnly = false }: ExpenseFormSheetProps) {
  const createExpense = useCreateExpenseItem();
  const updateExpense = useUpdateExpenseItem();
  const { data: allExpenses } = useExpenseItems();
  const isEditing = !!expense;
  
  // Sub-expenses hooks (only fetch when editing)
  const { data: subExpenses } = useSubExpenses(expense?.id ?? '');
  const createSubExpense = useCreateSubExpense();
  const deleteSubExpense = useDeleteSubExpense();
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');

  const [isTemporary, setIsTemporary] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [renewalDate, setRenewalDate] = useState<Date | undefined>();
  const [paymentDay, setPaymentDay] = useState<string>('');
  const [isMonthly, setIsMonthly] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [linkedParentId, setLinkedParentId] = useState<string | null>(null);

  // Get available parent expenses (exclude current expense and already-linked expenses)
  const availableParentExpenses = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter(e => 
      e.id !== expense?.id && // Can't link to self
      !e.linked_parent_id // Can't link to something that's already linked
    );
  }, [allExpenses, expense?.id]);

  // Get the parent expense name for display
  const linkedParentName = useMemo(() => {
    if (!linkedParentId || !allExpenses) return null;
    return allExpenses.find(e => e.id === linkedParentId)?.name ?? null;
  }, [linkedParentId, allExpenses]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: '',
      amount: 0,
      category: 'other',
    },
  });

  const currentAmount = watch('amount') || 0;

  useEffect(() => {
    if (expense) {
      const expenseIsMonthly = expense.frequency === 'monthly';
      setIsMonthly(expenseIsMonthly);
      reset({
        name: expense.name,
        // Display amount as stored - monthly_amount stores what user entered
        amount: Number(expense.monthly_amount),
        category: expense.category ?? 'other',
      });
      setStartDate(expense.start_date ? new Date(expense.start_date) : undefined);
      setEndDate(expense.end_date ? new Date(expense.end_date) : undefined);
      setRenewalDate(expense.renewal_date ? new Date(expense.renewal_date) : undefined);
      setPaymentDay(expense.payment_day?.toString() ?? '');
      setIsTemporary(!!(expense.start_date || expense.end_date));
      setLinkedParentId(expense.linked_parent_id ?? null);
    } else {
      reset({
        name: '',
        amount: 0,
        category: 'other',
      });
      setStartDate(undefined);
      setEndDate(undefined);
      setRenewalDate(undefined);
      setPaymentDay('');
      setIsTemporary(false);
      setIsMonthly(false);
      setUploadedFile(null);
      setNewSubName('');
      setNewSubAmount('');
      setLinkedParentId(null);
    }
  }, [expense, reset, open]);

  const handleAddSubExpense = async () => {
    if (!expense || !newSubName.trim()) return;
    
    await createSubExpense.mutateAsync({
      parent_expense_id: expense.id,
      name: newSubName.trim(),
      monthly_amount: parseFloat(newSubAmount) || 0,
    });
    
    setNewSubName('');
    setNewSubAmount('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setIsUploading(true);
    
    try {
      await extractFromFile(file);
    } catch (error) {
      console.error('File processing error:', error);
      toast.error('Failed to process file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const extractFromFile = async (file: File) => {
    setIsExtracting(true);
    
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('extract-expense', {
        body: { 
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const extracted = data.data;
      if (extracted) {
        if (extracted.name) setValue('name', extracted.name);
        if (extracted.monthly_amount) {
          // AI returns monthly amount, convert to annual for our form
          setValue('amount', extracted.monthly_amount * 12);
        }
        if (extracted.category) setValue('category', extracted.category);
        toast.success('Information extracted from file!');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract information');
    } finally {
      setIsExtracting(false);
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    // Store exactly what user entered - monthly_amount is used directly
    const monthlyAmount = data.amount;
    const frequency: 'monthly' | 'annual' = isMonthly ? 'monthly' : 'annual';
    
    const parsedPaymentDay = paymentDay ? parseInt(paymentDay, 10) : null;
    
    const payload = {
      name: data.name,
      monthly_amount: monthlyAmount,
      category: data.category || null,
      frequency,
      renewal_date: renewalDate ? format(renewalDate, 'yyyy-MM-dd') : null,
      payment_day: parsedPaymentDay && parsedPaymentDay >= 1 && parsedPaymentDay <= 31 ? parsedPaymentDay : null,
      start_date: isTemporary && startDate ? format(startDate, 'yyyy-MM-dd') : null,
      end_date: isTemporary && endDate ? format(endDate, 'yyyy-MM-dd') : null,
      linked_parent_id: linkedParentId,
    };

    if (isEditing) {
      await updateExpense.mutateAsync({ id: expense.id, ...payload });
    } else {
      await createExpense.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  // Calculate the displayed monthly equivalent
  const monthlyEquivalent = isMonthly ? currentAmount : currentAmount / 12;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{readOnly ? 'Expense Details' : isEditing ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
          {/* AI Extraction Section */}
          {!isEditing && !readOnly && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Document Extraction
              </div>
              <p className="text-xs text-muted-foreground">
                Upload an invoice, contract, or bill to automatically extract expense details
              </p>
              
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
              
              {uploadedFile && !isExtracting && (
                <p className="text-xs text-muted-foreground">
                  Processed: {uploadedFile.name}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name {!readOnly && '*'}</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Car Insurance" disabled={readOnly} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                {isMonthly ? 'Monthly Amount' : 'Annual Amount'} {!readOnly && '*'}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                disabled={readOnly}
              />
              {!isMonthly && currentAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {formatCurrency(monthlyEquivalent)}/month
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={watch('category')}
                onValueChange={(v) => setValue('category', v)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Day */}
          <div className="space-y-2">
            <Label>Payment Day</Label>
            <Select
              value={paymentDay || 'none'}
              onValueChange={(v) => setPaymentDay(v === 'none' ? '' : v)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific day</SelectItem>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Day of month when payment leaves your bank</p>
          </div>

          {/* Renewal/Contract End Date */}
          <div className="space-y-2">
            <Label>Contract End / Renewal Date</Label>
            {readOnly ? (
              <p className="text-sm py-2 px-3 rounded-md bg-muted">
                {renewalDate ? format(renewalDate, 'dd/MM/yyyy') : 'Not set'}
              </p>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn('w-full justify-start', !renewalDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {renewalDate ? format(renewalDate, 'dd/MM/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={renewalDate}
                    onSelect={setRenewalDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
            <p className="text-xs text-muted-foreground">When does the contract end or come up for renewal?</p>
          </div>

          {/* Monthly Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label>Monthly payment?</Label>
              <p className="text-xs text-muted-foreground">
                {readOnly ? (isMonthly ? 'Paid monthly' : 'Paid annually') : 'Toggle if this is paid monthly'}
              </p>
            </div>
            <Switch
              checked={isMonthly}
              disabled={readOnly}
              onCheckedChange={(checked) => {
                if (readOnly) return;
                // Convert the amount when toggling
                if (checked && currentAmount > 0) {
                  // Converting from annual to monthly: divide by 12
                  setValue('amount', Number((currentAmount / 12).toFixed(2)));
                } else if (!checked && currentAmount > 0) {
                  // Converting from monthly to annual: multiply by 12
                  setValue('amount', Number((currentAmount * 12).toFixed(2)));
                }
                setIsMonthly(checked);
              }}
            />
          </div>

          {/* Temporary Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label>Temporary expense?</Label>
              <p className="text-xs text-muted-foreground">
                {readOnly ? (isTemporary ? 'Has start/end dates' : 'No date restrictions') : 'Set start/end dates'}
              </p>
            </div>
            <Switch
              checked={isTemporary}
              disabled={readOnly}
              onCheckedChange={readOnly ? undefined : setIsTemporary}
            />
          </div>

          {isTemporary && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                {readOnly ? (
                  <p className="text-sm py-2 px-3 rounded-md bg-muted">
                    {startDate ? format(startDate, 'dd/MM/yyyy') : 'Not set'}
                  </p>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('w-full justify-start', !startDate && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy') : 'Select'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                {readOnly ? (
                  <p className="text-sm py-2 px-3 rounded-md bg-muted">
                    {endDate ? format(endDate, 'dd/MM/yyyy') : 'Not set'}
                  </p>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('w-full justify-start', !endDate && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy') : 'Select'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )}

          {/* Link to Parent Expense */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <Label>Included in another expense?</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Link this expense to a parent if it's already accounted for elsewhere (e.g., Netflix included in Joint Card). It will show as £0 in totals.
            </p>
            {readOnly ? (
              <p className="text-sm py-2 px-3 rounded-md bg-muted">
                {linkedParentName ? `Included in: ${linkedParentName}` : 'Not linked'}
              </p>
            ) : (
              <Select
                value={linkedParentId || 'none'}
                onValueChange={(v) => setLinkedParentId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent expense" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked (counts in totals)</SelectItem>
                  {availableParentExpenses.map((exp) => (
                    <SelectItem key={exp.id} value={exp.id}>
                      {exp.name} (£{Number(exp.monthly_amount).toFixed(0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Sub-expenses section - only show when editing or viewing */}
          {(isEditing || readOnly) && expense && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Sub-expenses</Label>
                {subExpenses && subExpenses.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Total: {formatCurrency(subExpenses.reduce((sum, s) => sum + Number(s.monthly_amount), 0))}
                  </span>
                )}
              </div>
              
              {/* Add sub-expense - only show when not read-only */}
              {!readOnly && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Name (e.g., Electric)"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="£"
                    value={newSubAmount}
                    onChange={(e) => setNewSubAmount(e.target.value)}
                    className="w-20"
                    step="0.01"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleAddSubExpense}
                    disabled={!newSubName.trim() || createSubExpense.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* List sub-expenses */}
              {subExpenses && subExpenses.length > 0 ? (
                <div className="space-y-1">
                  {subExpenses.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between py-1.5 px-2 bg-muted/50 rounded"
                    >
                      <span className="text-sm">{sub.name}</span>
                      <div className="flex items-center gap-2">
                        <AmountDisplay amount={Number(sub.monthly_amount)} size="sm" />
                        {!readOnly && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteSubExpense.mutate({ id: sub.id, parent_expense_id: expense.id })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {readOnly ? 'No sub-expenses' : 'No sub-expenses. Add items like Water, Electric, etc.'}
                </p>
              )}
            </div>
          )}

          {!readOnly && (
            <Button type="submit" className="w-full" disabled={createExpense.isPending || updateExpense.isPending}>
              {isEditing ? 'Save Changes' : 'Add Expense'}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
