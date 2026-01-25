import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SyncedBankAccount, useSyncedTransactions, useSyncedStandingOrders } from "@/hooks/useOpenBanking";
import { Receipt, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format, parseISO } from "date-fns";

interface TransactionsSheetProps {
  account: SyncedBankAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionsSheet({ account, open, onOpenChange }: TransactionsSheetProps) {
  const { data: transactions, isLoading: txLoading } = useSyncedTransactions(account?.id);
  const { data: standingOrders, isLoading: soLoading } = useSyncedStandingOrders(account?.id);

  if (!account) return null;

  const formatAmount = (amount: number) => {
    const isNegative = amount < 0;
    return (
      <span className={isNegative ? "text-destructive" : "text-primary"}>
        {isNegative ? "-" : "+"}£{Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
      </span>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {account.account_name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">
                £{account.balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Badge variant="outline">{account.account_type}</Badge>
          </div>

          <Tabs defaultValue="transactions">
            <TabsList className="w-full">
              <TabsTrigger value="transactions" className="flex-1">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="standing-orders" className="flex-1">
                Standing Orders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <ScrollArea className="h-[60vh]">
                {txLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : transactions?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions?.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${tx.amount < 0 ? "bg-destructive/10" : "bg-primary/10"}`}>
                          {tx.amount < 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {tx.merchant_name || tx.description || "Transaction"}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{format(parseISO(tx.transaction_date), "d MMM yyyy")}</span>
                            {tx.category && (
                              <>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs">
                                  {tx.category}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {formatAmount(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="standing-orders" className="mt-4">
              <ScrollArea className="h-[60vh]">
                {soLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : standingOrders?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No standing orders found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {standingOrders?.map((so) => (
                      <div
                        key={so.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-2 rounded-full bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {so.payee_name || so.reference || "Standing Order"}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {so.frequency && <span>{so.frequency}</span>}
                            {so.next_payment_date && (
                              <>
                                <span>•</span>
                                <span>Next: {format(parseISO(so.next_payment_date), "d MMM")}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right font-semibold">
                          £{so.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
