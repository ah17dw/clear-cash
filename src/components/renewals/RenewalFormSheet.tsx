import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, Sparkles, Loader2, FileText, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateRenewal, useUpdateRenewal, useExtractContract, useRenewalFiles, useAddRenewalFile, useDeleteRenewalFile, Renewal } from '@/hooks/useRenewals';
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
  const { data: existingFiles } = useRenewalFiles(renewal?.id ?? '');
  const addRenewalFile = useAddRenewalFile();
  const deleteRenewalFile = useDeleteRenewalFile();

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [isMonthlyPayment, setIsMonthlyPayment] = useState(true);
  const [agreementStart, setAgreementStart] = useState<Date | undefined>();
  const [agreementEnd, setAgreementEnd] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [personOrAddress, setPersonOrAddress] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<{ url: string; name: string; size: number }[]>([]);

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
      setPersonOrAddress(renewal.person_or_address || '');
      setPendingFiles([]);
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
    setPersonOrAddress('');
    setExtractedText('');
    setPendingFiles([]);
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
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('renewal-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('renewal-files')
          .getPublicUrl(filePath);

        // If editing existing renewal, add file directly to database
        if (renewal) {
          await addRenewalFile.mutateAsync({
            renewalId: renewal.id,
            fileUrl: urlData.publicUrl,
            fileName: file.name,
            fileSize: file.size,
          });
        } else {
          // If new renewal, store pending files
          setPendingFiles(prev => [...prev, {
            url: urlData.publicUrl,
            name: file.name,
            size: file.size,
          }]);
        }

        // Read file content for extraction (only for text files)
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const text = await file.text();
          setExtractedText(prev => prev + (prev ? '\n\n' : '') + text);
        }
      }

      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeletePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
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
        fileName: pendingFiles[0]?.name || existingFiles?.[0]?.file_name || undefined,
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
      person_or_address: personOrAddress.trim() || null,
      file_url: null,
      file_name: null,
      added_to_expenses: renewal?.added_to_expenses ?? false,
      linked_expense_id: renewal?.linked_expense_id ?? null,
    };

    try {
      if (renewal) {
        await updateRenewal.mutateAsync({ id: renewal.id, ...data });
      } else {
        const newRenewal = await createRenewal.mutateAsync(data);
        // Add pending files to the new renewal
        for (const pf of pendingFiles) {
          await addRenewalFile.mutateAsync({
            renewalId: newRenewal.id,
            fileUrl: pf.url,
            fileName: pf.name,
            fileSize: pf.size,
          });
        }
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const allFiles = [
    ...(existingFiles || []).map(f => ({ id: f.id, name: f.file_name, url: f.file_url, isExisting: true })),
    ...pendingFiles.map((f, i) => ({ id: `pending-${i}`, name: f.name, url: f.url, isExisting: false })),
  ];

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
                multiple
              />
              {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
            
            {/* Files list */}
            {allFiles.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Relevant Files ({allFiles.length})</p>
                {allFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 rounded bg-background border text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => {
                          if (file.isExisting && renewal) {
                            deleteRenewalFile.mutate({ id: file.id, renewalId: renewal.id });
                          } else {
                            handleDeletePendingFile(parseInt(file.id.replace('pending-', '')));
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
              <Label>Person / Address</Label>
              <Input
                value={personOrAddress}
                onChange={(e) => setPersonOrAddress(e.target.value)}
                placeholder="e.g. Dad, Nan, 123 Main St..."
              />
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
