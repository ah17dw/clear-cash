import { useState, useMemo } from 'react';
import { 
  Plus, Calendar, Clock, Flag, Repeat, CheckCircle2, History, 
  AlertTriangle, CalendarDays, Check, X, HelpCircle, Users, 
  LayoutGrid, List, Filter, User, ChevronRight
} from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, parseISO, isPast, differenceInDays, addDays, addWeeks, addMonths } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTasks, useUpdateTask, useCreateTask, useTaskTags, Task } from '@/hooks/useTasks';
import { useAddTaskHistory } from '@/hooks/useTaskHistory';
import { TaskFormSheet } from '@/components/todo/TaskFormSheet';
import { TaskHistorySheet } from '@/components/todo/TaskHistorySheet';
import { TaskCalendar } from '@/components/todo/TaskCalendar';
import { cn } from '@/lib/utils';

// Household members - this could come from a database/settings in the future
const HOUSEHOLD_MEMBERS = [
  { email: 'alex@hayesalex.com', name: 'Alex', color: 'bg-blue-500' },
  { email: 'bill@example.com', name: 'Bill', color: 'bg-green-500' },
  { email: 'nan@example.com', name: 'Nan', color: 'bg-purple-500' },
];

type ViewMode = 'list' | 'board';
type FilterType = 'all' | 'today' | 'week' | 'month' | 'overdue';
type AssigneeFilter = 'all' | string;

interface TaskWithTags extends Task {
  assignees?: { email: string; name: string; color: string }[];
}

export default function Todo() {
  const { data: tasks, isLoading } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const addHistory = useAddTaskHistory();

  // Enrich tasks with assignee info
  const enrichedTasks = useMemo(() => {
    return tasks?.map(task => {
      const assignees = HOUSEHOLD_MEMBERS.filter(member => 
        // Check if task has this member tagged (simplified - in real app would query task_tags)
        task.delegation_status !== 'none'
      );
      return { ...task, assignees };
    }) ?? [];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = enrichedTasks;

    // Date filter
    if (filter !== 'all') {
      result = result.filter(task => {
        if (!task.due_date) return false;
        const dueDate = parseISO(task.due_date);
        if (filter === 'today') return isToday(dueDate);
        if (filter === 'week') return isThisWeek(dueDate);
        if (filter === 'month') return isThisMonth(dueDate);
        if (filter === 'overdue') return isPast(dueDate) && !isToday(dueDate) && !task.is_completed;
        return true;
      });
    }

    return result;
  }, [enrichedTasks, filter, assigneeFilter]);

  // Group tasks by status for board view
  const tasksByStatus = useMemo(() => {
    const pending = filteredTasks.filter(t => !t.is_completed && t.delegation_status === 'pending');
    const todo = filteredTasks.filter(t => !t.is_completed && t.delegation_status !== 'pending');
    const done = filteredTasks.filter(t => t.is_completed);
    return { pending, todo, done };
  }, [filteredTasks]);

  // Stats
  const stats = useMemo(() => {
    const all = tasks ?? [];
    return {
      total: all.length,
      overdue: all.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && !t.is_completed).length,
      pending: all.filter(t => t.delegation_status === 'pending').length,
      todayDue: all.filter(t => t.due_date && isToday(parseISO(t.due_date)) && !t.is_completed).length,
      completed: all.filter(t => t.is_completed).length,
    };
  }, [tasks]);

  const handleToggleComplete = async (task: Task) => {
    const isCompleting = !task.is_completed;
    const isOnTime = task.due_date ? !isPast(parseISO(task.due_date)) : true;

    if (isCompleting && task.due_date && task.repeat_type && task.repeat_type !== 'none') {
      const base = parseISO(task.due_date);
      let next = base;

      if (task.repeat_type === 'daily') next = addDays(base, 1);
      if (task.repeat_type === 'weekly') next = addWeeks(base, 1);
      if (task.repeat_type === 'monthly') next = addMonths(base, 1);

      await createTask.mutateAsync({
        title: task.title,
        description: task.description ?? null,
        start_date: task.start_date ?? null,
        due_date: format(next, 'yyyy-MM-dd'),
        due_time: task.due_time ?? null,
        priority: task.priority,
        repeat_type: task.repeat_type,
        is_completed: false,
        auto_complete: task.auto_complete ?? false,
        delegation_status: 'none',
        completed_at: null,
      });

      await updateTask.mutateAsync({
        id: task.id,
        updates: {
          is_completed: true,
          completed_at: new Date().toISOString(),
          repeat_type: 'none',
        },
      });

      await addHistory.mutateAsync({
        task_id: task.id,
        action: 'completed',
        details: { on_time: isOnTime, repeated: true },
      });

      return;
    }

    await updateTask.mutateAsync({
      id: task.id,
      updates: {
        is_completed: isCompleting,
        completed_at: isCompleting ? new Date().toISOString() : null,
      },
    });

    if (isCompleting) {
      await addHistory.mutateAsync({
        task_id: task.id,
        action: 'completed',
        details: { on_time: isOnTime },
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-debt';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-savings';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-debt/10 border-debt/30';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30';
      case 'low': return 'bg-savings/10 border-savings/30';
      default: return 'bg-muted';
    }
  };

  const getTaskStatus = (task: Task) => {
    if (task.is_completed) return 'completed';
    if (!task.due_date) return 'normal';
    
    const dueDate = parseISO(task.due_date);
    const daysUntil = differenceInDays(dueDate, new Date());
    
    if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
    if (daysUntil <= 2) return 'upcoming';
    return 'normal';
  };

  const getDelegationIcon = (status: string) => {
    switch (status) {
      case 'pending': return <HelpCircle className="h-3 w-3 text-amber-500" />;
      case 'accepted': return <Check className="h-3 w-3 text-savings" />;
      case 'rejected': return <X className="h-3 w-3 text-debt" />;
      default: return null;
    }
  };

  const TaskCard = ({ task, compact = false }: { task: TaskWithTags; compact?: boolean }) => {
    const status = getTaskStatus(task);
    const isOverdue = status === 'overdue';
    const isUpcoming = status === 'upcoming';

    return (
      <div
        className={cn(
          "group relative p-3 rounded-lg border transition-all cursor-pointer",
          "hover:shadow-md hover:border-primary/30",
          task.is_completed && "opacity-50",
          isOverdue && "border-l-4 border-l-debt bg-debt/5",
          isUpcoming && !isOverdue && "border-l-4 border-l-amber-500 bg-amber-500/5",
          !isOverdue && !isUpcoming && "bg-card"
        )}
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
          
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold",
                getPriorityBg(task.priority),
                getPriorityColor(task.priority)
              )}>
                {task.priority.charAt(0).toUpperCase()}
              </span>
              <p className={cn(
                "font-medium truncate flex-1",
                task.is_completed && "line-through text-muted-foreground"
              )}>
                {task.title}
              </p>
              {task.delegation_status !== 'none' && (
                <div className="flex items-center">
                  {getDelegationIcon(task.delegation_status)}
                </div>
              )}
            </div>

            {/* Description */}
            {!compact && task.description && (
              <p className="text-sm text-muted-foreground truncate mb-2">
                {task.description}
              </p>
            )}

            {/* Meta Row */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {task.due_date && (
                <span className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded",
                  isOverdue ? "bg-debt/20 text-debt font-medium" : "text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {isToday(parseISO(task.due_date)) ? 'Today' : format(parseISO(task.due_date), 'MMM d')}
                </span>
              )}
              {task.due_time && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {task.due_time.slice(0, 5)}
                </span>
              )}
              {task.repeat_type && task.repeat_type !== 'none' && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Repeat className="h-3 w-3" />
                  {task.repeat_type}
                </span>
              )}
            </div>

            {/* Assignee Avatars */}
            {task.delegation_status !== 'none' && (
              <div className="flex items-center gap-1 mt-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/20">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {task.delegation_status === 'pending' && 'Awaiting response'}
                  {task.delegation_status === 'accepted' && 'Accepted'}
                  {task.delegation_status === 'rejected' && 'Declined'}
                </span>
              </div>
            )}
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  };

  const BoardColumn = ({ title, tasks, icon, color }: { title: string; tasks: TaskWithTags[]; icon: React.ReactNode; color: string }) => (
    <div className="flex-1 min-w-[280px]">
      <div className={cn("flex items-center gap-2 mb-3 p-2 rounded-lg", color)}>
        {icon}
        <span className="font-semibold text-sm">{title}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} compact />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            No tasks
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeader title="Tasks" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title="Tasks" 
        rightContent={
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setShowCalendar(!showCalendar)}>
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        }
      />

      {/* Calendar View */}
      {showCalendar && (
        <div className="mb-4">
          <TaskCalendar tasks={tasks} />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "finance-card text-center p-3 transition-all",
            filter === 'all' && "ring-2 ring-primary"
          )}
        >
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </button>
        <button
          onClick={() => setFilter('today')}
          className={cn(
            "finance-card text-center p-3 transition-all",
            filter === 'today' && "ring-2 ring-primary"
          )}
        >
          <p className="text-xl font-bold text-amber-500">{stats.todayDue}</p>
          <p className="text-[10px] text-muted-foreground">Today</p>
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={cn(
            "finance-card text-center p-3 transition-all",
            filter === 'overdue' && "ring-2 ring-primary"
          )}
        >
          <p className="text-xl font-bold text-debt">{stats.overdue}</p>
          <p className="text-[10px] text-muted-foreground">Overdue</p>
        </button>
        <div className="finance-card text-center p-3">
          <p className="text-xl font-bold text-savings">{stats.completed}</p>
          <p className="text-[10px] text-muted-foreground">Done</p>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded",
              viewMode === 'list' && "bg-background shadow-sm"
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              "p-1.5 rounded",
              viewMode === 'board' && "bg-background shadow-sm"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-28 h-8">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        {/* Quick Add for Household Members */}
        <div className="flex-1" />
        <div className="flex -space-x-1">
          {HOUSEHOLD_MEMBERS.slice(0, 3).map(member => (
            <Avatar key={member.email} className="h-6 w-6 border-2 border-background">
              <AvatarFallback className={cn("text-[10px] text-white", member.color)}>
                {member.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          <BoardColumn 
            title="To Do" 
            tasks={tasksByStatus.todo}
            icon={<Flag className="h-4 w-4 text-muted-foreground" />}
            color="bg-muted/50"
          />
          <BoardColumn 
            title="Awaiting Response" 
            tasks={tasksByStatus.pending}
            icon={<HelpCircle className="h-4 w-4 text-amber-500" />}
            color="bg-amber-500/10"
          />
          <BoardColumn 
            title="Completed" 
            tasks={tasksByStatus.done}
            icon={<CheckCircle2 className="h-4 w-4 text-savings" />}
            color="bg-savings/10"
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {filteredTasks.length === 0 ? (
            <div className="finance-card text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-1">No tasks found</p>
              <p className="text-xs text-muted-foreground mb-4">
                {filter !== 'all' ? 'Try changing your filter' : 'Create your first task to get started'}
              </p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Overdue Section */}
              {stats.overdue > 0 && filter !== 'overdue' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-debt" />
                    <span className="text-sm font-medium text-debt">Overdue ({stats.overdue})</span>
                  </div>
                  {filteredTasks
                    .filter(t => getTaskStatus(t) === 'overdue')
                    .map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  }
                </div>
              )}

              {/* Active Tasks */}
              {filteredTasks
                .filter(t => !t.is_completed && getTaskStatus(t) !== 'overdue')
                .map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              }

              {/* Completed Section */}
              {filteredTasks.filter(t => t.is_completed).length > 0 && (
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed ({filteredTasks.filter(t => t.is_completed).length})
                  </p>
                  {filteredTasks
                    .filter(t => t.is_completed)
                    .slice(0, 5)
                    .map(task => (
                      <TaskCard key={task.id} task={task} compact />
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </>
      )}

      <TaskFormSheet
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
      />

      <TaskHistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
      />
    </div>
  );
}