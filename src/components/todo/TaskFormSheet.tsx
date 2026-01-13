import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, UserPlus, Search, User, Mail, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTask, useUpdateTask, useDeleteTask, useAddTaskTag, useTaskTags, Task } from '@/hooks/useTasks';
import { useSearchProfiles } from '@/hooks/useProfiles';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
}

// Predefined household members - could come from settings/database
const HOUSEHOLD_MEMBERS = [
  { email: 'alex@hayesalex.com', name: 'Alex', color: 'bg-blue-500' },
  { email: 'bill@example.com', name: 'Bill', color: 'bg-green-500' },
  { email: 'nan@example.com', name: 'Nan', color: 'bg-purple-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-savings' },
  { value: 'medium', label: 'Medium', color: 'text-amber-500' },
  { value: 'high', label: 'High', color: 'text-debt' },
];

export function TaskFormSheet({ open, onOpenChange, task }: TaskFormSheetProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addTaskTag = useAddTaskTag();
  const { data: tags } = useTaskTags(task?.id ?? '');

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [repeatType, setRepeatType] = useState<string>('none');
  const [autoComplete, setAutoComplete] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStartDate(task.start_date || '');
      setDueDate(task.due_date || '');
      setDueTime(task.due_time?.slice(0, 5) || '');
      setPriority(task.priority);
      setRepeatType(task.repeat_type || 'none');
      setAutoComplete(task.auto_complete);
    } else {
      resetForm();
    }
  }, [task, open]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setDueDate('');
    setDueTime('');
    setPriority('medium');
    setRepeatType('none');
    setAutoComplete(false);
    setCustomEmail('');
    setShowEmailInput(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedDueTime = dueTime
      ? /^\d{2}:\d{2}$/.test(dueTime)
        ? `${dueTime}:00`
        : dueTime
      : null;

    const taskData = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      start_date: startDate || null,
      due_date: dueDate || null,
      due_time: normalizedDueTime,
      priority,
      repeat_type: repeatType as 'daily' | 'weekly' | 'monthly' | 'none',
      is_completed: task?.is_completed ?? false,
      auto_complete: autoComplete,
      delegation_status: (task?.delegation_status ?? 'none') as Task['delegation_status'],
      completed_at: task?.completed_at ?? null,
    };

    try {
      if (task) {
        await updateTask.mutateAsync({ id: task.id, updates: taskData });
      } else {
        await createTask.mutateAsync(taskData);
      }
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save task';
      console.error('Task form submit error:', error);
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (task) {
      await deleteTask.mutateAsync(task.id);
      onOpenChange(false);
    }
  };

  const handleAssignMember = async (email: string) => {
    if (!task) {
      toast.info('Save the task first to assign someone');
      return;
    }

    // Check if already tagged
    if (tags?.some(t => t.tagged_email === email)) {
      toast.info('This person is already assigned');
      return;
    }

    await addTaskTag.mutateAsync({ taskId: task.id, taggedEmail: email });
  };

  const handleCustomEmailAssign = async () => {
    if (!customEmail.trim()) return;
    
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail);
    if (!isValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    await handleAssignMember(customEmail);
    setCustomEmail('');
    setShowEmailInput(false);
  };

  const isTagged = (email: string) => tags?.some(t => t.tagged_email === email);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task ? 'Edit Task' : 'New Task'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Name *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
              className="text-base"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={2}
            />
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value as 'low' | 'medium' | 'high')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                    priority === opt.value 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className={opt.color}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Time & Repeat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Time</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Repeat</Label>
              <Select value={repeatType} onValueChange={setRepeatType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto Complete */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-sm">Auto-complete</p>
              <p className="text-xs text-muted-foreground">Mark done at due time</p>
            </div>
            <Switch
              checked={autoComplete}
              onCheckedChange={setAutoComplete}
            />
          </div>

          {/* Assign to Household Members */}
          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Assign To
            </Label>

            {/* Quick Select Household Members */}
            <div className="flex flex-wrap gap-2">
              {HOUSEHOLD_MEMBERS.map(member => {
                const tagged = isTagged(member.email);
                return (
                  <button
                    key={member.email}
                    type="button"
                    onClick={() => handleAssignMember(member.email)}
                    disabled={!task || tagged}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full border transition-all",
                      tagged 
                        ? "bg-primary/10 border-primary" 
                        : "hover:border-primary/50 hover:bg-muted/50",
                      !task && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className={cn("text-xs text-white", member.color)}>
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{member.name}</span>
                    {tagged && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}

              {/* Add Other Button */}
              <button
                type="button"
                onClick={() => setShowEmailInput(!showEmailInput)}
                disabled={!task}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full border border-dashed transition-all",
                  "hover:border-primary/50 hover:bg-muted/50",
                  !task && "opacity-50 cursor-not-allowed"
                )}
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Other...</span>
              </button>
            </div>

            {/* Custom Email Input */}
            {showEmailInput && task && (
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleCustomEmailAssign}
                  disabled={addTaskTag.isPending}
                >
                  Send
                </Button>
              </div>
            )}

            {/* Already Assigned */}
            {tags && tags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Assigned:</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => (
                    <Badge key={t.id} variant="secondary" className="text-xs">
                      {t.tagged_email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!task && (
              <p className="text-xs text-muted-foreground">
                💡 Save the task first to assign household members. They'll receive an email to accept or decline.
              </p>
            )}

            {/* Delegation Status */}
            {task && task.delegation_status !== 'none' && (
              <div className={cn(
                "p-3 rounded-lg text-sm",
                task.delegation_status === 'pending' && "bg-amber-500/10 text-amber-600",
                task.delegation_status === 'accepted' && "bg-savings/10 text-savings",
                task.delegation_status === 'rejected' && "bg-debt/10 text-debt",
              )}>
                {task.delegation_status === 'pending' && '⏳ Awaiting response from assigned person'}
                {task.delegation_status === 'accepted' && '✓ Task accepted'}
                {task.delegation_status === 'rejected' && '✕ Task was declined'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            {task && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={createTask.isPending || updateTask.isPending || !title.trim()}
            >
              {task ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}