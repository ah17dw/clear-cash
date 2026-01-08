import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, Sparkles, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateRenewal, useUpdateRenewal, useExtractContract, Renewal } from '@/hooks/useRenewals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface RenewalFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renewal?: Renewal;
}

export function RenewalFormSheet({ open, onOpenChange, renewal }: RenewalFormSheetProps) {
  const { user } = useAuth();
  const createRenewal = useCreateRenewal();
  const updateRenewal = useUpdateRenewal();
  const extractContract = useExtractContract();

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [isMonthlyPayment, setIsMonthlyPayment] = useState(true);
  const [agreementStart, setAgreementStart] = useState<Date | undefined>();
  const [agreementEnd, setAgreementEnd] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState('');

  useEffect(() => {
    if (renewal) {
      setName(renewal.name);
      setProvider(renewal.provider || '');
      setTotalCost(renewal.total_cost?.toString() || '');
      setMonthlyAmount(renewal.monthly_amount?.toString() || '');
      setIsMonthlyPayment(renewal.is_monthly_payment);
      setAgreementStart(renewal.agreement_start ? new Date(renewal.agreement_start) : undefined);
      setAgreementEnd(renewal.agreement_end ? new Date(renewal.agreement_end) : undefined);
      setNotes(renewal.notes || '');
      setFileUrl(renewal.file_url);
      setFileName(renewal.file_name);
    } else {
      resetForm();
    }
  }, [renewal, open]);

  const resetForm = () => {
    setName('');
    setProvider('');
    setTotalCost('');
    setMonthlyAmount('');
    setIsMonthlyPayment(true);
    setAgreementStart(undefined);
    setAgreementEnd(undefined);
    setNotes('');
    setFileUrl(null);
    setFileName(null);
    setExtractedText('');
  };

  // Auto-calculate monthly amount when total cost changes and not monthly payment
  useEffect(() => {
    if (!isMonthlyPayment && totalCost) {
      const total = parseFloat(totalCost);
      if (!isNaN(total)) {
        setMonthlyAmount((total / 12).toFixed(2));
      }
    }
  }, [totalCost, isMonthlyPayment]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('renewal-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('renewal-files')
        .getPublicUrl(filePath);

      setFileUrl(urlData.publicUrl);
      setFileName(file.name);

      // Read file content for extraction
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setExtractedText(text);
      } else {
        toast.info('For AI extraction, please also paste the document text below');
      }

      toast.success('File uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtract = async () => {
    if (!extractedText.trim()) {
      toast.error('Please paste or enter the document text first');
      return;
    }

    setIsExtracting(true);
    try {
      const result = await extractContract.mutateAsync({
        text: extractedText,
        fileName: fileName || undefined,
      });

      if (result) {
        if (result.name) setName(result.name);
        if (result.provider) setProvider(result.provider);
        if (result.total_cost) setTotalCost(result.total_cost.toString());
        if (result.monthly_amount) setMonthlyAmount(result.monthly_amount.toString());
        if (typeof result.is_monthly_payment === 'boolean') setIsMonthlyPayment(result.is_monthly_payment);
        if (result.agreement_start) setAgreementStart(new Date(result.agreement_start));
        if (result.agreement_end) setAgreementEnd(new Date(result.agreement_end));
        if (result.notes) setNotes(result.notes);
        
        toast.success('Contract information extracted!');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    const data = {
      name: name.trim(),
      provider: provider.trim() || null,
      total_cost: parseFloat(totalCost) || 0,
      monthly_amount: parseFloat(monthlyAmount) || 0,
      is_monthly_payment: isMonthlyPayment,
      agreement_start: agreementStart ? format(agreementStart, 'yyyy-MM-dd') : null,
      agreement_end: agreementEnd ? format(agreementEnd, 'yyyy-MM-dd') : null,
      notes: notes.trim() || null,
      file_url: fileUrl,
      file_name: fileName,
      added_to_expenses: renewal?.added_to_expenses ?? false,
      linked_expense_id: renewal?.linked_expense_id ?? null,
    };

    if (renewal) {
      await updateRenewal.mutateAsync({ id: renewal.id, ...data });
    } else {
      await createRenewal.mutateAsync(data);
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{renewal ? 'Edit Renewal' : 'Add Renewal'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* AI Extraction Section */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Contract Extraction
            </div>

            <div className="flex gap-2">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="flex-1"
                disabled={isUploading}
              />
              {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
            
            {fileName && (
              <p className="text-xs text-muted-foreground">Uploaded: {fileName}</p>
            )}

            <Textarea
              placeholder="Paste contract/invoice text here for AI extraction..."
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              rows={4}
            />

            <Button
              type="button"
              variant="secondary"
              onClick={handleExtract}
              disabled={isExtracting || !extractedText.trim()}
              className="w-full"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Information
                </>
              )}
            </Button>
          </div>

          {/* Manual Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Car Insurance"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="e.g. Aviva"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <Label>Monthly payments?</Label>
              <Switch
                checked={isMonthlyPayment}
                onCheckedChange={setIsMonthlyPayment}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isMonthlyPayment ? 'Annual Cost (£)' : 'Total Cost (£)'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="738.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Amount (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  placeholder="61.50"
                  readOnly={!isMonthlyPayment}
                  className={cn(!isMonthlyPayment && 'bg-muted')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agreement Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start', !agreementStart && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {agreementStart ? format(agreementStart, 'dd/MM/yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={agreementStart}
                      onSelect={setAgreementStart}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Agreement End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start', !agreementEnd && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {agreementEnd ? format(agreementEnd, 'dd/MM/yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={agreementEnd}
                      onSelect={setAgreementEnd}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Policy number, key terms, excess amounts..."
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createRenewal.isPending || updateRenewal.isPending}>
            {renewal ? 'Update Renewal' : 'Add Renewal'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
