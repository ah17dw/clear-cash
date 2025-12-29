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
import { Textarea } from '@/components/ui/textarea';
import { useCreateDebtPayment } from '@/hooks/useFinanceData';

const paymentSchema = z.object({
  paid_on: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  note: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtId: string;
}

export function PaymentFormSheet({ open, onOpenChange, debtId }: PaymentFormSheetProps) {
  const createPayment = useCreateDebtPayment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paid_on: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      note: '',
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    await createPayment.mutateAsync({
      debt_id: debtId,
      paid_on: data.paid_on,
      amount: data.amount,
      note: data.note || null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Record Payment</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paid_on">Date *</Label>
              <Input id="paid_on" type="date" {...register('paid_on')} />
              {errors.paid_on && (
                <p className="text-xs text-destructive">{errors.paid_on.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" {...register('note')} rows={2} placeholder="Optional note" />
          </div>

          <Button type="submit" className="w-full" disabled={createPayment.isPending}>
            Record Payment
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
