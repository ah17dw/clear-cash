import { Link, useLocation } from 'react-router-dom';
import { Home, CreditCard, PiggyBank, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/debts', icon: CreditCard, label: 'Debts' },
  { to: '/savings', icon: PiggyBank, label: 'Savings' },
  { to: '/cashflow', icon: ArrowLeftRight, label: 'Cashflow' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-nav border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || 
            (to !== '/' && location.pathname.startsWith(to));
          
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 tap-target transition-colors",
                isActive 
                  ? "text-nav-active" 
                  : "text-nav-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
