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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateExpenseItem, useUpdateExpenseItem } from '@/hooks/useFinanceData';
import { ExpenseItem, EXPENSE_CATEGORIES } from '@/types/finance';

const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  monthly_amount: z.coerce.number().min(0),
  category: z.string().optional(),
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
    },
  });

  useEffect(() => {
    if (expense) {
      reset({
        name: expense.name,
        monthly_amount: Number(expense.monthly_amount),
        category: expense.category ?? 'other',
      });
    } else {
      reset({
        name: '',
        monthly_amount: 0,
        category: 'other',
      });
    }
  }, [expense, reset, open]);

  const onSubmit = async (data: ExpenseFormData) => {
    const payload = {
      name: data.name,
      monthly_amount: data.monthly_amount,
      category: data.category || null,
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
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Netflix" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_amount">Monthly Amount *</Label>
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

          <Button type="submit" className="w-full" disabled={createExpense.isPending || updateExpense.isPending}>
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
