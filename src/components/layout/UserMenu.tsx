import { User, LogOut, ExternalLink, Settings, ListTodo } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const UK_BANKING_APPS = [
  {
    name: 'Monzo',
    iosUrl: 'https://apps.apple.com/gb/app/monzo/id1052238659',
    androidUrl: 'https://play.google.com/store/apps/details?id=co.uk.getmondo',
    webUrl: 'https://monzo.com/app',
  },
  {
    name: 'Starling',
    iosUrl: 'https://apps.apple.com/gb/app/starling-bank-mobile-banking/id956806430',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.starlingbank.starling',
    webUrl: 'https://www.starlingbank.com/app/',
  },
  {
    name: 'Revolut',
    iosUrl: 'https://apps.apple.com/gb/app/revolut/id932493382',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.revolut.revolut',
    webUrl: 'https://www.revolut.com/app/',
  },
  {
    name: 'Barclays',
    iosUrl: 'https://apps.apple.com/gb/app/barclays/id536248734',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.barclays.android.barclaysmobilebanking',
    webUrl: 'https://www.barclays.co.uk/ways-to-bank/mobile-banking-app/',
  },
  {
    name: 'Lloyds',
    iosUrl: 'https://apps.apple.com/gb/app/lloyds-bank-mobile-banking/id429941104',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.grppl.android.shell.BOS',
    webUrl: 'https://www.lloydsbank.com/mobile-banking.html',
  },
  {
    name: 'HSBC',
    iosUrl: 'https://apps.apple.com/gb/app/hsbc-uk-mobile-banking/id1438721676',
    androidUrl: 'https://play.google.com/store/apps/details?id=uk.co.hsbc.hsbcukmobilebanking',
    webUrl: 'https://www.hsbc.co.uk/ways-to-bank/mobile-apps/',
  },
  {
    name: 'NatWest',
    iosUrl: 'https://apps.apple.com/gb/app/natwest-mobile-banking/id334855017',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.rbs.mobile.android.natwest',
    webUrl: 'https://www.natwest.com/banking-with-natwest/our-mobile-app.html',
  },
  {
    name: 'Nationwide',
    iosUrl: 'https://apps.apple.com/gb/app/nationwide-mobile-banking/id335342231',
    androidUrl: 'https://play.google.com/store/apps/details?id=uk.co.nationwide.mobile',
    webUrl: 'https://www.nationwide.co.uk/ways-to-bank/app/',
  },
  {
    name: 'Santander',
    iosUrl: 'https://apps.apple.com/gb/app/santander-mobile-banking/id454823253',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.santander.santanderUK',
    webUrl: 'https://www.santander.co.uk/personal/ways-to-bank/mobile-banking',
  },
  {
    name: 'Halifax',
    iosUrl: 'https://apps.apple.com/gb/app/halifax-mobile-banking/id431715726',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.grppl.android.shell.halifax',
    webUrl: 'https://www.halifax.co.uk/ways-to-bank/mobile-app.html',
  },
] as const;

export function UserMenu() {
  const { user, signOut } = useAuth();

  const openBankApp = (app: (typeof UK_BANKING_APPS)[number]) => {
    const ua = navigator.userAgent ?? '';
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    const url = isIOS ? app.iosUrl : isAndroid ? app.androidUrl : app.webUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">Account</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/todo" className="cursor-pointer">
            <ListTodo className="h-4 w-4 mr-2" />
            To Do
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Banking Apps
        </DropdownMenuLabel>
        {UK_BANKING_APPS.map((app) => (
          <DropdownMenuItem
            key={app.name}
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              openBankApp(app);
            }}
          >
            {app.name}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-debt cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
