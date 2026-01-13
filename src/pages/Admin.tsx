import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Key, 
  Trash2, 
  History,
  Loader2,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useIsAdmin, 
  useAdminUsers, 
  useDeleteUser, 
  useUpdatePassword,
  useInviteUser,
  useSetUserRole,
  useAuditLogs,
  AdminUser 
} from '@/hooks/useAdmin';

export default function Admin() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const { data: users, isLoading: loadingUsers } = useAdminUsers();
  const { data: auditLogs, isLoading: loadingLogs } = useAuditLogs();
  const deleteUser = useDeleteUser();
  const updatePassword = useUpdatePassword();
  const inviteUser = useInviteUser();
  const setUserRole = useSetUserRole();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  if (checkingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handlePasswordChange = async () => {
    if (!selectedUser || !newPassword) return;
    await updatePassword.mutateAsync({ userId: selectedUser.id, password: newPassword });
    setPasswordSheetOpen(false);
    setNewPassword('');
    setSelectedUser(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    await inviteUser.mutateAsync(inviteEmail);
    setInviteSheetOpen(false);
    setInviteEmail('');
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    await deleteUser.mutateAsync(selectedUser.id);
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await setUserRole.mutateAsync({ userId, role });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Admin Portal" />

      <div className="p-4 space-y-4">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Manage Users</h2>
              <Button onClick={() => setInviteSheetOpen(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {users?.map((user) => (
                  <Card key={user.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{user.email}</p>
                            {user.display_name && (
                              <p className="text-sm text-muted-foreground">{user.display_name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {user.roles.includes('admin') ? (
                                <Badge variant="default" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Admin
                                </Badge>
                              ) : user.roles.length > 0 ? (
                                <Badge variant="secondary" className="text-xs">
                                  {user.roles[0]}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">User</Badge>
                              )}
                              {user.email_confirmed_at ? (
                                <Badge variant="outline" className="text-xs text-green-600">Verified</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-amber-600">Pending</Badge>
                              )}
                            </div>
                          </div>
                          <Select 
                            value={user.roles[0] || 'user'} 
                            onValueChange={(role) => handleRoleChange(user.id, role)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <p>Joined: {format(new Date(user.created_at), 'dd MMM yyyy')}</p>
                          {user.last_sign_in_at && (
                            <p>Last login: {format(new Date(user.last_sign_in_at), 'dd MMM yyyy HH:mm')}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setPasswordSheetOpen(true);
                            }}
                          >
                            <Key className="h-3 w-3 mr-1" />
                            Password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">User Activity</h2>

            {loadingLogs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : auditLogs?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No activity recorded yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {auditLogs?.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {log.action} {log.entity_type}
                          </p>
                          {log.entity_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {log.entity_name}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'dd/MM HH:mm')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Password Change Sheet */}
      <Sheet open={passwordSheetOpen} onOpenChange={setPasswordSheetOpen}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Change Password</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Set a new password for {selectedUser?.email}
            </p>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <Button 
              onClick={handlePasswordChange} 
              className="w-full"
              disabled={!newPassword || updatePassword.isPending}
            >
              {updatePassword.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Update Password
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invite User Sheet */}
      <Sheet open={inviteSheetOpen} onOpenChange={setInviteSheetOpen}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Invite New User</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Send an invitation email to a new user
            </p>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <Button 
              onClick={handleInvite} 
              className="w-full"
              disabled={!inviteEmail || inviteUser.isPending}
            >
              {inviteUser.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.email}? This action cannot be undone.`}
      />
    </div>
  );
}