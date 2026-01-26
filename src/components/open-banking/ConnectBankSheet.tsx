import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePlaidLink } from "react-plaid-link";
import { useCreateLinkToken, useExchangeToken } from "@/hooks/useOpenBanking";
import { Building2, Loader2, Link2 } from "lucide-react";

interface ConnectBankSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectBankSheet({ open, onOpenChange }: ConnectBankSheetProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const createLinkToken = useCreateLinkToken();
  const exchangeToken = useExchangeToken();

  const onSuccess = useCallback(async (publicToken: string, metadata: any) => {
    try {
      await exchangeToken.mutateAsync({
        publicToken,
        institutionId: metadata.institution?.institution_id,
        institutionName: metadata.institution?.name,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to exchange token:", error);
    }
  }, [exchangeToken, onOpenChange]);

  const onExit = useCallback(() => {
    setLinkToken(null);
  }, []);

  const { open: openPlaid, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  const handleStartConnect = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/open-banking-callback`;
      const result = await createLinkToken.mutateAsync({ redirectUri });
      if (result.linkToken) {
        setLinkToken(result.linkToken);
      }
    } catch (error) {
      console.error("Failed to create link token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Plaid Link when ready and token is available
  const handleOpenPlaid = () => {
    if (ready && linkToken) {
      openPlaid();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connect Bank Account
          </SheetTitle>
          <SheetDescription>
            Securely connect your bank to automatically sync balances and transactions.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Secure Connection</p>
                <p className="text-sm text-muted-foreground">
                  We use Plaid to securely connect to your bank. Your login credentials are never shared with us.
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
                Link to existing savings & debts
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            {!linkToken ? (
              <Button 
                onClick={handleStartConnect} 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Connect Your Bank
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleOpenPlaid} 
                className="w-full"
                disabled={!ready || exchangeToken.isPending}
              >
                {exchangeToken.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : !ready ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Open Bank Selector
                  </>
                )}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Powered by Plaid. Your data is encrypted and secure.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
