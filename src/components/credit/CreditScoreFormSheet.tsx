import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditScoreFormData } from '@/hooks/useCreditReport';
import { format } from 'date-fns';

const SCORE_BANDS = [
  { value: 'excellent', label: 'Excellent (881-999)', min: 881 },
  { value: 'good', label: 'Good (721-880)', min: 721 },
  { value: 'fair', label: 'Fair (561-720)', min: 561 },
  { value: 'poor', label: 'Poor (0-560)', min: 0 },
];

const SOURCES = [
  { value: 'experian', label: 'Experian' },
  { value: 'equifax', label: 'Equifax' },
  { value: 'transunion', label: 'TransUnion' },
  { value: 'clearscore', label: 'ClearScore' },
  { value: 'credit_karma', label: 'Credit Karma' },
];

const schema = z.object({
  score: z.coerce.number().min(0, 'Score must be 0 or more').max(999, 'Score must be 999 or less'),
  score_band: z.string().optional(),
  source: z.string().optional(),
  recorded_at: z.string().optional(),
  notes: z.string().optional(),
});

interface CreditScoreFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreditScoreFormData) => void;
}

export function CreditScoreFormSheet({ open, onOpenChange, onSubmit }: CreditScoreFormSheetProps) {
  const form = useForm<CreditScoreFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      score: 0,
      score_band: '',
      source: 'experian',
      recorded_at: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  const getScoreBand = (score: number): string => {
    for (const band of SCORE_BANDS) {
      if (score >= band.min) return band.value;
    }
    return 'poor';
  };

  const handleSubmit = (data: CreditScoreFormData) => {
    const scoreBand = data.score_band || getScoreBand(data.score);
    onSubmit({
      ...data,
      score_band: scoreBand,
    });
    form.reset({
      score: 0,
      score_band: '',
      source: 'experian',
      recorded_at: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record Credit Score</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Score</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={999} placeholder="e.g. 742" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
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
              name="recorded_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Checked</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Any notes about this score..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Record Score
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
