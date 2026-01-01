import { ReactNode } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserMenu } from './UserMenu';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  rightContent?: ReactNode;
  showUserMenu?: boolean;
}

export function PageHeader({ 
  title, 
  showBack, 
  onAdd, 
  addLabel = 'Add',
  rightContent,
  showUserMenu = true
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        {onAdd && (
          <Button onClick={onAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
        
        {rightContent}
        
        {showUserMenu && <UserMenu />}
      </div>
    </header>
  );
}
