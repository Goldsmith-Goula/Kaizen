
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Flame, CalendarDays, CheckCircle2, XCircle, Loader2, Info, AlertTriangle, TrendingUp, Repeat, Check, X } from 'lucide-react'; // Added Check and X
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { format, parseISO, isSameDay, subDays, addDays, eachDayOfInterval, differenceInDays, compareAsc, startOfDay } from 'date-fns';
import { useAppData } from '@/hooks/use-app-data';
import { Habit, HabitEntry, HabitFrequency, HabitStreak } from '@/lib/data-schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Streak Calculation Logic ---
const calculateStreaks = (habitId: string, entries: HabitEntry[]): { currentStreak: number, longestStreak: number, lastCompletedDate?: string } => {
    if (!entries || entries.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    const completedDates = entries
        .filter(entry => entry.habitId === habitId && entry.completed)
        .map(entry => startOfDay(parseISO(entry.date)))
        .sort(compareAsc); // Ensure dates are sorted

    if (completedDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(today, 1));

    // Calculate current streak
    // Check if completed today or yesterday to continue the streak
    let lastDate = completedDates[completedDates.length - 1];
    if (isSameDay(lastDate, today) || isSameDay(lastDate, yesterday)) {
        currentStreak = 1;
        for (let i = completedDates.length - 2; i >= 0; i--) {
            const currentDate = completedDates[i];
            const expectedPreviousDate = startOfDay(subDays(lastDate, 1));
            if (isSameDay(currentDate, expectedPreviousDate)) {
                currentStreak++;
                lastDate = currentDate;
            } else {
                break; // Streak broken
            }
        }
    }


    // Calculate longest streak
    if (completedDates.length > 0) {
        let currentLongestInternal = 1;
        longestStreak = 1;
        for (let i = 1; i < completedDates.length; i++) {
            const currentDate = completedDates[i];
            const previousDate = completedDates[i - 1];
            const expectedPreviousDate = startOfDay(subDays(currentDate, 1));

            if (isSameDay(previousDate, expectedPreviousDate)) {
                currentLongestInternal++;
            } else {
                 currentLongestInternal = 1; // Reset streak
            }
            longestStreak = Math.max(longestStreak, currentLongestInternal);
        }
    }


    return {
        currentStreak,
        longestStreak,
        lastCompletedDate: completedDates.length > 0 ? format(completedDates[completedDates.length - 1], 'yyyy-MM-dd') : undefined
    };
};


// --- Habit Card Component ---
interface HabitCardProps {
  habit: Habit;
  entries: HabitEntry[];
  onToggle: (habitId: string, date: string, completed: boolean) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  displayDays?: number; // Number of past days to show in the grid
}

const HabitCard: React.FC<HabitCardProps> = ({ habit, entries, onToggle, onEdit, onDelete, displayDays = 7 }) => {
    const today = startOfDay(new Date());
    const startDate = startOfDay(subDays(today, displayDays - 1));
    const dateRange = eachDayOfInterval({ start: startDate, end: today });

    const habitEntriesMap = useMemo(() => {
        const map = new Map<string, HabitEntry>();
        entries
            .filter(e => e.habitId === habit.id)
            .forEach(e => map.set(format(parseISO(e.date), 'yyyy-MM-dd'), e));
        return map;
    }, [entries, habit.id]);

    const { currentStreak, longestStreak } = useMemo(() => calculateStreaks(habit.id, entries), [habit.id, entries]);


    const handleToggle = (date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        const existingEntry = habitEntriesMap.get(dateString);
        onToggle(habit.id, dateString, !existingEntry?.completed);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <div className="flex-1 mr-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" /> {habit.name}
                    </CardTitle>
                     {habit.goal && <CardDescription className="text-sm text-muted-foreground mt-1">{habit.goal}</CardDescription>}
                 </div>
                 <div className="flex items-center gap-1">
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(habit)}>
                         <Edit size={16} />
                         <span className="sr-only">Edit Habit</span>
                     </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(habit)}>
                         <Trash2 size={16} />
                         <span className="sr-only">Delete Habit</span>
                     </Button>
                 </div>
             </CardHeader>
             <CardContent>
                 <div className="flex items-center justify-between mb-4 text-sm">
                     <div className="flex items-center gap-1 text-muted-foreground">
                        <Repeat className="h-4 w-4"/>
                        <span className="capitalize">{habit.frequency}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                                <Flame className="h-4 w-4 text-orange-500"/>
                                <span className="font-medium">{currentStreak}</span>
                            </TooltipTrigger>
                            <TooltipContent>Current Streak</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                             <TooltipTrigger className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4 text-blue-500"/>
                                <span className="font-medium">{longestStreak}</span>
                            </TooltipTrigger>
                            <TooltipContent>Longest Streak</TooltipContent>
                         </Tooltip>
                     </div>
                 </div>

                 {/* Daily Check-in Grid */}
                 <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {dateRange.map(date => {
                        const dateString = format(date, 'yyyy-MM-dd');
                        const entry = habitEntriesMap.get(dateString);
                        const isCompleted = entry?.completed ?? false;
                        const isFuture = compareAsc(date, today) > 0;

                        return (
                            <Tooltip key={dateString}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className={cn(
                                            "h-9 w-9 md:h-10 md:w-10 transition-colors relative", // Added relative
                                            isCompleted ? "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800" : "hover:bg-muted",
                                            isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                                            isSameDay(date, today) && "ring-2 ring-primary ring-offset-1" // Use isSameDay for today check
                                        )}
                                        onClick={() => !isFuture && handleToggle(date)}
                                        disabled={isFuture}
                                        aria-label={`Mark habit ${habit.name} as ${isCompleted ? 'incomplete' : 'complete'} for ${format(date, 'MMM d')}`}
                                    >
                                        <span className="text-xs font-medium">{format(date, 'd')}</span>
                                        {/* Optional: Add checkmark inside */}
                                        {isCompleted && <Check className="h-3 w-3 absolute bottom-1 right-1 text-green-600 dark:text-green-400"/>}
                                        {!isCompleted && !isFuture && <X className="h-3 w-3 absolute bottom-1 right-1 text-destructive/50 opacity-0 group-hover:opacity-100 transition-opacity"/>}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                     <p>{format(date, 'EEEE, MMM d')}</p>
                                     <p>{isCompleted ? 'Completed' : 'Incomplete'}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
                 <div className="flex justify-between mt-1 text-xs text-muted-foreground px-1">
                     <span>{format(startDate, 'MMM d')}</span>
                     <span>{format(today, 'MMM d')}</span>
                 </div>
             </CardContent>
        </Card>
    );
}


// --- Habits Page Component ---
export default function HabitsPage() {
  const { isInitialized, habits, habitEntries, updateHabit, deleteHabit, updateHabitEntry, deleteHabitEntry } = useAppData(); // Added deleteHabitEntry
  const [isAddHabitModalOpen, setIsAddHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [modalFormData, setModalFormData] = useState<Partial<Habit>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingHabit) {
      setModalFormData(editingHabit);
      setIsAddHabitModalOpen(true);
    } else {
      setModalFormData({ frequency: 'daily' }); // Default frequency
    }
  }, [editingHabit]);

  const handleOpenAddHabitModal = () => {
    setEditingHabit(null);
    setModalFormData({ frequency: 'daily' });
    setIsAddHabitModalOpen(true);
  };

  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModalFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleModalSelectChange = (name: keyof Habit, value: string) => {
    setModalFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFormData.name?.trim()) {
      alert("Habit name cannot be empty."); // Replace with toaster
      return;
    }
    setIsSubmitting(true);
    try {
      await updateHabit({
        id: editingHabit?.id,
        name: modalFormData.name || '', // Ensure name is always provided
        goal: modalFormData.goal,
        frequency: modalFormData.frequency || 'daily', // Ensure frequency has a default
      });
      setIsAddHabitModalOpen(false);
      setEditingHabit(null);
      setModalFormData({});
    } catch (error) {
      console.error("Failed to save habit:", error);
      // Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (habitToDelete) {
        setIsSubmitting(true); // Indicate processing
        try {
            // Find and delete all associated entries first
            const entriesToDelete = habitEntries.filter(e => e.habitId === habitToDelete.id);
            // Using Promise.all to delete entries in parallel (or sequence if needed)
            await Promise.all(entriesToDelete.map(e => deleteHabitEntry(e.id)));

            // Then delete the habit itself
            await deleteHabit(habitToDelete.id);

            setHabitToDelete(null); // Close the dialog
        } catch (error) {
            console.error("Failed to delete habit and its entries:", error);
            // Show error toast
        } finally {
            setIsSubmitting(false);
        }
    }
  };


  const handleToggleHabitEntry = (habitId: string, date: string, completed: boolean) => {
        const isoDateString = format(parseISO(date), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"); // Ensure full ISO string
        const existingEntry = habitEntries.find(e => e.habitId === habitId && isSameDay(parseISO(e.date), parseISO(date))); // Find by date, ignore time

        updateHabitEntry({
            id: existingEntry?.id, // Pass ID if exists to update, otherwise creates new
            habitId,
            date: isoDateString, // Store ISO string
            completed,
        });
   };


  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }


  return (
     <TooltipProvider>
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-2xl font-bold">Habit Tracker</CardTitle>
                    <Button onClick={handleOpenAddHabitModal}>
                        <Plus className="mr-2 h-4 w-4" /> Add Habit
                    </Button>
                </CardHeader>
                 <CardContent>
                     {habits.length > 0 ? (
                         <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                             {habits.map(habit => (
                                <HabitCard
                                    key={habit.id}
                                    habit={habit}
                                    entries={habitEntries}
                                    onToggle={handleToggleHabitEntry}
                                    onEdit={setEditingHabit}
                                    onDelete={setHabitToDelete}
                                    displayDays={7} // Show last 7 days
                                />
                             ))}
                         </div>
                     ) : (
                         <div className="text-center py-10 text-muted-foreground">
                             <Flame className="mx-auto h-12 w-12 mb-4 text-orange-400" />
                             <p>No habits yet. Start building positive routines!</p>
                             <Button className="mt-4" onClick={handleOpenAddHabitModal}>
                                 <Plus className="mr-2 h-4 w-4" /> Add Your First Habit
                             </Button>
                         </div>
                     )}
                 </CardContent>
            </Card>

             {/* Add/Edit Habit Modal */}
             <Dialog open={isAddHabitModalOpen} onOpenChange={(open) => {if(!open){setEditingHabit(null); setIsAddHabitModalOpen(false);}}}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleModalSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingHabit ? 'Edit Habit' : 'Add New Habit'}</DialogTitle>
                            <DialogDescription>
                                {editingHabit ? 'Update the details of your habit.' : 'Define a new habit to track.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name*</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={modalFormData.name || ''}
                                    onChange={handleModalInputChange}
                                    className="col-span-3"
                                    required
                                    maxLength={50}
                                />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="goal" className="text-right">Goal</Label>
                                <Input
                                    id="goal"
                                    name="goal"
                                    value={modalFormData.goal || ''}
                                    onChange={handleModalInputChange}
                                    className="col-span-3"
                                    placeholder="(Optional) e.g., Drink 8 glasses of water"
                                    maxLength={100}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="frequency" className="text-right">Frequency</Label>
                                <Select
                                    name="frequency"
                                    value={modalFormData.frequency || 'daily'}
                                    onValueChange={(value: HabitFrequency) => handleModalSelectChange('frequency', value)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        {/* Could add more options like specific days */}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" onClick={() => { setIsAddHabitModalOpen(false); setEditingHabit(null); }}>Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {editingHabit ? 'Save Changes' : 'Add Habit'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             {/* Delete Confirmation Dialog */}
            <Dialog open={!!habitToDelete} onOpenChange={(open) => !open && setHabitToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the habit "{habitToDelete?.name}"? All associated tracking data will also be removed. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setHabitToDelete(null)} disabled={isSubmitting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete Habit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </TooltipProvider>
  );
}
