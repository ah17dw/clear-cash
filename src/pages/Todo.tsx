import { useState } from 'react';
import { Plus, Calendar, Clock, Flag, Repeat, Users, CheckCircle2, Circle, Filter } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { TaskFormSheet } from '@/components/todo/TaskFormSheet';
import { cn } from '@/lib/utils';

export default function Todo() {
  const { data: tasks, isLoading } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const updateTask = useUpdateTask();

  const filteredTasks = tasks?.filter(task => {
    if (filter === 'all') return true;
    if (!task.due_date) return false;
    const dueDate = parseISO(task.due_date);
    if (filter === 'today') return isToday(dueDate);
    if (filter === 'week') return isThisWeek(dueDate);
    if (filter === 'month') return isThisMonth(dueDate);
    return true;
  }) ?? [];

  const incompleteTasks = filteredTasks.filter(t => !t.is_completed);
  const completedTasks = filteredTasks.filter(t => t.is_completed);

  const dailyCount = tasks?.filter(t => t.repeat_type === 'daily' && !t.is_completed).length ?? 0;
  const weeklyCount = tasks?.filter(t => t.repeat_type === 'weekly' && !t.is_completed).length ?? 0;
  const monthlyCount = tasks?.filter(t => t.repeat_type === 'monthly' && !t.is_completed).length ?? 0;

  const handleToggleComplete = async (task: any) => {
    await updateTask.mutateAsync({
      id: task.id,
      updates: { is_completed: !task.is_completed }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-debt';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-savings';
      default: return 'text-muted-foreground';
    }
  };

  const getRepeatBadge = (repeatType: string | null) => {
    if (!repeatType) return null;
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    };
    return (
      <Badge variant="secondary" className="text-xs">
        <Repeat className="h-3 w-3 mr-1" />
        {labels[repeatType]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeader title="To Do" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title="To Do" 
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="finance-card text-center p-3">
          <p className="text-2xl font-bold">{dailyCount}</p>
          <p className="text-xs text-muted-foreground">Daily</p>
        </div>
        <div className="finance-card text-center p-3">
          <p className="text-2xl font-bold">{weeklyCount}</p>
          <p className="text-xs text-muted-foreground">Weekly</p>
        </div>
        <div className="finance-card text-center p-3">
          <p className="text-2xl font-bold">{monthlyCount}</p>
          <p className="text-xs text-muted-foreground">Monthly</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(['all', 'today', 'week', 'month'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="whitespace-nowrap"
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Tasks List */}
      {incompleteTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="finance-card text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tasks yet</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
            Add your first task
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {incompleteTasks.map(task => (
            <div
              key={task.id}
              className="finance-card p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                setEditingTask(task);
                setShowForm(true);
              }}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={(e) => {
                    e.stopPropagation?.();
                    handleToggleComplete(task);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Flag className={cn("h-3 w-3", getPriorityColor(task.priority))} />
                    <p className="font-medium truncate">{task.title}</p>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(task.due_date), 'MMM d')}
                      </span>
                    )}
                    {task.due_time && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.due_time}
                      </span>
                    )}
                    {getRepeatBadge(task.repeat_type)}
                    {task.auto_complete && (
                      <Badge variant="outline" className="text-xs">Auto</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {completedTasks.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground pt-4 pb-2">Completed</p>
              {completedTasks.map(task => (
                <div
                  key={task.id}
                  className="finance-card p-3 opacity-60 cursor-pointer"
                  onClick={() => {
                    setEditingTask(task);
                    setShowForm(true);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => handleToggleComplete(task)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <p className="font-medium line-through text-muted-foreground">{task.title}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <TaskFormSheet
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
      />
    </div>
  );
}
