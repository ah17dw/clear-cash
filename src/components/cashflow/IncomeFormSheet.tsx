import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateIncomeSource, useUpdateIncomeSource } from '@/hooks/useFinanceData';
import { IncomeSource } from '@/types/finance';
import { BANK_ACCOUNTS } from '@/types/bank-accounts';
import { formatCurrency } from '@/lib/format';

const incomeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().min(0),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface IncomeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: IncomeSource;
  readOnly?: boolean;
}

export function IncomeFormSheet({ open, onOpenChange, income, readOnly = false }: IncomeFormSheetProps) {
  const createIncome = useCreateIncomeSource();
  const updateIncome = useUpdateIncomeSource();
  const isEditing = !!income;

  const [isTemporary, setIsTemporary] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isMonthly, setIsMonthly] = useState(false);
  const [bankAccount, setBankAccount] = useState<string | null>(null);
  const [paymentDay, setPaymentDay] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      name: '',
      amount: 0,
    },
  });

  const currentAmount = watch('amount') || 0;

  useEffect(() => {
    if (income) {
      // Check if income has a frequency field, default to monthly for backwards compatibility
      const incomeIsMonthly = (income as any).frequency === 'monthly' || !(income as any).frequency;
      setIsMonthly(incomeIsMonthly);
      reset({
        name: income.name,
        // Display as annual amount in the form (convert monthly to annual)
        amount: incomeIsMonthly 
          ? Number(income.monthly_amount) * 12 
          : Number(income.monthly_amount),
      });
      setStartDate(income.start_date ? new Date(income.start_date) : undefined);
      setEndDate(income.end_date ? new Date(income.end_date) : undefined);
      setIsTemporary(!!(income.start_date || income.end_date));
      setBankAccount(income.bank_account ?? null);
      setPaymentDay(income.payment_day?.toString() ?? '');
    } else {
      reset({
        name: '',
        amount: 0,
      });
      setStartDate(undefined);
      setEndDate(undefined);
      setIsTemporary(false);
      setIsMonthly(false);
      setBankAccount(null);
      setPaymentDay('');
    }
  }, [income, reset, open]);

  const onSubmit = async (data: IncomeFormData) => {
    // Convert to monthly amount for storage
    const monthlyAmount = isMonthly ? data.amount : data.amount / 12;
    const parsedPaymentDay = paymentDay ? parseInt(paymentDay, 10) : null;
    
    const payload = {
      name: data.name,
      monthly_amount: monthlyAmount,
      start_date: isTemporary && startDate ? format(startDate, 'yyyy-MM-dd') : null,
      end_date: isTemporary && endDate ? format(endDate, 'yyyy-MM-dd') : null,
      bank_account: bankAccount,
      payment_day: parsedPaymentDay && parsedPaymentDay >= 1 && parsedPaymentDay <= 31 ? parsedPaymentDay : null,
    };
    if (isEditing) {
      await updateIncome.mutateAsync({ id: income.id, ...payload });
    } else {
      await createIncome.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  // Calculate the displayed monthly equivalent
  const monthlyEquivalent = isMonthly ? currentAmount : currentAmount / 12;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{readOnly ? 'Income Details' : isEditing ? 'Edit Income' : 'Add Income'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name {!readOnly && '*'}</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Salary" disabled={readOnly} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

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

          {/* Bank Account Selection */}
          <div className="space-y-2">
            <Label>Bank Account</Label>
            {readOnly ? (
              <p className="text-sm py-2 px-3 rounded-md bg-muted">
                {BANK_ACCOUNTS.find(b => b.value === bankAccount)?.label ?? 'Not set'}
              </p>
            ) : (
              <Select
                value={bankAccount || 'none'}
                onValueChange={(v) => setBankAccount(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {BANK_ACCOUNTS.map((acc) => (
                    <SelectItem key={acc.value} value={acc.value}>
                      {acc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">Which account does this income go into?</p>
          </div>

          {/* Payment Day */}
          <div className="space-y-2">
            <Label>Payment Day</Label>
            {readOnly ? (
              <p className="text-sm py-2 px-3 rounded-md bg-muted">
                {paymentDay ? `${paymentDay}${paymentDay === '1' ? 'st' : paymentDay === '2' ? 'nd' : paymentDay === '3' ? 'rd' : 'th'}` : 'Not set'}
              </p>
            ) : (
              <Select
                value={paymentDay || 'none'}
                onValueChange={(v) => setPaymentDay(v === 'none' ? '' : v)}
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
            )}
            <p className="text-xs text-muted-foreground">Day of month when you receive this income</p>
          </div>

          {/* Monthly Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label>Monthly income?</Label>
              <p className="text-xs text-muted-foreground">
                {readOnly ? (isMonthly ? 'Received monthly' : 'Received annually') : 'Toggle if this is received monthly'}
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
              <Label>Temporary income?</Label>
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

          {!readOnly && (
            <Button type="submit" className="w-full" disabled={createIncome.isPending || updateIncome.isPending}>
              {isEditing ? 'Save Changes' : 'Add Income'}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
