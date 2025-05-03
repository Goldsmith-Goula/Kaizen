
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, Target, Wallet, Plus, Edit, Trash2, Calendar, Clock, BarChart3, Loader2 } from "lucide-react";
import Image from 'next/image';
import { useAppData } from "@/hooks/use-app-data";
import { Task, TaskStatus, Priority } from "@/lib/data-schema";
import { format, parseISO, differenceInDays, isToday, compareAsc } from 'date-fns';
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea

// Helper function to format duration (example)
const formatDuration = (duration: string | undefined): string => {
  if (!duration) return '';
  // Add more sophisticated duration parsing/formatting if needed
  return duration;
};

// Helper function to format date/time (example)
const formatDateTime = (date?: string, time?: string): string => {
    if (!date) return "No due date";
    const parsedDate = parseISO(date);
    let formatted = format(parsedDate, 'MMM d');
    if (time) {
        // Basic time formatting, assumes HH:mm
        formatted += `, ${time}`;
    }
    return formatted;
}

// Helper function to get task status color
const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case "completed": return "text-green-600 dark:text-green-400";
    case "in-progress": return "text-blue-600 dark:text-blue-400";
    case "missed": return "text-red-600 dark:text-red-400";
    case "pending":
    default: return "text-yellow-600 dark:text-yellow-400";
  }
}


export default function Dashboard() {
  const {
      isInitialized,
      tasks,
      updateTask,
      deleteTask,
      financialGoals,
      transactions,
      habits,
      habitEntries,
      settings
   } = useAppData();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Derived state for top 3 priority tasks for today
  const topPriorityTasks = useMemo(() => {
    if (!isInitialized) return [];
    return tasks
      .filter(task => task.dueDate && isToday(parseISO(task.dueDate)) && task.status !== 'completed' && task.status !== 'missed')
      .sort((a, b) => {
        // Sort by priority (high > medium > low), then by time if available
        const priorityOrder: Record<Priority, number> = { high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.dueTime && b.dueTime) {
          return a.dueTime.localeCompare(b.dueTime);
        }
        return 0; // Keep original order if priorities and times are the same or time missing
      })
      .slice(0, 3);
  }, [tasks, isInitialized]);


  // Derived state for progress summary
  const progressSummary = useMemo(() => {
    if (!isInitialized || tasks.length === 0) return { tasks: 0, goals: 0, finances: 0 };

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalGoals = financialGoals.length; // Example: using financial goals
    const completedGoals = financialGoals.filter(g => g.currentAmount >= g.targetAmount).length;
    const goalProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // Example Finance Progress: Savings goal achievement from budgets
    // This is a simplified example. Real calculation might be more complex.
    const latestBudget = settings?.budgets?.sort((a, b) => compareAsc(parseISO(b.createdAt), parseISO(a.createdAt)))[0];
    let financeProgress = 0;
    if (latestBudget && latestBudget.savingsGoal > 0) {
        const relevantTransactions = transactions.filter(t => t.budgetId === latestBudget.id);
        const totalIncome = relevantTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = relevantTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const currentSavings = totalIncome - totalExpenses;
        financeProgress = Math.min(100, Math.max(0, Math.round((currentSavings / latestBudget.savingsGoal) * 100)));
    }


    return {
      tasks: taskProgress,
      goals: goalProgress,
      finances: financeProgress,
    };
  }, [tasks, financialGoals, transactions, settings?.budgets, isInitialized]); // Added settings?.budgets dependency

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return; // Basic validation

    setIsAddingTask(true);
    try {
        updateTask({
            title: newTaskTitle,
            priority: 'medium', // Default priority
            status: 'pending',
            dueDate: newTaskDate || undefined, // Store as YYYY-MM-DD
            dueTime: newTaskTime || undefined,
            isRecurring: false,
            // createdAt and updatedAt will be set by updateTask
        });
        // Reset form
        setNewTaskTitle("");
        setNewTaskDate("");
        setNewTaskTime("");
    } catch (error) {
        console.error("Failed to add task:", error);
        // Optionally show a toast notification for the error
    } finally {
        setIsAddingTask(false);
    }
  };

  const handleUpdateTask = (updatedTaskData: Partial<Omit<Task, 'createdAt' | 'updatedAt'>>) => {
     if (!editingTask) return;
     updateTask({ ...editingTask, ...updatedTaskData });
     setEditingTask(null); // Close the dialog
  }

  const handleDeleteTask = (id: string) => {
    // Optional: Add confirmation dialog here
    deleteTask(id);
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
  };

  const motivationalQuote = { // Keep static for now
    quote: "The journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
  };


  if (!isInitialized) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Today's Focus */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Today's Focus</CardTitle>
          <CardDescription>Your top 3 priorities for today</CardDescription>
        </CardHeader>
        <CardContent>
           {topPriorityTasks.length > 0 ? (
              <ul className="space-y-4">
                {topPriorityTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0"> {/* Added flex-1 and min-w-0 */}
                      {/* Checkbox to mark as complete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${getStatusColor(task.status)}`}
                        onClick={() => updateTask({ id: task.id, status: task.status === 'completed' ? 'pending' : 'completed' })}
                        aria-label={task.status === 'completed' ? 'Mark task as pending' : 'Mark task as complete'}
                      >
                         <CheckSquare size={20} />
                      </Button>
                      <div className="flex-1 min-w-0"> {/* Added flex-1 and min-w-0 */}
                        <p className="font-medium truncate">{task.title}</p> {/* Added truncate */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap"> {/* Added flex-wrap */}
                          {task.dueTime && <><Clock size={14}/> <span>{task.dueTime}</span></>}
                          {task.duration && <><Calendar size={14}/> <span>{formatDuration(task.duration)}</span></>}
                          <span className={`capitalize font-semibold ${
                              task.priority === 'high' ? 'text-destructive' : task.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'
                          }`}>
                              {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2"> {/* Added flex-shrink-0 and ml-2 */}
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(task)}>
                          <Edit size={16} />
                           <span className="sr-only">Edit Task</span>
                        </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 size={16} />
                           <span className="sr-only">Delete Task</span>
                        </Button>
                     </div>
                  </li>
                ))}
              </ul>
            ) : (
                <p className="text-muted-foreground">No priority tasks scheduled for today. Add some!</p>
            )}
        </CardContent>
      </Card>

      {/* Quick Add Widget */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Add Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
              placeholder="Enter task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              aria-label="New task title"
          />
          <div className="flex gap-2">
            <Input
                type="date"
                className="flex-1"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                aria-label="New task due date"
            />
            <Input
                type="time"
                className="flex-1"
                value={newTaskTime}
                onChange={(e) => setNewTaskTime(e.target.value)}
                aria-label="New task due time"
            />
          </div>
          <Button className="w-full" onClick={handleAddTask} disabled={isAddingTask}>
            {isAddingTask ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Plus className="mr-2 h-4 w-4" />
            )}
             Add Task
          </Button>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="text-primary" size={18} />
              <span>Tasks</span>
            </div>
            <span className="font-medium">{progressSummary.tasks}%</span>
          </div>
          <Progress value={progressSummary.tasks} aria-label={`${progressSummary.tasks}% tasks completed`} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="text-primary" size={18} />
              <span>Goals</span>
            </div>
            <span className="font-medium">{progressSummary.goals}%</span>
          </div>
          <Progress value={progressSummary.goals} aria-label={`${progressSummary.goals}% goals achieved`} />

          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
              <Wallet className="text-primary" size={18} />
              <span>Finances</span>
            </div>
            <span className="font-medium">{progressSummary.finances}%</span>
          </div>
          <Progress value={progressSummary.finances} aria-label={`${progressSummary.finances}% financial goals met`} />
        </CardContent>
      </Card>

      {/* Motivational Element */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-accent text-primary-foreground">
         <Image
          src="https://picsum.photos/600/400"
          alt="Motivational Background"
          fill={true}
          objectFit="cover"
          className="opacity-20"
          data-ai-hint="abstract nature"
          priority // Add priority for potential LCP improvement
        />
        <CardHeader className="relative z-10">
          <CardTitle>Daily Inspiration</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <blockquote className="text-lg italic">
            "{motivationalQuote.quote}"
          </blockquote>
          <p className="text-right mt-2 text-sm">- {motivationalQuote.author}</p>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
       <Card>
         <CardHeader>
           <CardTitle>Quick Navigation</CardTitle>
         </CardHeader>
         <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start" asChild>
                <Link href="/tasks"><Calendar className="mr-2 h-4 w-4" /> Tasks</Link>
            </Button>
            {/* Placeholder for Goals page link */}
            <Button variant="outline" className="justify-start" disabled>
                <Target className="mr-2 h-4 w-4" /> Goals
            </Button>
            <Button variant="outline" className="justify-start" asChild>
                <Link href="/finance"><Wallet className="mr-2 h-4 w-4" /> Finances</Link>
            </Button>
             <Button variant="outline" className="justify-start" asChild>
                <Link href="/progress"><BarChart3 className="mr-2 h-4 w-4" /> Progress</Link>
            </Button>
         </CardContent>
       </Card>

       {/* Edit Task Dialog */}
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
            <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>Make changes to your task here. Click save when you're done.</DialogDescription>
            </DialogHeader>
            {editingTask && ( // Ensure editingTask is not null
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">Title</Label>
                    <Input
                        id="title"
                        defaultValue={editingTask.title}
                        className="col-span-3"
                        onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                    <Input
                        id="dueDate"
                        type="date"
                        defaultValue={editingTask.dueDate ? format(parseISO(editingTask.dueDate), 'yyyy-MM-dd') : ''}
                        className="col-span-3"
                        onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value })}
                    />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dueTime" className="text-right">Time</Label>
                    <Input
                        id="dueTime"
                        type="time"
                        defaultValue={editingTask.dueTime || ''}
                        className="col-span-3"
                        onChange={(e) => setEditingTask({...editingTask, dueTime: e.target.value})}
                    />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="priority" className="text-right">Priority</Label>
                     <Select
                        defaultValue={editingTask.priority}
                        onValueChange={(value: Priority) => setEditingTask({...editingTask, priority: value})}
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
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">Status</Label>
                     <Select
                         defaultValue={editingTask.status}
                         onValueChange={(value: TaskStatus) => setEditingTask({...editingTask, status: value})}
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
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notes" className="text-right">Notes</Label>
                    <Textarea
                        id="notes"
                        defaultValue={editingTask.notes || ''}
                        className="col-span-3"
                        onChange={(e) => setEditingTask({...editingTask, notes: e.target.value})}
                        placeholder="Add any relevant notes..."
                    />
                </div>
                {/* Add fields for duration, category, recurrence etc. as needed */}
                </div>
            )}
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={() => editingTask && handleUpdateTask(editingTask)}>Save changes</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}
