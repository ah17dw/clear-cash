import { useState, useEffect } from 'react';
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
import { CalendarIcon, Upload, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateExpenseItem, useUpdateExpenseItem } from '@/hooks/useFinanceData';
import { ExpenseItem, EXPENSE_CATEGORIES } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  monthly_amount: z.coerce.number().min(0),
  category: z.string().optional(),
  frequency: z.enum(['monthly', 'annual']).default('monthly'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseItem;
}

export function ExpenseFormSheet({ open, onOpenChange, expense }: ExpenseFormSheetProps) {
  const createExpense = useCreateExpenseItem();
  const updateExpense = useUpdateExpenseItem();
  const isEditing = !!expense;

  const [isTemporary, setIsTemporary] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [frequency, setFrequency] = useState<'monthly' | 'annual'>('monthly');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
      monthly_amount: 0,
      category: 'other',
      frequency: 'monthly',
    },
  });

  useEffect(() => {
    if (expense) {
      reset({
        name: expense.name,
        monthly_amount: Number(expense.monthly_amount),
        category: expense.category ?? 'other',
        frequency: expense.frequency ?? 'monthly',
      });
      setStartDate(expense.start_date ? new Date(expense.start_date) : undefined);
      setEndDate(expense.end_date ? new Date(expense.end_date) : undefined);
      setIsTemporary(!!(expense.start_date || expense.end_date));
      setFrequency(expense.frequency ?? 'monthly');
    } else {
      reset({
        name: '',
        monthly_amount: 0,
        category: 'other',
        frequency: 'monthly',
      });
      setStartDate(undefined);
      setEndDate(undefined);
      setIsTemporary(false);
      setFrequency('monthly');
      setUploadedFile(null);
    }
  }, [expense, reset, open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setIsUploading(true);
    
    try {
      // Extract text from the file using AI
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
      // Read file as base64 for AI processing
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data after the comma
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call extract-expense edge function with file content
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
        if (extracted.monthly_amount) setValue('monthly_amount', extracted.monthly_amount);
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
    const payload = {
      name: data.name,
      monthly_amount: data.monthly_amount,
      category: data.category || null,
      frequency: frequency,
      start_date: isTemporary && startDate ? format(startDate, 'yyyy-MM-dd') : null,
      end_date: isTemporary && endDate ? format(endDate, 'yyyy-MM-dd') : null,
    };

    if (isEditing) {
      await updateExpense.mutateAsync({ id: expense.id, ...payload });
    } else {
      await createExpense.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
          {/* AI Extraction Section */}
          {!isEditing && (
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
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Netflix" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Frequency Selection */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(v: 'monthly' | 'annual') => setFrequency(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_amount">
                {frequency === 'annual' ? 'Annual Amount *' : 'Monthly Amount *'}
              </Label>
              <Input
                id="monthly_amount"
                type="number"
                step="0.01"
                {...register('monthly_amount')}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={watch('category')}
                onValueChange={(v) => setValue('category', v)}
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

          {/* Temporary Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label>Temporary expense?</Label>
              <p className="text-xs text-muted-foreground">Set start/end dates</p>
            </div>
            <Switch
              checked={isTemporary}
              onCheckedChange={setIsTemporary}
            />
          </div>

          {isTemporary && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
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
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
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
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={createExpense.isPending || updateExpense.isPending}>
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
