import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTrueLayerAuthLink, useCompleteTrueLayerAuth } from "@/hooks/useTrueLayer";
import { Building2, Loader2, Search, ExternalLink } from "lucide-react";

interface TrueLayerBankSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrueLayerBankSheet({ open, onOpenChange }: TrueLayerBankSheetProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  
  const createAuthLink = useCreateTrueLayerAuthLink();
  const completeAuth = useCompleteTrueLayerAuth();

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "truelayer-callback") {
        const { code, error } = event.data;
        
        if (error) {
          console.error("TrueLayer auth error:", error);
          setIsConnecting(false);
          return;
        }
        
        if (code) {
          try {
            const redirectUri = "https://ahfinance.lovable.app/truelayer/callback";
            await completeAuth.mutateAsync({
              code,
              redirectUri,
              providerName: "TrueLayer Bank",
            });
            onOpenChange(false);
          } catch (err) {
            console.error("Failed to complete auth:", err);
          } finally {
            setIsConnecting(false);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [completeAuth, onOpenChange]);

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
            disabled={isConnecting || completeAuth.isPending}
            className="w-full"
          >
            {isConnecting || completeAuth.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {completeAuth.isPending ? "Completing..." : "Connecting..."}
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
