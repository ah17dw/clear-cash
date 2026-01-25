import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SyncedBankAccount, useLinkAccountToSavings, useLinkAccountToDebt } from "@/hooks/useOpenBanking";
import { useSavingsAccounts, useDebts } from "@/hooks/useFinanceData";
import { Link, Unlink } from "lucide-react";

interface AccountLinkSheetProps {
  account: SyncedBankAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountLinkSheet({ account, open, onOpenChange }: AccountLinkSheetProps) {
  const { data: savingsAccounts } = useSavingsAccounts();
  const { data: debts } = useDebts();
  const linkToSavings = useLinkAccountToSavings();
  const linkToDebt = useLinkAccountToDebt();

  if (!account) return null;

  const handleLinkToSavings = async (savingsId: string | null) => {
    await linkToSavings.mutateAsync({ 
      syncedAccountId: account.id, 
      savingsId 
    });
    // Clear debt link if linking to savings
    if (savingsId && account.linked_debt_id) {
      await linkToDebt.mutateAsync({ syncedAccountId: account.id, debtId: null });
    }
  };

  const handleLinkToDebt = async (debtId: string | null) => {
    await linkToDebt.mutateAsync({ 
      syncedAccountId: account.id, 
      debtId 
    });
    // Clear savings link if linking to debt
    if (debtId && account.linked_savings_id) {
      await linkToSavings.mutateAsync({ syncedAccountId: account.id, savingsId: null });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Link Account
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium">{account.account_name}</p>
            <p className="text-sm text-muted-foreground">{account.account_type}</p>
            <p className="text-lg font-semibold mt-2">
              £{account.balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Link this bank account to a savings account or debt to automatically sync the balance when you refresh.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link to Savings Account</Label>
              <Select
                value={account.linked_savings_id || "none"}
                onValueChange={(value) => handleLinkToSavings(value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select savings account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <Unlink className="h-4 w-4" />
                      Not linked
                    </span>
                  </SelectItem>
                  {savingsAccounts?.map((savings) => (
                    <SelectItem key={savings.id} value={savings.id}>
                      {savings.name} - £{savings.balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link to Debt</Label>
              <Select
                value={account.linked_debt_id || "none"}
                onValueChange={(value) => handleLinkToDebt(value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select debt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <Unlink className="h-4 w-4" />
                      Not linked
                    </span>
                  </SelectItem>
                  {debts?.map((debt) => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name} - £{debt.balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
