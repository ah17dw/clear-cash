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
  { name: 'Monzo', url: 'https://monzo.com/app' },
  { name: 'Starling', url: 'https://www.starlingbank.com/app/' },
  { name: 'Revolut', url: 'https://www.revolut.com/app/' },
  { name: 'Barclays', url: 'https://www.barclays.co.uk/ways-to-bank/mobile-banking-app/' },
  { name: 'Lloyds', url: 'https://www.lloydsbank.com/mobile-banking.html' },
  { name: 'HSBC', url: 'https://www.hsbc.co.uk/ways-to-bank/mobile-apps/' },
  { name: 'NatWest', url: 'https://www.natwest.com/banking-with-natwest/our-mobile-app.html' },
  { name: 'Nationwide', url: 'https://www.nationwide.co.uk/ways-to-bank/app/' },
  { name: 'Santander', url: 'https://www.santander.co.uk/personal/ways-to-bank/mobile-banking' },
  { name: 'Halifax', url: 'https://www.halifax.co.uk/ways-to-bank/mobile-app.html' },
];

export function UserMenu() {
  const { user, signOut } = useAuth();

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
          <DropdownMenuItem key={app.name} asChild>
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between cursor-pointer"
            >
              {app.name}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
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
