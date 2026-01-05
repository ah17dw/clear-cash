import { format, parseISO } from 'date-fns';
import { History, User, CheckCircle2, UserPlus, ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAllTaskHistory, useTaskStats } from '@/hooks/useTaskHistory';
import { useTasks } from '@/hooks/useTasks';

interface TaskHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskHistorySheet({ open, onOpenChange }: TaskHistorySheetProps) {
  const { data: history, isLoading } = useAllTaskHistory();
  const { data: tasks } = useTasks();
  const stats = useTaskStats();

  const getTaskTitle = (taskId: string) => {
    return tasks?.find(t => t.id === taskId)?.title ?? 'Unknown Task';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <History className="h-4 w-4 text-primary" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-savings" />;
      case 'delegated': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'accepted': return <ThumbsUp className="h-4 w-4 text-savings" />;
      case 'rejected': return <ThumbsDown className="h-4 w-4 text-debt" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getActionText = (action: string, details: Record<string, any>) => {
    switch (action) {
      case 'created': return 'Created task';
      case 'completed': return details.on_time ? 'Completed on time' : 'Completed';
      case 'delegated': return `Delegated to ${details.delegate_email || 'user'}`;
      case 'accepted': return 'Accepted delegation';
      case 'rejected': return 'Rejected delegation';
      default: return action;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Task History & Stats
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* User Stats Summary */}
          {stats.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Task Completion Summary</h3>
              <div className="space-y-2">
                {stats.map((stat) => (
                  <div key={stat.userId} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{stat.displayName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="outline">
                        {stat.completedCount}/{stat.assignedCount} completed
                      </Badge>
                      {stat.onTimeCount > 0 && (
                        <Badge variant="secondary" className="bg-savings/20 text-savings">
                          {stat.onTimeCount} on time
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Timeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Activity Log</h3>
            <ScrollArea className="h-[50vh]">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : history && history.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 py-2 px-3 border-l-2 border-muted ml-2"
                    >
                      <div className="mt-0.5">{getActionIcon(entry.action)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getTaskTitle(entry.task_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {getActionText(entry.action, entry.details)}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {format(parseISO(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No task history yet. Complete some tasks to see activity here.
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
