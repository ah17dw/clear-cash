import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditReportEntry, CreditReportFormData } from '@/hooks/useCreditReport';
import { useEffect } from 'react';

const CREDIT_TYPES = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'loan', label: 'Personal Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'car_finance', label: 'Car Finance' },
  { value: 'overdraft', label: 'Overdraft' },
  { value: 'store_card', label: 'Store Card' },
  { value: 'bnpl', label: 'Buy Now Pay Later' },
  { value: 'other', label: 'Other' },
];

const ACCOUNT_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'settled', label: 'Settled' },
  { value: 'defaulted', label: 'Defaulted' },
];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  lender: z.string().optional(),
  type: z.string().min(1, 'Type is required'),
  balance: z.coerce.number().min(0, 'Balance must be 0 or more'),
  credit_limit: z.coerce.number().optional(),
  monthly_payment: z.coerce.number().optional(),
  account_status: z.string().optional(),
  notes: z.string().optional(),
});

interface CreditEntryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: CreditReportEntry | null;
  onSubmit: (data: CreditReportFormData) => void;
  debts?: Array<{ id: string; name: string }>;
}

export function CreditEntryFormSheet({ open, onOpenChange, entry, onSubmit, debts }: CreditEntryFormSheetProps) {
  const form = useForm<CreditReportFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      lender: '',
      type: 'credit_card',
      balance: 0,
      credit_limit: undefined,
      monthly_payment: undefined,
      account_status: 'open',
      notes: '',
    },
  });

  useEffect(() => {
    if (entry) {
      form.reset({
        name: entry.name,
        lender: entry.lender || '',
        type: entry.type,
        balance: entry.balance,
        credit_limit: entry.credit_limit || undefined,
        monthly_payment: entry.monthly_payment || undefined,
        account_status: entry.account_status || 'open',
        notes: entry.notes || '',
      });
    } else {
      form.reset({
        name: '',
        lender: '',
        type: 'credit_card',
        balance: 0,
        credit_limit: undefined,
        monthly_payment: undefined,
        account_status: 'open',
        notes: '',
      });
    }
  }, [entry, form, open]);

  const handleSubmit = (data: CreditReportFormData) => {
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{entry ? 'Edit' : 'Add'} Credit Entry</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Barclaycard Platinum" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lender</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Barclays" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CREDIT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credit_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="monthly_payment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Payment</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACCOUNT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              {entry ? 'Update' : 'Add'} Entry
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
