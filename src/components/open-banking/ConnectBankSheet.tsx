import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstitutions, useCreateAuthorization, useExchangeConsent, Institution } from "@/hooks/useOpenBanking";
import { Building2, Search, ExternalLink, Loader2 } from "lucide-react";

interface ConnectBankSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectBankSheet({ open, onOpenChange }: ConnectBankSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [pendingConsent, setPendingConsent] = useState<{ institutionId: string; institutionName: string } | null>(null);
  
  const { data: institutions, isLoading } = useInstitutions();
  const createAuth = useCreateAuthorization();
  const exchangeConsent = useExchangeConsent();

  const filteredInstitutions = institutions?.filter(inst => 
    inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "open-banking-callback" && event.data?.consent) {
        if (pendingConsent) {
          await exchangeConsent.mutateAsync({
            consentToken: event.data.consent,
            institutionId: pendingConsent.institutionId,
            institutionName: pendingConsent.institutionName,
          });
          setPendingConsent(null);
          setSelectedInstitution(null);
          onOpenChange(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pendingConsent, exchangeConsent, onOpenChange]);

  const handleConnect = async (institution: Institution) => {
    setSelectedInstitution(institution);
    setPendingConsent({ institutionId: institution.id, institutionName: institution.name });
    
    try {
      const callbackUrl = `${window.location.origin}/open-banking-callback`;
      const result = await createAuth.mutateAsync({ 
        institutionId: institution.id, 
        callbackUrl 
      });
      
      if (result.authorisationUrl) {
        // Open bank's authorization page in a popup
        const popup = window.open(
          result.authorisationUrl, 
          "open-banking-auth",
          "width=600,height=700,scrollbars=yes"
        );
        
        // Poll for popup close
        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            setSelectedInstitution(null);
          }
        }, 500);
      }
    } catch (error) {
      setSelectedInstitution(null);
      setPendingConsent(null);
    }
  };

  const getInstitutionLogo = (institution: Institution) => {
    const iconMedia = institution.media?.find(m => m.type === "icon");
    return iconMedia?.source;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connect Bank Account
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search banks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[60vh]">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInstitutions?.map((institution) => {
                  const logo = getInstitutionLogo(institution);
                  const isConnecting = selectedInstitution?.id === institution.id;
                  
                  return (
                    <button
                      key={institution.id}
                      onClick={() => handleConnect(institution)}
                      disabled={isConnecting || createAuth.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
                    >
                      {logo ? (
                        <img 
                          src={logo} 
                          alt={institution.name}
                          className="h-10 w-10 rounded-lg object-contain bg-background border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{institution.name}</p>
                        {institution.fullName && institution.fullName !== institution.name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {institution.fullName}
                          </p>
                        )}
                      </div>
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}

                {filteredInstitutions?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No banks found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <p className="text-xs text-muted-foreground text-center">
            Powered by Open Banking. Your data is encrypted and secure.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
