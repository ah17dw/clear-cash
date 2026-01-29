import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePlaidLink } from "react-plaid-link";
import { useCreateLinkToken, useExchangeToken } from "@/hooks/useOpenBanking";
import { Building2, Loader2, Link2, ArrowLeft, Sparkles } from "lucide-react";
import { NordigenBankSearchSheet } from "./NordigenBankSearchSheet";

interface ConnectBankSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProviderChoice = null | "plaid" | "nordigen";

export function ConnectBankSheet({ open, onOpenChange }: ConnectBankSheetProps) {
  const [providerChoice, setProviderChoice] = useState<ProviderChoice>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNordigenSheet, setShowNordigenSheet] = useState(false);
  
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
      setProviderChoice(null);
      setLinkToken(null);
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

  const handleStartPlaid = async () => {
    setIsLoading(true);
    try {
      const result = await createLinkToken.mutateAsync({});
      if (result.linkToken) {
        setLinkToken(result.linkToken);
      }
    } catch (error) {
      console.error("Failed to create link token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPlaid = () => {
    if (ready && linkToken) {
      openPlaid();
    }
  };

  const handleChoosePlaid = () => {
    setProviderChoice("plaid");
    handleStartPlaid();
  };

  const handleChooseNordigen = () => {
    setProviderChoice("nordigen");
    setShowNordigenSheet(true);
    onOpenChange(false);
  };

  const handleBack = () => {
    setProviderChoice(null);
    setLinkToken(null);
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setProviderChoice(null);
      setLinkToken(null);
    }
    onOpenChange(value);
  };

  // Provider selection view
  const renderProviderSelection = () => (
    <div className="mt-6 space-y-6">
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Choose Your Provider</p>
            <p className="text-sm text-muted-foreground">
              Select how you'd like to connect your bank account.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* GoCardless/Nordigen - Free option */}
        <Button
          variant="outline"
          className="w-full h-auto py-4 justify-start gap-4"
          onClick={handleChooseNordigen}
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">GoCardless (Free)</p>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Free UK bank connections via PSD2. Supports most UK banks.
            </p>
          </div>
        </Button>

        {/* Plaid option */}
        <Button
          variant="outline"
          className="w-full h-auto py-4 justify-start gap-4"
          onClick={handleChoosePlaid}
        >
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium">Plaid</p>
            <p className="text-xs text-muted-foreground">
              Premium bank connections. Additional UK banks.
            </p>
          </div>
        </Button>
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
    </div>
  );

  // Plaid connection view
  const renderPlaidConnection = () => (
    <div className="mt-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="gap-2 -ml-2"
        disabled={exchangeToken.isPending}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to provider selection
      </Button>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-secondary-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Connecting via Plaid</p>
            <p className="text-sm text-muted-foreground">
              Your login credentials are never shared with us.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {!linkToken ? (
          <Button 
            onClick={handleStartPlaid} 
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
  );

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
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

          {providerChoice === "plaid" ? renderPlaidConnection() : renderProviderSelection()}
        </SheetContent>
      </Sheet>

      <NordigenBankSearchSheet 
        open={showNordigenSheet} 
        onOpenChange={setShowNordigenSheet}
      />
    </>
  );
}
