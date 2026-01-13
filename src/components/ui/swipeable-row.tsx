import { useState, useRef, ReactNode } from 'react';
import { Edit, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableRowProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  onDuplicate,
  className,
  disabled = false,
}: SwipeableRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 50;
  const ACTION_WIDTH = 140; // Width of action buttons area

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled) return;
    const diff = startX - e.touches[0].clientX;
    // Only allow swiping left (positive diff)
    if (diff > 0) {
      setCurrentX(Math.min(diff, ACTION_WIDTH));
    } else if (isOpen) {
      // Allow swiping right to close
      setCurrentX(Math.max(ACTION_WIDTH + diff, 0));
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    
    if (currentX > SWIPE_THRESHOLD) {
      setIsOpen(true);
      setCurrentX(ACTION_WIDTH);
    } else {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || disabled) return;
    const diff = startX - e.clientX;
    if (diff > 0) {
      setCurrentX(Math.min(diff, ACTION_WIDTH));
    } else if (isOpen) {
      setCurrentX(Math.max(ACTION_WIDTH + diff, 0));
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    
    if (currentX > SWIPE_THRESHOLD) {
      setIsOpen(true);
      setCurrentX(ACTION_WIDTH);
    } else {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const closeActions = () => {
    setIsOpen(false);
    setCurrentX(0);
  };

  const handleAction = (action: () => void) => {
    closeActions();
    action();
  };

  const translateX = isDragging ? -currentX : (isOpen ? -ACTION_WIDTH : 0);

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Action buttons background */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <div 
          className="flex h-full items-stretch"
          style={{ width: `${ACTION_WIDTH}px` }}
        >
          {onEdit && (
            <button
              onClick={() => handleAction(onEdit)}
              className="flex-1 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={() => handleAction(onDuplicate)}
              className="flex-1 flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
              aria-label="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => handleAction(onDelete)}
              className="flex-1 flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div
        ref={rowRef}
        className={cn(
          'relative bg-card transition-transform',
          isDragging ? 'transition-none' : 'transition-transform duration-200'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {/* Tap to close overlay when actions are open */}
      {isOpen && (
        <div 
          className="absolute inset-0 z-10"
          style={{ right: `${ACTION_WIDTH}px` }}
          onClick={closeActions}
        />
      )}
    </div>
  );
}
