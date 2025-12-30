import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDebt, useUpdateDebt } from '@/hooks/useFinanceData';
import { Debt, DEBT_TYPES } from '@/types/finance';

const debtSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  lender: z.string().optional(),
  starting_balance: z.coerce.number().min(0),
  balance: z.coerce.number().min(0),
  apr: z.coerce.number().min(0).max(100),
  is_promo_0: z.boolean(),
  promo_start_date: z.string().optional(),
  promo_end_date: z.string().optional(),
  post_promo_apr: z.coerce.number().min(0).max(100).optional(),
  payment_day: z.coerce.number().min(1).max(28).optional(),
  minimum_payment: z.coerce.number().min(0),
  minimum_payment_is_percentage: z.boolean(),
  planned_payment: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type DebtFormData = z.infer<typeof debtSchema>;

interface DebtFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: Debt;
}

export function DebtFormSheet({ open, onOpenChange, debt }: DebtFormSheetProps) {
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();
  const isEditing = !!debt;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      name: '',
      type: 'credit_card',
      lender: '',
      starting_balance: 0,
      balance: 0,
      apr: 0,
      is_promo_0: false,
      promo_start_date: '',
      promo_end_date: '',
      post_promo_apr: undefined,
      payment_day: undefined,
      minimum_payment: 0,
      minimum_payment_is_percentage: false,
      planned_payment: undefined,
      notes: '',
    },
  });

  const isPromo = watch('is_promo_0');
  const isPercentage = watch('minimum_payment_is_percentage');
  const balance = watch('balance');

  useEffect(() => {
    if (debt) {
      reset({
        name: debt.name,
        type: debt.type,
        lender: debt.lender ?? '',
        starting_balance: Number(debt.starting_balance),
        balance: Number(debt.balance),
        apr: Number(debt.apr),
        is_promo_0: debt.is_promo_0,
        promo_start_date: debt.promo_start_date ?? '',
        promo_end_date: debt.promo_end_date ?? '',
        post_promo_apr: debt.post_promo_apr ? Number(debt.post_promo_apr) : undefined,
        payment_day: debt.payment_day ?? undefined,
        minimum_payment: Number(debt.minimum_payment),
        minimum_payment_is_percentage: false,
        planned_payment: debt.planned_payment ? Number(debt.planned_payment) : undefined,
        notes: debt.notes ?? '',
      });
    } else {
      reset({
        name: '',
        type: 'credit_card',
        lender: '',
        starting_balance: 0,
        balance: 0,
        apr: 0,
        is_promo_0: false,
        promo_start_date: '',
        promo_end_date: '',
        post_promo_apr: undefined,
        payment_day: undefined,
        minimum_payment: 0,
        minimum_payment_is_percentage: false,
        planned_payment: undefined,
        notes: '',
      });
    }
  }, [debt, reset, open]);

  const onSubmit = async (data: DebtFormData) => {
    // Calculate minimum payment - if percentage, convert to actual amount
    let calculatedMinPayment = data.minimum_payment;
    if (data.minimum_payment_is_percentage && data.balance > 0) {
      calculatedMinPayment = (data.minimum_payment / 100) * data.balance;
    }

    const payload = {
      name: data.name,
      type: data.type,
      starting_balance: data.starting_balance,
      balance: data.balance,
      apr: data.apr,
      is_promo_0: data.is_promo_0,
      minimum_payment: calculatedMinPayment,
      lender: data.lender || null,
      promo_start_date: data.promo_start_date || null,
      promo_end_date: data.promo_end_date || null,
      post_promo_apr: data.post_promo_apr ?? null,
      payment_day: data.payment_day ?? null,
      planned_payment: data.planned_payment ?? null,
      notes: data.notes || null,
    };

    if (isEditing) {
      await updateDebt.mutateAsync({ id: debt.id, ...payload });
    } else {
      await createDebt.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? 'Edit Debt' : 'Add Debt'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Barclaycard" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={watch('type')}
                onValueChange={(v) => setValue('type', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lender">Lender</Label>
              <Input id="lender" {...register('lender')} placeholder="e.g. Barclays" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Current Balance *</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                {...register('balance')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="starting_balance">Starting Balance</Label>
              <Input
                id="starting_balance"
                type="number"
                step="0.01"
                {...register('starting_balance')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="is_promo_0">0% Promotional Rate</Label>
            <Switch
              id="is_promo_0"
              checked={isPromo}
              onCheckedChange={(checked) => setValue('is_promo_0', checked)}
            />
          </div>

          {isPromo ? (
            <div className="space-y-4 p-3 rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="promo_start_date">Promo Start</Label>
                  <Input
                    id="promo_start_date"
                    type="date"
                    {...register('promo_start_date')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo_end_date">Promo End *</Label>
                  <Input
                    id="promo_end_date"
                    type="date"
                    {...register('promo_end_date')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="post_promo_apr">APR After Promo (%)</Label>
                <Input
                  id="post_promo_apr"
                  type="number"
                  step="0.01"
                  {...register('post_promo_apr')}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="apr">APR (%)</Label>
              <Input
                id="apr"
                type="number"
                step="0.01"
                {...register('apr')}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_day">Payment Day</Label>
              <Input
                id="payment_day"
                type="number"
                min="1"
                max="28"
                {...register('payment_day')}
                placeholder="1-28"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="minimum_payment">Min Payment</Label>
                <button
                  type="button"
                  onClick={() => setValue('minimum_payment_is_percentage', !isPercentage)}
                  className="text-xs text-primary hover:underline"
                >
                  {isPercentage ? 'Use £' : 'Use %'}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="minimum_payment"
                  type="number"
                  step={isPercentage ? "0.1" : "0.01"}
                  {...register('minimum_payment')}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {isPercentage ? '%' : '£'}
                </span>
              </div>
              {isPercentage && balance > 0 && (
                <p className="text-xs text-muted-foreground">
                  = £{((watch('minimum_payment') / 100) * balance).toFixed(2)}/mo
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="planned_payment">Planned</Label>
              <Input
                id="planned_payment"
                type="number"
                step="0.01"
                {...register('planned_payment')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={createDebt.isPending || updateDebt.isPending}>
            {isEditing ? 'Save Changes' : 'Add Debt'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
