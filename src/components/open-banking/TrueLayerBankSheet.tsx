import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCreateTrueLayerAuthLink } from "@/hooks/useTrueLayer";
import { Building2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface TrueLayerBankSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrueLayerBankSheet({ open, onOpenChange }: TrueLayerBankSheetProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  
  const createAuthLink = useCreateTrueLayerAuthLink();

  const queryClient = useQueryClient();

  // Listen for success message from callback page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "truelayer-success") {
        // Refresh the data
        queryClient.invalidateQueries({ queryKey: ["connected-bank-accounts"] });
        queryClient.invalidateQueries({ queryKey: ["synced-bank-accounts"] });
        setIsConnecting(false);
        onOpenChange(false);
      }

      if (event.data?.type === "truelayer-error") {
        setIsConnecting(false);
        toast.error(event.data?.message || "Bank connection failed");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onOpenChange, queryClient]);

  const handleConnectBank = async () => {
    setIsConnecting(true);
    
    try {
      const redirectUri = "https://ahfinance.lovable.app/truelayer/callback";
      const result = await createAuthLink.mutateAsync({ 
        redirectUri,
        providerId: "uk-ob-all", // Connect to all UK banks
      });

      if (result?.authUrl) {
        // Open TrueLayer auth in a popup
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          result.authUrl,
          "TrueLayer Bank Connection",
          `width=${width},height=${height},left=${left},top=${top},popup=1`
        );

        // Poll for popup close
        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            setIsConnecting(false);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Failed to create auth link:", error);
      setIsConnecting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connect via TrueLayer
          </SheetTitle>
          <SheetDescription>
            TrueLayer provides secure access to UK bank accounts via Open Banking.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Secure Bank Connection</p>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to your bank to authorize access. Your credentials are never shared with us.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">What you'll get:</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Real-time account balances
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Transaction history (up to 2 years)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Automatic categorization
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Standing orders & direct debits
              </li>
            </ul>
          </div>

          <Button
            onClick={handleConnectBank}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Your Bank
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Powered by TrueLayer. Your data is encrypted and secure.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
