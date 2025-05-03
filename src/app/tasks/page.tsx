
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Plus, Edit, Trash2, Filter, X, ListFilter, CalendarDays, Clock, Loader2, GripVertical, AlertTriangle, Info, CheckSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isToday, compareAsc } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task, Priority, TaskStatus } from '@/lib/data-schema';
import { useAppData } from '@/hooks/use-app-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Helper to get priority styling
const getPriorityClasses = (priority: Priority): string => {
  switch (priority) {
    case 'high': return 'border-destructive text-destructive';
    case 'medium': return 'border-yellow-500 text-yellow-600 dark:border-yellow-400 dark:text-yellow-400';
    case 'low': return 'border-gray-400 text-gray-500 dark:border-gray-500 dark:text-gray-400';
    default: return 'border-muted text-muted-foreground';
  }
};

// Helper to get status styling
const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'completed': return <CheckSquare className="h-4 w-4 text-green-500" />;
    case 'in-progress': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'missed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'pending':
    default: return <Info className="h-4 w-4 text-yellow-500" />;
  }
};


export default function TasksPage() {
  const { isInitialized, tasks, updateTask, deleteTask } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterDateRange, setFilterDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [dateFilterPreset, setDateFilterPreset] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('dueDateAsc'); // 'dueDateAsc', 'dueDateDesc', 'priority', 'createdAt'

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);


  // Memoized filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    if (!isInitialized) return [];

    let filtered = [...tasks];

    // Filter by search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(lowerSearchTerm) ||
        (task.notes && task.notes.toLowerCase().includes(lowerSearchTerm)) ||
        (task.category && task.category.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Filter by date range
    if (filterDateRange.from || filterDateRange.to) {
        const start = filterDateRange.from ? startOfDay(filterDateRange.from) : null;
        const end = filterDateRange.to ? endOfDay(filterDateRange.to) : null;

        filtered = filtered.filter(task => {
            if (!task.dueDate) return false; // Only include tasks with due dates for date filtering
            const taskDate = parseISO(task.dueDate);
            if (!isValid(taskDate)) return false;

            if (start && end) {
                return isWithinInterval(taskDate, { start, end });
            } else if (start) {
                return compareAsc(taskDate, start) >= 0;
            } else if (end) {
                 return compareAsc(taskDate, end) <= 0;
            }
            return true; // Should not happen if from or to exists
        });
    }

    // Sort tasks
     const priorityOrder: Record<Priority, number> = { high: 1, medium: 2, low: 3 };
     filtered.sort((a, b) => {
        switch (sortOption) {
            case 'dueDateAsc':
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1; // Tasks without due date last
                if (!b.dueDate) return -1; // Tasks without due date last
                return compareAsc(parseISO(a.dueDate), parseISO(b.dueDate));
            case 'dueDateDesc':
                 if (!a.dueDate && !b.dueDate) return 0;
                 if (!a.dueDate) return 1;
                 if (!b.dueDate) return -1;
                 return compareAsc(parseISO(b.dueDate), parseISO(a.dueDate));
            case 'priority':
                 return priorityOrder[a.priority] - priorityOrder[b.priority];
            case 'createdAt':
                 return compareAsc(parseISO(b.createdAt), parseISO(a.createdAt)); // Newest first
            default:
                 return 0;
        }
    });


    return filtered;
  }, [tasks, searchTerm, filterPriority, filterStatus, filterDateRange, sortOption, isInitialized]);


  // --- Modal State and Handlers ---
  const [modalFormData, setModalFormData] = useState<Partial<Task>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Pre-fill form data when editingTask changes
    if (editingTask) {
      setModalFormData({
        ...editingTask,
        // Format date for input type="date"
        dueDate: editingTask.dueDate ? format(parseISO(editingTask.dueDate), 'yyyy-MM-dd') : undefined,
      });
      setIsAddTaskModalOpen(true);
    } else {
      // Reset form data when closing or opening for new task
      setModalFormData({ priority: 'medium', status: 'pending', isRecurring: false });
    }
  }, [editingTask]);


   const handleOpenAddTaskModal = () => {
        setEditingTask(null); // Ensure we are adding, not editing
        setModalFormData({ priority: 'medium', status: 'pending', isRecurring: false }); // Reset defaults
        setIsAddTaskModalOpen(true);
    };


  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModalFormData(prev => ({ ...prev, [name]: value }));
  };

   const handleModalSelectChange = (name: keyof Task, value: string | boolean | number | undefined) => {
        setModalFormData(prev => ({ ...prev, [name]: value }));
    };

   const handleModalDateChange = (date: Date | undefined) => {
        setModalFormData(prev => ({
            ...prev,
            dueDate: date ? format(date, 'yyyy-MM-dd') : undefined
        }));
    };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFormData.title?.trim()) {
      // Basic validation
      alert("Task title cannot be empty."); // Replace with toaster later
      return;
    }
    setIsSubmitting(true);
    try {
      await updateTask({
        id: editingTask?.id, // Pass ID if editing
        ...modalFormData,
         // Ensure dueDate is in ISO string format if it exists
         // The form state `modalFormData.dueDate` is already yyyy-MM-dd or undefined
         dueDate: modalFormData.dueDate,
      });
      setIsAddTaskModalOpen(false);
      setEditingTask(null);
      setModalFormData({}); // Reset form
    } catch (error) {
      console.error("Failed to save task:", error);
      // Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete.id);
      setTaskToDelete(null); // Close confirmation dialog
    }
  };

  const handleDatePresetChange = (preset: string) => {
        setDateFilterPreset(preset);
        const now = new Date();
        switch (preset) {
            case 'today':
                setFilterDateRange({ from: startOfDay(now), to: endOfDay(now) });
                break;
            case 'thisWeek':
                 setFilterDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }); // Assuming Monday start
                break;
            case 'thisMonth':
                 setFilterDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
                break;
            case 'all':
            default:
                setFilterDateRange({});
                break;
        }
    };

   const clearDateFilter = () => {
        setDateFilterPreset('all');
        setFilterDateRange({});
    };


  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Task Manager</CardTitle>
              <Button onClick={handleOpenAddTaskModal}>
                  <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
          </CardHeader>
          <CardContent>
              {/* Filters and Search */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <Input
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="md:flex-1"
                  />
                 <div className="flex flex-wrap gap-2">
                     {/* Priority Filter */}
                     <Select value={filterPriority} onValueChange={(value: Priority | 'all') => setFilterPriority(value)}>
                         <SelectTrigger className="w-full md:w-[130px]">
                             <SelectValue placeholder="Priority" />
                         </SelectTrigger>
                         <SelectContent>
                             <SelectItem value="all">All Priorities</SelectItem>
                             <SelectItem value="high">High</SelectItem>
                             <SelectItem value="medium">Medium</SelectItem>
                             <SelectItem value="low">Low</SelectItem>
                         </SelectContent>
                     </Select>

                     {/* Status Filter */}
                     <Select value={filterStatus} onValueChange={(value: TaskStatus | 'all') => setFilterStatus(value)}>
                         <SelectTrigger className="w-full md:w-[140px]">
                             <SelectValue placeholder="Status" />
                         </SelectTrigger>
                         <SelectContent>
                             <SelectItem value="all">All Statuses</SelectItem>
                             <SelectItem value="pending">Pending</SelectItem>
                             <SelectItem value="in-progress">In Progress</SelectItem>
                             <SelectItem value="completed">Completed</SelectItem>
                             <SelectItem value="missed">Missed</SelectItem>
                         </SelectContent>
                     </Select>

                     {/* Date Filter */}
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                                  variant={"outline"}
                                  className={cn(
                                      "w-full md:w-[240px] justify-start text-left font-normal",
                                      !filterDateRange.from && !filterDateRange.to && "text-muted-foreground"
                                  )}
                              >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {filterDateRange.from ? (
                                      filterDateRange.to ? (
                                          <>
                                              {format(filterDateRange.from, "LLL dd, y")} - {format(filterDateRange.to, "LLL dd, y")}
                                          </>
                                      ) : (
                                          format(filterDateRange.from, "LLL dd, y")
                                      )
                                  ) : filterDateRange.to ? (
                                      `Before ${format(filterDateRange.to, "LLL dd, y")}`
                                  ) : (
                                      <span>Pick a date range</span>
                                  )}
                                  {(filterDateRange.from || filterDateRange.to) && (
                                      <X className="ml-auto h-4 w-4 opacity-50" onClick={(e) => { e.stopPropagation(); clearDateFilter(); }} />
                                  )}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                             <div className="p-2 flex gap-1">
                                <Button variant={dateFilterPreset === 'today' ? 'default' : 'ghost'} size="sm" onClick={() => handleDatePresetChange('today')}>Today</Button>
                                <Button variant={dateFilterPreset === 'thisWeek' ? 'default' : 'ghost'} size="sm" onClick={() => handleDatePresetChange('thisWeek')}>This Week</Button>
                                <Button variant={dateFilterPreset === 'thisMonth' ? 'default' : 'ghost'} size="sm" onClick={() => handleDatePresetChange('thisMonth')}>This Month</Button>
                                <Button variant={dateFilterPreset === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => handleDatePresetChange('all')}>All Time</Button>
                             </div>
                              <Calendar
                                  initialFocus
                                  mode="range"
                                  defaultMonth={filterDateRange?.from}
                                  selected={filterDateRange}
                                  onSelect={setFilterDateRange}
                                  numberOfMonths={2}
                              />
                          </PopoverContent>
                      </Popover>

                     {/* Sort Options */}
                     <Select value={sortOption} onValueChange={setSortOption}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dueDateAsc">Due Date (Oldest first)</SelectItem>
                            <SelectItem value="dueDateDesc">Due Date (Newest first)</SelectItem>
                            <SelectItem value="priority">Priority</SelectItem>
                            <SelectItem value="createdAt">Date Created</SelectItem>
                        </SelectContent>
                     </Select>
                 </div>
              </div>

              {/* Task List */}
               <div className="space-y-3">
                  {filteredTasks.length > 0 ? (
                      filteredTasks.map(task => (
                          <Card key={task.id} className="flex items-center p-3 gap-3 hover:shadow-md transition-shadow duration-200">
                                {/* Drag Handle (Optional) */}
                                {/* <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab"/> */}
                              <Checkbox
                                  checked={task.status === 'completed'}
                                  onCheckedChange={(checked) => updateTask({ id: task.id, status: checked ? 'completed' : 'pending' })}
                                  aria-label={`Mark task ${task.title} as ${task.status === 'completed' ? 'pending' : 'completed'}`}
                                  id={`task-${task.id}`}
                              />
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                  <Label htmlFor={`task-${task.id}`} className="font-medium cursor-pointer col-span-1 md:col-span-1 truncate">
                                    {task.title}
                                  </Label>
                                 <div className="text-sm text-muted-foreground flex items-center gap-2 col-span-1 md:col-span-1">
                                      {getStatusIcon(task.status)}
                                      <span className="capitalize">{task.status.replace('-', ' ')}</span>
                                      {task.dueDate && (
                                            <>
                                            <CalendarDays className="h-4 w-4" />
                                            <span>{format(parseISO(task.dueDate), 'MMM d, yyyy')}</span>
                                            {task.dueTime && <><Clock className="h-4 w-4" /><span>{task.dueTime}</span></>}
                                            </>
                                      )}
                                 </div>
                                 <div className="flex items-center justify-start md:justify-end gap-2 col-span-1 md:col-span-1">
                                     <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", getPriorityClasses(task.priority))}>
                                          {task.priority}
                                      </span>
                                 </div>
                              </div>
                              <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTask(task)}>
                                      <Edit size={16} />
                                      <span className="sr-only">Edit Task</span>
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTaskToDelete(task)}>
                                      <Trash2 size={16} />
                                       <span className="sr-only">Delete Task</span>
                                  </Button>
                              </div>
                          </Card>
                      ))
                  ) : (
                      <div className="text-center py-10 text-muted-foreground">
                          <ListFilter className="mx-auto h-12 w-12 mb-4" />
                           <p>No tasks found matching your criteria.</p>
                           <p>Try adjusting your filters or add a new task!</p>
                      </div>
                  )}
              </div>
          </CardContent>
      </Card>


      {/* Add/Edit Task Modal */}
       <Dialog open={isAddTaskModalOpen} onOpenChange={setIsAddTaskModalOpen}>
           <DialogContent className="sm:max-w-[480px]">
               <form onSubmit={handleModalSubmit}>
                   <DialogHeader>
                       <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                       <DialogDescription>
                           {editingTask ? 'Update the details of your task.' : 'Fill in the details for your new task.'}
                       </DialogDescription>
                   </DialogHeader>
                   <div className="grid gap-4 py-4">
                       <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="title" className="text-right">Title*</Label>
                           <Input
                               id="title"
                               name="title"
                               value={modalFormData.title || ''}
                               onChange={handleModalInputChange}
                               className="col-span-3"
                               required
                               maxLength={100} // Add max length
                           />
                       </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="notes" className="text-right">Notes</Label>
                           <Textarea
                               id="notes"
                               name="notes"
                               value={modalFormData.notes || ''}
                               onChange={handleModalInputChange}
                               className="col-span-3"
                               placeholder="Add details or description..."
                               rows={3}
                           />
                       </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "col-span-3 justify-start text-left font-normal",
                                            !modalFormData.dueDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {modalFormData.dueDate ? format(parseISO(modalFormData.dueDate), "PPP") : <span>Pick a date</span>}
                                     </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={modalFormData.dueDate ? parseISO(modalFormData.dueDate) : undefined}
                                        onSelect={handleModalDateChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                       </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="dueTime" className="text-right">Time</Label>
                           <Input
                               id="dueTime"
                               name="dueTime"
                               type="time"
                               value={modalFormData.dueTime || ''}
                               onChange={handleModalInputChange}
                               className="col-span-3"
                           />
                       </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="priority" className="text-right">Priority</Label>
                           <Select
                               name="priority"
                               value={modalFormData.priority || 'medium'}
                               onValueChange={(value: Priority) => handleModalSelectChange('priority', value)}
                           >
                               <SelectTrigger className="col-span-3">
                                   <SelectValue placeholder="Select priority" />
                               </SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="high">High</SelectItem>
                                   <SelectItem value="medium">Medium</SelectItem>
                                   <SelectItem value="low">Low</SelectItem>
                               </SelectContent>
                           </Select>
                       </div>
                       {editingTask && ( // Only show Status when editing
                        <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="status" className="text-right">Status</Label>
                           <Select
                               name="status"
                               value={modalFormData.status || 'pending'}
                               onValueChange={(value: TaskStatus) => handleModalSelectChange('status', value)}
                           >
                               <SelectTrigger className="col-span-3">
                                   <SelectValue placeholder="Select status" />
                               </SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="pending">Pending</SelectItem>
                                   <SelectItem value="in-progress">In Progress</SelectItem>
                                   <SelectItem value="completed">Completed</SelectItem>
                                   <SelectItem value="missed">Missed</SelectItem>
                               </SelectContent>
                           </Select>
                       </div>
                       )}
                       <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="category" className="text-right">Category</Label>
                           <Input
                               id="category"
                               name="category"
                               value={modalFormData.category || ''}
                               onChange={handleModalInputChange}
                               className="col-span-3"
                               placeholder="e.g., Work, Personal"
                           />
                       </div>
                       {/* Future: Add recurrence options here */}
                   </div>
                   <DialogFooter>
                       <DialogClose asChild>
                           <Button type="button" variant="secondary" onClick={() => { setIsAddTaskModalOpen(false); setEditingTask(null); }}>Cancel</Button>
                       </DialogClose>
                       <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editingTask ? 'Save Changes' : 'Add Task'}
                        </Button>
                   </DialogFooter>
               </form>
           </DialogContent>
       </Dialog>

       {/* Delete Confirmation Dialog */}
        <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete the task "{taskToDelete?.title}"? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                     <Button variant="secondary" onClick={() => setTaskToDelete(null)}>Cancel</Button>
                     <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}
