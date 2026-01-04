import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Trash2, UserPlus, Search } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateTask, useUpdateTask, useDeleteTask, useAddTaskTag, useTaskTags, Task } from '@/hooks/useTasks';
import { useSearchProfiles } from '@/hooks/useProfiles';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
}

export function TaskFormSheet({ open, onOpenChange, task }: TaskFormSheetProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addTaskTag = useAddTaskTag();
  const { data: tags } = useTaskTags(task?.id ?? '');

  const [userSearch, setUserSearch] = useState('');
  const { data: searchResults, isLoading: isSearching } = useSearchProfiles(userSearch);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [repeatType, setRepeatType] = useState<string>('none');
  const [autoComplete, setAutoComplete] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStartDate(task.start_date ? new Date(task.start_date) : undefined);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setDueTime(task.due_time || '');
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
    setStartDate(undefined);
    setDueDate(undefined);
    setDueTime('');
    setPriority('medium');
    setRepeatType('none');
    setAutoComplete(false);
    setUserSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      title,
      description: description || null,
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      due_time: dueTime || null,
      priority,
      repeat_type: repeatType === 'none' ? null : repeatType as 'daily' | 'weekly' | 'monthly',
      is_completed: task?.is_completed ?? false,
      auto_complete: autoComplete,
    };

    try {
      if (task) {
        await updateTask.mutateAsync({ id: task.id, updates: taskData });
      } else {
        await createTask.mutateAsync(taskData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (task) {
      await deleteTask.mutateAsync(task.id);
      onOpenChange(false);
    }
  };

  const handleSelectUser = async (profile: { user_id: string; display_name: string | null }) => {
    if (!task) {
      toast.info('Save the task first, then you can tag users');
      return;
    }
    
    // We need to get the email for this user - for now we'll use display_name as a placeholder
    // In a real app, we'd query the email or store it in profiles
    // For now, we'll ask for email input but show the display_name in search
    const email = prompt(`Enter email for ${profile.display_name || 'this user'}:`);
    if (!email) return;

    await addTaskTag.mutateAsync({ taskId: task.id, taggedEmail: email });
    setUserSearch('');
  };

  const handleTagByEmail = async () => {
    if (!task) {
      toast.info('Save the task first, then you can tag users');
      return;
    }

    const email = userSearch.trim();
    if (!email) return;

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    await addTaskTag.mutateAsync({ taskId: task.id, taggedEmail: email });
    setUserSearch('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task ? 'Edit Task' : 'New Task'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">Auto-complete</p>
              <p className="text-xs text-muted-foreground">Mark as done automatically</p>
            </div>
            <Switch
              checked={autoComplete}
              onCheckedChange={setAutoComplete}
            />
          </div>

          {/* User Tagging Section */}
          <div className="space-y-2 border-t pt-4">
            <Label className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Delegate to User
            </Label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or enter email..."
                className="pl-9"
              />
            </div>

            {/* Search Results */}
            {userSearch.length >= 2 && (
              <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                {isSearching ? (
                  <p className="text-xs text-muted-foreground p-2">Searching...</p>
                ) : searchResults && searchResults.length > 0 ? (
                  searchResults.map((profile) => (
                    <button
                      key={profile.user_id}
                      type="button"
                      className="w-full text-left p-2 hover:bg-muted text-sm flex items-center gap-2"
                      onClick={() => handleSelectUser(profile)}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                        {(profile.display_name || '?').charAt(0).toUpperCase()}
                      </div>
                      {profile.display_name || 'Unknown User'}
                    </button>
                  ))
                ) : (
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground mb-2">No users found. Tag by email?</p>
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userSearch) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTagByEmail}
                        className="w-full"
                      >
                        Tag {userSearch}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Existing Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((t) => (
                  <Badge key={t.id} variant="secondary">
                    {t.tagged_email}
                  </Badge>
                ))}
              </div>
            )}

            {!task && (
              <p className="text-xs text-muted-foreground">
                Save the task first to tag users.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            {task && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={createTask.isPending || updateTask.isPending}>
              {task ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
