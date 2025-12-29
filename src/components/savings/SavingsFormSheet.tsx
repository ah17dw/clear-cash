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
import { Textarea } from '@/components/ui/textarea';
import { useCreateSavingsAccount, useUpdateSavingsAccount } from '@/hooks/useFinanceData';
import { SavingsAccount } from '@/types/finance';

const savingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: z.string().optional(),
  balance: z.coerce.number().min(0),
  aer: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

type SavingsFormData = z.infer<typeof savingsSchema>;

interface SavingsFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: SavingsAccount;
}

export function SavingsFormSheet({ open, onOpenChange, account }: SavingsFormSheetProps) {
  const createSavings = useCreateSavingsAccount();
  const updateSavings = useUpdateSavingsAccount();
  const isEditing = !!account;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SavingsFormData>({
    resolver: zodResolver(savingsSchema),
    defaultValues: {
      name: '',
      provider: '',
      balance: 0,
      aer: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        provider: account.provider ?? '',
        balance: Number(account.balance),
        aer: Number(account.aer),
        notes: account.notes ?? '',
      });
    } else {
      reset({
        name: '',
        provider: '',
        balance: 0,
        aer: 0,
        notes: '',
      });
    }
  }, [account, reset, open]);

  const onSubmit = async (data: SavingsFormData) => {
    const payload = {
      name: data.name,
      balance: data.balance,
      aer: data.aer,
      provider: data.provider || null,
      notes: data.notes || null,
    };

    if (isEditing) {
      await updateSavings.mutateAsync({ id: account.id, ...payload });
    } else {
      await createSavings.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? 'Edit Savings Account' : 'Add Savings Account'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Emergency Fund" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Input id="provider" {...register('provider')} placeholder="e.g. Nationwide" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Balance *</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                {...register('balance')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aer">AER (%)</Label>
              <Input
                id="aer"
                type="number"
                step="0.01"
                {...register('aer')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={createSavings.isPending || updateSavings.isPending}>
            {isEditing ? 'Save Changes' : 'Add Account'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
