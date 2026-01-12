import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, CheckSquare, ChevronUp, CreditCard, PiggyBank, ArrowLeftRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const financeSubItems = [
  { to: '/debts', icon: CreditCard, label: 'Debts' },
  { to: '/savings', icon: PiggyBank, label: 'Savings' },
  { to: '/cashflow', icon: ArrowLeftRight, label: 'Cashflow' },
  { to: '/renewals', icon: FileText, label: 'Renewals' },
];

export function BottomNav() {
  const location = useLocation();
  const [financeOpen, setFinanceOpen] = useState(false);
  
  const isFinanceActive = ['/debts', '/savings', '/cashflow', '/renewals'].some(
    path => location.pathname === path || location.pathname.startsWith(path + '/')
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-nav border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {/* Home */}
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 tap-target transition-colors",
            location.pathname === '/' 
              ? "text-nav-active" 
              : "text-nav-foreground hover:text-foreground"
          )}
        >
          <Home className="h-5 w-5" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Finances dropdown */}
        <Popover open={financeOpen} onOpenChange={setFinanceOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 tap-target transition-colors",
                isFinanceActive 
                  ? "text-nav-active" 
                  : "text-nav-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Wallet className="h-5 w-5" strokeWidth={isFinanceActive ? 2.5 : 2} />
                <ChevronUp className="h-2.5 w-2.5 absolute -top-1 -right-1.5" />
              </div>
              <span className="text-[10px] font-medium">Finances</span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="center"
            className="w-auto p-2 mb-2"
            sideOffset={8}
          >
            <div className="flex flex-col gap-1">
              {financeSubItems.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setFinanceOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* To Do */}
        <Link
          to="/todo"
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 tap-target transition-colors",
            location.pathname === '/todo' || location.pathname.startsWith('/todo/')
              ? "text-nav-active" 
              : "text-nav-foreground hover:text-foreground"
          )}
        >
          <CheckSquare className="h-5 w-5" strokeWidth={location.pathname.startsWith('/todo') ? 2.5 : 2} />
          <span className="text-[10px] font-medium">To Do</span>
        </Link>
      </div>
    </nav>
  );
}
