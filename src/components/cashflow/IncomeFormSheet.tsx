import { useEffect } from 'react';
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
    } else {
      reset({
        name: '',
        monthly_amount: 0,
      });
    }
  }, [income, reset, open]);

  const onSubmit = async (data: IncomeFormData) => {
    const payload = {
      name: data.name,
      monthly_amount: data.monthly_amount,
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
      <SheetContent side="bottom" className="h-auto">
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

          <Button type="submit" className="w-full" disabled={createIncome.isPending || updateIncome.isPending}>
            {isEditing ? 'Save Changes' : 'Add Income'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
