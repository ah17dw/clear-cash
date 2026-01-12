import { useState, useMemo } from 'react';
import { Bell, Check, X, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification, useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useAlerts } from '@/hooks/useFinanceData';
import { useTasks } from '@/hooks/useTasks';
import { useRenewals } from '@/hooks/useRenewals';
import { formatDistanceToNow, parseISO, differenceInDays, isToday, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const [open, setOpen] = useState(false);
  
  // Get alerts from finance data
  const financeAlerts = useAlerts();
  
  // Get upcoming tasks
  const { data: tasks } = useTasks();
  const upcomingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => {
      if (t.is_completed || !t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      const daysUntil = differenceInDays(dueDate, new Date());
      return daysUntil <= 7 && daysUntil >= 0;
    }).slice(0, 5);
  }, [tasks]);
  
  // Get upcoming renewals
  const { data: renewals } = useRenewals();
  const upcomingRenewals = useMemo(() => {
    if (!renewals) return [];
    return renewals.filter(r => {
      if (!r.agreement_end) return false;
      const endDate = parseISO(r.agreement_end);
      const daysUntil = differenceInDays(endDate, new Date());
      return daysUntil <= 30 && daysUntil >= 0;
    }).slice(0, 5);
  }, [renewals]);

  // Total alert count
  const totalAlerts = financeAlerts.length + upcomingTasks.length + upcomingRenewals.length;

  const handleNotificationClick = (notification: { id: string; link: string | null; is_read: boolean }) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-destructive';
      case 'success':
        return 'bg-savings';
      default:
        return 'bg-primary';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {(unreadCount > 0 || totalAlerts > 0) && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount + totalAlerts > 9 ? '9+' : unreadCount + totalAlerts}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Tabs defaultValue="alerts" className="w-full">
          <div className="border-b px-4 py-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="alerts" className="text-xs">
                Alerts {totalAlerts > 0 && `(${totalAlerts})`}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="alerts" className="m-0">
            <ScrollArea className="h-[300px]">
              {totalAlerts === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No alerts</p>
                </div>
              ) : (
                <div className="divide-y">
                  {/* Finance Alerts */}
                  {financeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        if (alert.debtId) navigate(`/debts/${alert.debtId}`);
                        setOpen(false);
                      }}
                    >
                      <div className={cn(
                        'w-2 h-2 rounded-full mt-2 shrink-0',
                        alert.severity === 'danger' && 'bg-destructive',
                        alert.severity === 'warning' && 'bg-yellow-500',
                        alert.severity === 'info' && 'bg-primary'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{alert.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Upcoming Tasks */}
                  {upcomingTasks.map((task) => {
                    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          navigate('/todo');
                          setOpen(false);
                        }}
                      >
                        <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', isOverdue ? 'bg-destructive' : 'bg-amber-500')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {isOverdue ? 'Overdue' : `Due ${formatDistanceToNow(parseISO(task.due_date!), { addSuffix: true })}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Upcoming Renewals */}
                  {upcomingRenewals.map((renewal) => (
                    <div
                      key={renewal.id}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        navigate('/renewals');
                        setOpen(false);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full mt-2 shrink-0 bg-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{renewal.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Renews {formatDistanceToNow(parseISO(renewal.agreement_end!), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="notifications" className="m-0">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-xs text-muted-foreground">Messages</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => markAllRead.mutate()}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="h-[260px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                        !notification.is_read && 'bg-primary/5'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', getTypeColor(notification.type))} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', !notification.is_read && 'text-foreground')}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification.mutate(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
