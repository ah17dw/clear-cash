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
  const ACTION_WIDTH = 140;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled) return;
    const diff = startX - e.touches[0].clientX;
    
    if (isOpen) {
      // When open, allow swiping right to close
      const newX = ACTION_WIDTH + diff;
      setCurrentX(Math.max(0, Math.min(newX, ACTION_WIDTH)));
    } else {
      // When closed, allow swiping left to open
      if (diff > 0) {
        setCurrentX(Math.min(diff, ACTION_WIDTH));
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    
    if (isOpen) {
      // If currently open, close if swiped past threshold
      if (currentX < ACTION_WIDTH - SWIPE_THRESHOLD) {
        closeActions();
      } else {
        setCurrentX(ACTION_WIDTH);
      }
    } else {
      // If currently closed, open if swiped past threshold
      if (currentX > SWIPE_THRESHOLD) {
        setIsOpen(true);
        setCurrentX(ACTION_WIDTH);
      } else {
        setCurrentX(0);
      }
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
    
    if (isOpen) {
      const newX = ACTION_WIDTH + diff;
      setCurrentX(Math.max(0, Math.min(newX, ACTION_WIDTH)));
    } else {
      if (diff > 0) {
        setCurrentX(Math.min(diff, ACTION_WIDTH));
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    
    if (isOpen) {
      if (currentX < ACTION_WIDTH - SWIPE_THRESHOLD) {
        closeActions();
      } else {
        setCurrentX(ACTION_WIDTH);
      }
    } else {
      if (currentX > SWIPE_THRESHOLD) {
        setIsOpen(true);
        setCurrentX(ACTION_WIDTH);
      } else {
        setCurrentX(0);
      }
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

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    closeActions();
    action();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if (isOpen) {
      e.stopPropagation();
      e.preventDefault();
      closeActions();
    }
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
              onClick={(e) => handleAction(e, onEdit)}
              className="flex-1 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={(e) => handleAction(e, onDuplicate)}
              className="flex-1 flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
              aria-label="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => handleAction(e, onDelete)}
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
          'relative bg-card',
          isDragging ? 'transition-none' : 'transition-transform duration-200',
          isOpen && 'cursor-pointer'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
