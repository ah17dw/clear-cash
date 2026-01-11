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
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateIncomeSource, useUpdateIncomeSource } from '@/hooks/useFinanceData';
import { IncomeSource } from '@/types/finance';

const incomeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  monthly_amount: z.coerce.number().min(0),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface IncomeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: IncomeSource;
}

export function IncomeFormSheet({ open, onOpenChange, income }: IncomeFormSheetProps) {
  const createIncome = useCreateIncomeSource();
  const updateIncome = useUpdateIncomeSource();
  const isEditing = !!income;

  const [isTemporary, setIsTemporary] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      name: '',
      monthly_amount: 0,
    },
  });

  useEffect(() => {
    if (income) {
      reset({
        name: income.name,
        monthly_amount: Number(income.monthly_amount),
      });
      setStartDate(income.start_date ? new Date(income.start_date) : undefined);
      setEndDate(income.end_date ? new Date(income.end_date) : undefined);
      setIsTemporary(!!(income.start_date || income.end_date));
    } else {
      reset({
        name: '',
        monthly_amount: 0,
      });
      setStartDate(undefined);
      setEndDate(undefined);
      setIsTemporary(false);
    }
  }, [income, reset, open]);

  const onSubmit = async (data: IncomeFormData) => {
    const payload = {
      name: data.name,
      monthly_amount: data.monthly_amount,
      start_date: isTemporary && startDate ? format(startDate, 'yyyy-MM-dd') : null,
      end_date: isTemporary && endDate ? format(endDate, 'yyyy-MM-dd') : null,
    };
    if (isEditing) {
      await updateIncome.mutateAsync({ id: income.id, ...payload });
    } else {
      await createIncome.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? 'Edit Income' : 'Add Income'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Salary" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_amount">Monthly Amount *</Label>
            <Input
              id="monthly_amount"
              type="number"
              step="0.01"
              {...register('monthly_amount')}
            />
          </div>

          {/* Temporary Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label>Temporary income?</Label>
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

          <Button type="submit" className="w-full" disabled={createIncome.isPending || updateIncome.isPending}>
            {isEditing ? 'Save Changes' : 'Add Income'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
