import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SyncedBankAccount, useSyncedTransactions, useSyncedStandingOrders, SyncedTransaction } from "@/hooks/useOpenBanking";
import { 
  Receipt, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter,
  ArrowLeft,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface TransactionsSheetProps {
  account: SyncedBankAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterType = "all" | "credit" | "debit";

interface MerchantGroup {
  merchant: string;
  transactions: SyncedTransaction[];
  totalAmount: number;
  avgAmount: number;
  count: number;
}

export function TransactionsSheet({ account, open, onOpenChange }: TransactionsSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantGroup | null>(null);
  
  const { data: transactions, isLoading: txLoading } = useSyncedTransactions(account?.id);
  const { data: standingOrders, isLoading: soLoading } = useSyncedStandingOrders(account?.id);

  // Filter and calculate totals
  const { filteredTransactions, creditTotal, debitTotal, filteredTotal } = useMemo(() => {
    if (!transactions) return { filteredTransactions: [], creditTotal: 0, debitTotal: 0, filteredTotal: 0 };

    let filtered = transactions;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        (tx.merchant_name?.toLowerCase().includes(query)) ||
        (tx.description?.toLowerCase().includes(query)) ||
        (tx.category?.toLowerCase().includes(query))
      );
    }

    // Calculate totals before type filter
    const credit = filtered.filter(tx => tx.amount >= 0).reduce((sum, tx) => sum + tx.amount, 0);
    const debit = filtered.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Apply credit/debit filter
    if (filterType === "credit") {
      filtered = filtered.filter(tx => tx.amount >= 0);
    } else if (filterType === "debit") {
      filtered = filtered.filter(tx => tx.amount < 0);
    }

    const filteredSum = filtered.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      filteredTransactions: filtered,
      creditTotal: credit,
      debitTotal: debit,
      filteredTotal: filteredSum,
    };
  }, [transactions, searchQuery, filterType]);

  // Group transactions by merchant for drilldown
  const merchantGroups = useMemo(() => {
    if (!transactions) return [];

    const groups = new Map<string, SyncedTransaction[]>();
    
    transactions.forEach(tx => {
      const key = tx.merchant_name || tx.description || "Unknown";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    });

    return Array.from(groups.entries())
      .map(([merchant, txs]) => ({
        merchant,
        transactions: txs.sort((a, b) => 
          new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        ),
        totalAmount: txs.reduce((sum, tx) => sum + tx.amount, 0),
        avgAmount: txs.reduce((sum, tx) => sum + tx.amount, 0) / txs.length,
        count: txs.length,
      }))
      .filter(g => g.count > 1) // Only show merchants with multiple transactions
      .sort((a, b) => b.count - a.count);
  }, [transactions]);

  if (!account) return null;

  const formatAmount = (amount: number) => {
    const isNegative = amount < 0;
    return (
      <span className={isNegative ? "text-destructive" : "text-primary"}>
        {isNegative ? "-" : "+"}£{Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
      </span>
    );
  };

  const handleTransactionClick = (tx: SyncedTransaction) => {
    const merchantName = tx.merchant_name || tx.description || "Unknown";
    const group = merchantGroups.find(g => g.merchant === merchantName);
    if (group && group.count > 1) {
      setSelectedMerchant(group);
    }
  };

  // Merchant drilldown view
  if (selectedMerchant) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setSelectedMerchant(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {selectedMerchant.merchant}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            {/* Merchant summary */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-muted/50 mb-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-lg font-bold">{selectedMerchant.count}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">
                  {formatAmount(selectedMerchant.totalAmount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-lg font-bold">
                  {formatAmount(selectedMerchant.avgAmount)}
                </p>
              </div>
            </div>

            {/* Transaction history */}
            <h4 className="font-medium text-sm mb-3">Transaction History</h4>
            <ScrollArea className="h-[55vh]">
              <div className="space-y-2">
                {selectedMerchant.transactions.map((tx) => (
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
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(tx.transaction_date), "d MMM yyyy")}
                      </p>
                      {tx.category && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {tx.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      {formatAmount(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

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
          {/* Balance header */}
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

            <TabsContent value="transactions" className="mt-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Credit/Debit filter with totals */}
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className="flex-1"
                >
                  All
                </Button>
                <Button
                  variant={filterType === "credit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("credit")}
                  className="flex-1 gap-1"
                >
                  <TrendingUp className="h-3 w-3" />
                  Credit
                </Button>
                <Button
                  variant={filterType === "debit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("debit")}
                  className="flex-1 gap-1"
                >
                  <TrendingDown className="h-3 w-3" />
                  Debit
                </Button>
              </div>

              {/* Summary totals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/10 text-center">
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="font-semibold text-primary">
                    +£{creditTotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 text-center">
                  <p className="text-xs text-muted-foreground">Spending</p>
                  <p className="font-semibold text-destructive">
                    -£{debitTotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Transaction list */}
              <ScrollArea className="h-[45vh]">
                {txLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions found</p>
                    {account.account_type === "SAVINGS" && (
                      <p className="text-xs mt-2">
                        Note: Savings accounts typically don't show individual transactions
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((tx) => {
                      const merchantName = tx.merchant_name || tx.description || "Transaction";
                      const hasGroup = merchantGroups.some(g => g.merchant === merchantName && g.count > 1);
                      
                      return (
                        <div
                          key={tx.id}
                          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${hasGroup ? "cursor-pointer" : ""}`}
                          onClick={() => handleTransactionClick(tx)}
                        >
                          <div className={`p-2 rounded-full ${tx.amount < 0 ? "bg-destructive/10" : "bg-primary/10"}`}>
                            {tx.amount < 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-destructive" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{merchantName}</p>
                              {hasGroup && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {merchantGroups.find(g => g.merchant === merchantName)?.count}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{format(parseISO(tx.transaction_date), "d MMM yyyy")}</span>
                              {tx.category && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
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
                      );
                    })}
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
                    <p className="text-xs mt-2">
                      Standing orders may not be available for all account types
                    </p>
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