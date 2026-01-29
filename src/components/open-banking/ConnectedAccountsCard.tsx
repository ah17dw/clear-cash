import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useConnectedBankAccounts, 
  useSyncedBankAccounts, 
  useSyncAccounts,
  useDisconnectBank,
  SyncedBankAccount,
  ConnectedBankAccount 
} from "@/hooks/useOpenBanking";
import { useSyncNordigenAccounts, useDisconnectNordigenBank } from "@/hooks/useNordigen";
import { ConnectBankSheet } from "./ConnectBankSheet";
import { AccountLinkSheet } from "./AccountLinkSheet";
import { TransactionsSheet } from "./TransactionsSheet";
import { 
  Building2, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Link, 
  ChevronRight,
  Clock,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AmountDisplay } from "@/components/ui/amount-display";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

export function ConnectedAccountsCard() {
  const [showConnectSheet, setShowConnectSheet] = useState(false);
  const [linkingAccount, setLinkingAccount] = useState<SyncedBankAccount | null>(null);
  const [viewingTransactions, setViewingTransactions] = useState<SyncedBankAccount | null>(null);
  const [disconnectingConnection, setDisconnectingConnection] = useState<ConnectedBankAccount | null>(null);
  
  const { data: connections, isLoading: connectionsLoading } = useConnectedBankAccounts();
  const { data: accounts, isLoading: accountsLoading } = useSyncedBankAccounts();
  const syncPlaidAccounts = useSyncAccounts();
  const syncNordigenAccounts = useSyncNordigenAccounts();
  const disconnectPlaidBank = useDisconnectBank();
  const disconnectNordigenBank = useDisconnectNordigenBank();

  const isLoading = connectionsLoading || accountsLoading;
  const isSyncing = syncPlaidAccounts.isPending || syncNordigenAccounts.isPending;

  const getStatusBadge = (status: string, expiresAt: string | null) => {
    if (status === "expired") {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-primary text-primary-foreground">Active</Badge>;
  };

  const handleSync = async (connection: ConnectedBankAccount) => {
    if (connection.provider === "nordigen") {
      await syncNordigenAccounts.mutateAsync(connection.id);
    } else {
      await syncPlaidAccounts.mutateAsync(connection.id);
    }
  };

  const handleDisconnect = async () => {
    if (disconnectingConnection) {
      if (disconnectingConnection.provider === "nordigen") {
        await disconnectNordigenBank.mutateAsync(disconnectingConnection.id);
      } else {
        await disconnectPlaidBank.mutateAsync(disconnectingConnection.id);
      }
      setDisconnectingConnection(null);
    }
  };

  const getProviderBadge = (provider: string) => {
    if (provider === "nordigen") {
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <Sparkles className="h-3 w-3" />
          Free
        </Badge>
      );
    }
    return null;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connected Banks
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowConnectSheet(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Connect
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : connections?.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                Connect your bank accounts to automatically sync balances and transactions
              </p>
              <Button onClick={() => setShowConnectSheet(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect Bank
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {connections?.map((connection) => {
                const connectionAccounts = accounts?.filter(a => a.connection_id === connection.id) || [];
                
                return (
                  <div key={connection.id} className="space-y-3">
                    {/* Connection Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{connection.institution_name}</h4>
                        {getStatusBadge(connection.status, connection.consent_expires_at)}
                        {getProviderBadge(connection.provider)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSync(connection)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDisconnectingConnection(connection)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Last Synced */}
                    {connection.last_synced_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Synced {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}
                      </p>
                    )}

                    {/* Accounts */}
                    <div className="space-y-2">
                      {connectionAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => setViewingTransactions(account)}
                        >
                          <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{account.account_name}</p>
                              {(account.linked_savings_id || account.linked_debt_id) && (
                                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {account.account_type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <AmountDisplay 
                              amount={account.balance} 
                              className="font-semibold"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkingAccount(account);
                              }}
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConnectBankSheet 
        open={showConnectSheet} 
        onOpenChange={setShowConnectSheet} 
      />

      <AccountLinkSheet
        account={linkingAccount}
        open={!!linkingAccount}
        onOpenChange={(open) => !open && setLinkingAccount(null)}
      />

      <TransactionsSheet
        account={viewingTransactions}
        open={!!viewingTransactions}
        onOpenChange={(open) => !open && setViewingTransactions(null)}
      />

      <DeleteConfirmDialog
        open={!!disconnectingConnection}
        onOpenChange={(open) => !open && setDisconnectingConnection(null)}
        onConfirm={handleDisconnect}
        title="Disconnect Bank"
        description="This will remove the connection and all synced data. You can reconnect at any time."
      />
    </>
  );
}
