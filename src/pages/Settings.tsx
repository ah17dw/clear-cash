import { useState, useEffect } from 'react';
import { Download, Phone, Camera, Bell, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useDebts, useSavingsAccounts, useIncomeSources, useExpenseItems } from '@/hooks/useFinanceData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  phone_number: string | null;
  avatar_url: string | null;
  email_notifications: boolean;
}

export default function Settings() {
  const { user } = useAuth();
  const { data: debts } = useDebts();
  const { data: savings } = useSavingsAccounts();
  const { data: income } = useIncomeSources();
  const { data: expenses } = useExpenseItems();
  
  const [profile, setProfile] = useState<Profile>({
    phone_number: null,
    avatar_url: null,
    email_notifications: true,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('phone_number, avatar_url, email_notifications')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      toast.error('Failed to load profile');
      return;
    }

    if (data) {
      setProfile(data);
      return;
    }

    // Existing users may not have a profile row yet
    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, email_notifications: true })
      .select('phone_number, avatar_url, email_notifications')
      .single();

    if (createError) {
      toast.error('Failed to create profile');
      return;
    }

    setProfile(created);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    setLoading(true);

    // Update first; if the row doesn't exist yet, create it.
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select('phone_number, avatar_url, email_notifications')
      .maybeSingle();

    if (error) {
      toast.error('Failed to update profile');
      setLoading(false);
      return;
    }

    if (data) {
      setProfile(data);
      toast.success('Profile updated');
      setLoading(false);
      return;
    }

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, ...updates })
      .select('phone_number, avatar_url, email_notifications')
      .single();

    if (createError) {
      toast.error('Failed to update profile');
    } else {
      setProfile(created);
      toast.success('Profile updated');
    }

    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload image');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await updateProfile({ avatar_url: publicUrl });
    setUploading(false);
  };

  const handleExport = () => {
    const data = {
      debts: debts ?? [],
      savings: savings ?? [],
      income: income ?? [],
      expenses: expenses ?? [],
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const getInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="page-container">
      <PageHeader title="Settings" />

      {/* Profile */}
      <div className="finance-card mb-4">
        <h3 className="font-medium mb-4">Profile</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-3 w-3" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="flex-1">
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Click camera to change photo</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 7XXX XXXXXX"
              value={profile.phone_number || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
              onBlur={() => updateProfile({ phone_number: profile.phone_number })}
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="finance-card mb-4">
        <h3 className="font-medium mb-3">Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Daily Email Digest</p>
                <p className="text-xs text-muted-foreground">Get updates on debt/income changes</p>
              </div>
            </div>
            <Switch
              checked={profile.email_notifications}
              onCheckedChange={(checked) => updateProfile({ email_notifications: checked })}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="finance-card mb-4">
        <h3 className="font-medium mb-3">Data</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Debts</p>
              <p className="font-medium">{debts?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Savings Accounts</p>
              <p className="font-medium">{savings?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Income Sources</p>
              <p className="font-medium">{income?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expenses</p>
              <p className="font-medium">{expenses?.length ?? 0}</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export Data (JSON)
          </Button>
        </div>
      </div>

      {/* Preferences */}
      <div className="finance-card">
        <h3 className="font-medium mb-3">Preferences</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium">GBP (£)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Date Format</span>
            <span className="font-medium">DD/MM/YYYY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
