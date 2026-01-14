import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Wallet, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Authorized email addresses - only these can access the app
const AUTHORIZED_EMAILS = ['alex@hayesalex.com'];

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (isAuthorizedEmail(session.user.email || '')) {
          navigate('/');
        } else {
          // Signed in but not authorized - sign them out
          await supabase.auth.signOut();
          toast.error('Access denied. Your email is not authorized.');
        }
      }
      setCheckingAuth(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (isAuthorizedEmail(session.user.email || '')) {
          navigate('/');
        } else {
          supabase.auth.signOut();
          toast.error('Access denied. Your email is not authorized.');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const isAuthorizedEmail = (email: string) => {
    return AUTHORIZED_EMAILS.includes(email.toLowerCase().trim());
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Finance Tracker
          </h1>
          <p className="text-muted-foreground mt-2">
            Private & Secure
          </p>
        </div>

        <div className="finance-card p-6 space-y-6">
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium">Authorized Access Only</p>
              <p className="text-xs text-muted-foreground">
                Sign in with your authorized Google account
              </p>
            </div>
          </div>

          <Button 
            onClick={handleGoogleSignIn} 
            className="w-full gap-3 h-12" 
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          This is a private application. Only authorized users can access.
        </p>
      </div>
    </div>
  );
}
