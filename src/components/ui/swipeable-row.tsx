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
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 40;
  const ACTION_WIDTH = 140;

  const handleStart = (clientX: number) => {
    if (disabled) return;
    setStartX(clientX);
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled) return;
    const diff = startX - clientX;
    
    if (isOpen) {
      // Currently open: swiping right (negative diff) closes it
      const newTranslate = Math.max(0, Math.min(ACTION_WIDTH, ACTION_WIDTH + diff));
      setCurrentTranslate(newTranslate);
    } else {
      // Currently closed: swiping left (positive diff) opens it
      const newTranslate = Math.max(0, Math.min(ACTION_WIDTH, diff));
      setCurrentTranslate(newTranslate);
    }
  };

  const handleEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    
    // Snap open or closed based on current position
    if (currentTranslate > SWIPE_THRESHOLD) {
      setIsOpen(true);
      setCurrentTranslate(ACTION_WIDTH);
    } else {
      setIsOpen(false);
      setCurrentTranslate(0);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const handleTouchEnd = () => handleEnd();

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const handleMouseUp = () => handleEnd();
  const handleMouseLeave = () => { if (isDragging) handleEnd(); };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setIsOpen(false);
    setCurrentTranslate(0);
    action();
  };

  const translateX = -currentTranslate;

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Action buttons */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <div className="flex h-full items-stretch" style={{ width: `${ACTION_WIDTH}px` }}>
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
    </div>
  );
}
