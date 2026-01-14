import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday, parseISO, getDay, addDays, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task } from '@/hooks/useTasks';

interface CalendarEvent {
  date: Date;
  type: 'task';
  label: string;
  color: string;
  repeatType?: string;
  time?: string;
  description?: string;
}

interface TaskCalendarProps {
  tasks?: Task[];
}

// Generate Google Calendar link
function generateGoogleCalendarLink(event: {
  title: string;
  date: Date;
  time?: string;
  description?: string;
  repeatType?: string;
}): string {
  const { title, date, time, description, repeatType } = event;
  
  let startDate: string;
  let endDate: string;
  
  if (time) {
    const [hours, minutes] = time.split(':');
    const eventDate = new Date(date);
    eventDate.setHours(parseInt(hours), parseInt(minutes), 0);
    const endEventDate = new Date(eventDate);
    endEventDate.setHours(endEventDate.getHours() + 1);
    
    startDate = eventDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    endDate = endEventDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  } else {
    startDate = format(date, 'yyyyMMdd');
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    endDate = format(nextDay, 'yyyyMMdd');
  }

  let recur = '';
  if (repeatType && repeatType !== 'none') {
    switch (repeatType) {
      case 'daily':
        recur = '&recur=RRULE:FREQ=DAILY';
        break;
      case 'weekly':
        const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][getDay(date)];
        recur = `&recur=RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeek}`;
        break;
      case 'monthly':
        recur = '&recur=RRULE:FREQ=MONTHLY';
        break;
    }
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDate}/${endDate}`,
    details: description || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}${recur}`;
}

export function TaskCalendar({ tasks = [] }: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Generate task events including recurring ones
    tasks.forEach(task => {
      // Use due_date if available, otherwise fall back to start_date
      const taskDate = task.due_date || task.start_date;
      if (!taskDate || task.is_completed) return;
      
      const baseDueDate = parseISO(taskDate);
      const repeatType = task.repeat_type || 'none';
      
      // For recurring tasks, generate instances within the month view
      if (repeatType === 'none') {
        // Single occurrence
        if (baseDueDate >= monthStart && baseDueDate <= monthEnd) {
          allEvents.push({
            date: baseDueDate,
            type: 'task',
            label: task.title,
            color: task.priority === 'high' ? 'bg-debt' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-savings',
            repeatType: repeatType,
            time: task.due_time || undefined,
            description: task.description || undefined,
          });
        }
      } else if (repeatType === 'daily') {
        // Daily: show every day from due date within month
        let currentDate = baseDueDate < monthStart ? monthStart : baseDueDate;
        while (currentDate <= monthEnd) {
          if (currentDate >= monthStart) {
            allEvents.push({
              date: new Date(currentDate),
              type: 'task',
              label: task.title,
              color: task.priority === 'high' ? 'bg-debt' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-savings',
              repeatType: repeatType,
              time: task.due_time || undefined,
              description: task.description || undefined,
            });
          }
          currentDate = addDays(currentDate, 1);
        }
      } else if (repeatType === 'weekly') {
        // Weekly: show on same day of week
        const dayOfWeek = getDay(baseDueDate);
        // Find first occurrence of this day in the month
        let currentDate = monthStart;
        while (getDay(currentDate) !== dayOfWeek) {
          currentDate = addDays(currentDate, 1);
        }
        // If base date is after this, start from base date
        if (baseDueDate > currentDate) {
          currentDate = baseDueDate;
        }
        while (currentDate <= monthEnd) {
          if (currentDate >= monthStart && currentDate >= baseDueDate) {
            allEvents.push({
              date: new Date(currentDate),
              type: 'task',
              label: task.title,
              color: task.priority === 'high' ? 'bg-debt' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-savings',
              repeatType: repeatType,
              time: task.due_time || undefined,
              description: task.description || undefined,
            });
          }
          currentDate = addWeeks(currentDate, 1);
        }
      } else if (repeatType === 'monthly') {
        // Monthly: same day of month
        const dayOfMonth = baseDueDate.getDate();
        const monthlyDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayOfMonth);
        if (monthlyDate >= monthStart && monthlyDate <= monthEnd && monthlyDate >= baseDueDate) {
          allEvents.push({
            date: monthlyDate,
            type: 'task',
            label: task.title,
            color: task.priority === 'high' ? 'bg-debt' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-savings',
            repeatType: repeatType,
            time: task.due_time || undefined,
            description: task.description || undefined,
          });
        }
      }
    });

    return allEvents;
  }, [tasks, currentMonth]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  const startDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getEventsForDay = (date: Date) => {
    return events.filter(e => isSameDay(e.date, date));
  };

  const goToPrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const openGoogleCalendar = (event: CalendarEvent) => {
    const url = generateGoogleCalendarLink({
      title: event.label,
      date: event.date,
      time: event.time,
      description: event.description,
      repeatType: event.repeatType,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="finance-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <Button variant="link" size="sm" onClick={goToToday} className="text-xs p-0 h-auto">
            Today
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'aspect-square p-0.5 rounded-md flex flex-col items-center justify-start text-xs relative overflow-hidden',
                isToday(day) && 'ring-2 ring-primary',
                hasEvents && 'bg-muted/50'
              )}
            >
              <span className={cn(
                'font-medium',
                isToday(day) && 'text-primary'
              )}>
                {format(day, 'd')}
              </span>
              
              {hasEvents && (
                <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        event.color
                      )}
                      title={event.label}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground mb-2">Priority</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-debt" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-savings" />
            <span>Low</span>
          </div>
        </div>
      </div>

      {/* Events list for current month */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">This Month</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {events
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((event, i) => (
                <div key={i} className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', event.color)} />
                    <span className="text-muted-foreground shrink-0">{format(event.date, 'd MMM')}</span>
                    <span className="truncate">{event.label}</span>
                    {event.repeatType && event.repeatType !== 'none' && (
                      <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground">
                        {event.repeatType}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openGoogleCalendar(event)}
                    title="Add to Google Calendar"
                  >
                    <CalendarIcon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
