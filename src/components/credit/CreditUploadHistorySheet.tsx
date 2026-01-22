import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreditReportUploads, CreditReportUpload } from '@/hooks/useCreditReportUploads';
import { format } from 'date-fns';
import { FileText, Trash2, AlertTriangle, Check, Clock } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useState } from 'react';

interface CreditUploadHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditUploadHistorySheet({ open, onOpenChange }: CreditUploadHistorySheetProps) {
  const { uploads, isLoading, deleteUpload } = useCreditReportUploads();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteUpload.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Upload History</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100%-60px)] mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !uploads?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No uploads yet</p>
                <p className="text-xs">Upload a credit report to get started</p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {uploads.map((upload) => (
                  <UploadCard 
                    key={upload.id} 
                    upload={upload} 
                    onDelete={() => setDeleteId(upload.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Upload History"
        description="This will remove this upload from your history. Your debt data will not be affected."
      />
    </>
  );
}

function UploadCard({ upload, onDelete }: { upload: CreditReportUpload; onDelete: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <p className="font-medium truncate">
              {upload.file_names.length > 1 
                ? `${upload.file_names.length} files uploaded`
                : upload.file_names[0]
              }
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(upload.uploaded_at), 'dd MMM yyyy, HH:mm')}
          </p>
          
          {upload.file_names.length > 1 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {upload.file_names.map((name, idx) => (
                <p key={idx} className="truncate">• {name}</p>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-xs">
              <Check className="h-3 w-3 text-savings" />
              <span>{upload.entries_found} found</span>
            </div>
            {upload.discrepancies_found > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span>{upload.discrepancies_found} discrepancies</span>
              </div>
            )}
            {upload.updates_applied > 0 && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <span>{upload.updates_applied} updated</span>
              </div>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
