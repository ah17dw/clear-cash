import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNordigenInstitutions, useCreateNordigenRequisition, useCompleteNordigenRequisition } from "@/hooks/useNordigen";
import { Building2, Search, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";

interface NordigenBankSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NordigenBankSearchSheet({ open, onOpenChange }: NordigenBankSearchSheetProps) {
  const [search, setSearch] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState<{ id: string; name: string } | null>(null);
  const [pendingRequisitionId, setPendingRequisitionId] = useState<string | null>(null);
  
  const { data: institutions, isLoading: loadingInstitutions } = useNordigenInstitutions("GB");
  const createRequisition = useCreateNordigenRequisition();
  const completeRequisition = useCompleteNordigenRequisition();
  
  const filteredInstitutions = useMemo(() => {
    if (!institutions) return [];
    if (!search.trim()) return institutions;
    
    const searchLower = search.toLowerCase();
    return institutions.filter(inst => 
      inst.name.toLowerCase().includes(searchLower)
    );
  }, [institutions, search]);

  // Listen for callback from bank redirect
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "nordigen-callback" && event.data?.ref && selectedInstitution) {
        // Complete the requisition
        try {
          await completeRequisition.mutateAsync({
            requisitionId: pendingRequisitionId!,
            institutionName: selectedInstitution.name,
          });
          onOpenChange(false);
          setSelectedInstitution(null);
          setPendingRequisitionId(null);
        } catch (error) {
          console.error("Failed to complete requisition:", error);
        }
      }
    };
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pendingRequisitionId, selectedInstitution, completeRequisition, onOpenChange]);

  const handleSelectBank = async (institutionId: string, institutionName: string) => {
    setSelectedInstitution({ id: institutionId, name: institutionName });
    
    try {
      const redirectUri = `${window.location.origin}/open-banking/callback?provider=nordigen`;
      const result = await createRequisition.mutateAsync({
        institutionId,
        redirectUri,
      });
      
      setPendingRequisitionId(result.requisitionId);
      
      // Open bank authorization in new window
      const authWindow = window.open(result.link, "_blank", "width=600,height=700");
      
      // Poll for window close and check requisition status
      const checkInterval = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(checkInterval);
          
          // Try to complete the requisition
          try {
            await completeRequisition.mutateAsync({
              requisitionId: result.requisitionId,
              institutionName,
            });
            onOpenChange(false);
            setSelectedInstitution(null);
            setPendingRequisitionId(null);
          } catch (error) {
            console.error("Failed to complete requisition:", error);
            setSelectedInstitution(null);
            setPendingRequisitionId(null);
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error("Failed to create requisition:", error);
      setSelectedInstitution(null);
    }
  };

  const isConnecting = createRequisition.isPending || completeRequisition.isPending || !!pendingRequisitionId;

  return (
    <Sheet open={open} onOpenChange={(value) => {
      if (!isConnecting) {
        onOpenChange(value);
        setSearch("");
        setSelectedInstitution(null);
        setPendingRequisitionId(null);
      }
    }}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connect via GoCardless
          </SheetTitle>
          <SheetDescription>
            Search for your bank to securely connect your accounts. This is a free service.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for your bank..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              disabled={isConnecting}
            />
          </div>

          {/* Connection Status */}
          {isConnecting && (
            <div className="bg-primary/10 rounded-lg p-4 flex items-center gap-3">
              {completeRequisition.isPending ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-primary animate-pulse" />
                  <div>
                    <p className="font-medium text-sm">Completing connection...</p>
                    <p className="text-xs text-muted-foreground">
                      Fetching your account details
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Connecting to {selectedInstitution?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Complete authorization in the bank window
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bank List */}
          <ScrollArea className="h-[400px] -mx-2 px-2">
            {loadingInstitutions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInstitutions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? "No banks found matching your search" : "No banks available"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInstitutions.map((institution) => (
                  <Button
                    key={institution.id}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => handleSelectBank(institution.id, institution.name)}
                    disabled={isConnecting}
                  >
                    {institution.logo ? (
                      <img 
                        src={institution.logo} 
                        alt={institution.name}
                        className="h-8 w-8 rounded object-contain bg-white"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-medium">{institution.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {institution.transactionTotalDays} days history
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>

          <p className="text-xs text-muted-foreground text-center">
            Powered by GoCardless (Nordigen). Your data is encrypted and secure.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
