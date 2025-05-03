
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/hooks/use-app-data';
import { Task, TaskStatus, Habit, HabitEntry } from '@/lib/data-schema';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, compareAsc, subMonths, getMonth, getYear, getDate, getDay, isWithinInterval, differenceInDays } from 'date-fns';
import { addMonths } from '@/lib/utils'; // Use the utility function
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, CheckCircle, XCircle, Info, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Added Button


// --- Types ---
type HeatmapData = {
    date: string; // YYYY-MM-DD
    count: number; // Number of tasks completed or habits done
    level: number; // 0-4 intensity level
};

type ChartData = {
    name: string;
    value: number;
};

// --- Helper Functions ---

// Generate data for the heatmap
const generateHeatmapData = (
    items: Task[] | HabitEntry[], // Use Task[] for tasks, HabitEntry[] for habits
    dateRange: { start: Date; end: Date },
    dataType: 'tasks' | 'habits',
    selectedHabitId?: string
): HeatmapData[] => {
    const days = eachDayOfInterval(dateRange);
    const dataMap = new Map<string, number>();

    if (dataType === 'tasks') {
        (items as Task[]).forEach(task => {
            if (task.status === 'completed' && task.completedAt) {
                try {
                    const completedDate = format(parseISO(task.completedAt), 'yyyy-MM-dd');
                    dataMap.set(completedDate, (dataMap.get(completedDate) || 0) + 1);
                } catch (error) {
                    console.error("Error formatting task completedAt date:", task.completedAt, error);
                }
            }
        });
    } else { // habits
         (items as HabitEntry[]).forEach(entry => {
            if (entry.completed && (!selectedHabitId || entry.habitId === selectedHabitId)) {
                try {
                    const entryDate = format(parseISO(entry.date), 'yyyy-MM-dd');
                     dataMap.set(entryDate, (dataMap.get(entryDate) || 0) + 1);
                 } catch (error) {
                    console.error("Error formatting habit entry date:", entry.date, error);
                 }
            }
         });
    }


    const maxCount = Math.max(...Array.from(dataMap.values()), 0);

    return days.map(day => {
        const dateString = format(day, 'yyyy-MM-dd');
        const count = dataMap.get(dateString) || 0;
        let level = 0;
        if (maxCount > 0) {
            const percentage = count / maxCount;
            if (percentage > 0.75) level = 4;
            else if (percentage > 0.5) level = 3;
            else if (percentage > 0.25) level = 2;
            else if (percentage > 0) level = 1;
        }
        return { date: dateString, count, level };
    });
};

// Get color for heatmap level
const getHeatmapColor = (level: number): string => {
    switch (level) {
        case 1: return 'bg-green-100 dark:bg-green-900';
        case 2: return 'bg-green-300 dark:bg-green-700';
        case 3: return 'bg-green-500 dark:bg-green-500';
        case 4: return 'bg-green-700 dark:bg-green-300';
        case 0:
        default: return 'bg-muted/50 dark:bg-muted/30';
    }
};


// --- Components ---

interface HeatmapCalendarProps {
    data: HeatmapData[];
    startDate: Date;
    endDate: Date;
    dataTypeLabel: string; // e.g., "Tasks Completed", "Habits Done"
}

const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({ data, startDate, endDate, dataTypeLabel }) => {
    const weeks: HeatmapData[][] = [];
    let currentWeek: HeatmapData[] = new Array(7).fill(null); // Sunday to Saturday

    const dataMap = useMemo(() => new Map(data.map(d => [d.date, d])), [data]);
    // const days = eachDayOfInterval({ start: startDate, end: endDate }); // Not needed if using displayDays

     // Adjust start date to the beginning of its week (Sunday)
    const displayStartDate = startOfWeek(startDate);
    const displayEndDate = endOfWeek(endDate);
    const displayDays = eachDayOfInterval({ start: displayStartDate, end: displayEndDate });


    displayDays.forEach((day, index) => {
        const dayIndex = getDay(day); // 0 for Sunday, 6 for Saturday
        const dateString = format(day, 'yyyy-MM-dd');

         if (compareAsc(day, startDate) >= 0 && compareAsc(day, endDate) <= 0) {
             currentWeek[dayIndex] = dataMap.get(dateString) || { date: dateString, count: 0, level: 0 };
         } else {
             // Fill days outside the selected range with null or a placeholder
             currentWeek[dayIndex] = { date: dateString, count: -1, level: -1 }; // Use -1 to indicate outside range
         }


        if (dayIndex === 6 || index === displayDays.length - 1) { // End of week or end of days
             weeks.push([...currentWeek]);
             currentWeek = new Array(7).fill(null);
        }
    });


    const monthLabels = useMemo(() => {
        const labels: { label: string; weekIndex: number }[] = [];
        let lastMonth = -1;
        weeks.forEach((week, weekIndex) => {
            const firstDayOfMonth = week.find(d => d && getDate(parseISO(d.date)) === 1);
            if (firstDayOfMonth) {
                const month = getMonth(parseISO(firstDayOfMonth.date));
                 if (month !== lastMonth) {
                     labels.push({ label: format(parseISO(firstDayOfMonth.date), 'MMM'), weekIndex });
                     lastMonth = month;
                 }
            } else if (weekIndex === 0) {
                 // Add label for the first week if it doesn't contain the 1st
                 const firstValidDay = week.find(d => d?.level !== -1);
                 if(firstValidDay) {
                    const month = getMonth(parseISO(firstValidDay.date));
                    labels.push({ label: format(parseISO(firstValidDay.date), 'MMM'), weekIndex });
                    lastMonth = month;
                 }
            }
        });
        return labels;
    }, [weeks]);

    const WEEK_DAYS_SHORT = ["", "M", "", "W", "", "F", ""]; // Show only M, W, F


    return (
         <div className="overflow-x-auto">
            <div className="flex gap-2 items-start">
                {/* Day Labels (Vertical) */}
                <div className="flex flex-col pt-6 pr-1 shrink-0">
                     {WEEK_DAYS_SHORT.map((day, i) => (
                        <div key={i} className="h-3 w-4 text-xs text-muted-foreground text-right mb-[2px]">
                            {day}
                        </div>
                     ))}
                </div>

                 {/* Heatmap Grid */}
                <div className="relative flex-grow min-w-[600px]">
                    {/* Month Labels */}
                    <div className="flex absolute -top-0 left-0 h-6">
                        {monthLabels.map(({ label, weekIndex }) => (
                             <div key={label} className="text-xs text-muted-foreground absolute" style={{ left: `${weekIndex * 14.5}px` }}> {/* Approx week width */}
                                {label}
                            </div>
                        ))}
                    </div>

                    {/* Weeks */}
                    <div className="flex gap-[2px] pt-6">
                         {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[2px]">
                                {week.map((dayData, dayIndex) => {
                                    if (!dayData || dayData.level === -1) { // Handle null or out-of-range days
                                        return <div key={`${weekIndex}-${dayIndex}`} className="h-3 w-3 rounded-sm bg-transparent" />;
                                    }
                                    return (
                                        <Tooltip key={dayData.date}>
                                            <TooltipTrigger asChild>
                                                <div className={cn("h-3 w-3 rounded-sm cursor-default", getHeatmapColor(dayData.level))} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{format(parseISO(dayData.date), 'PPP')}</p>
                                                 <p>{dayData.count} {dataTypeLabel}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
         </div>
    );
};


export default function ProgressPage() {
  const { isInitialized, tasks, habits, habitEntries } = useAppData();
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<'tasks' | 'habits'>('tasks');
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all'); // 'all' or specific habit ID

   const dateRange = useMemo(() => ({
        start: startOfMonth(selectedMonth),
        end: endOfMonth(selectedMonth),
   }), [selectedMonth]);

    const heatmapData = useMemo(() => {
        if (!isInitialized) return [];
        const items = viewMode === 'tasks' ? tasks : habitEntries;
        return generateHeatmapData(items, dateRange, viewMode, selectedHabitId === 'all' ? undefined : selectedHabitId);
   }, [isInitialized, tasks, habitEntries, dateRange, viewMode, selectedHabitId]);


   // Data for Task Status Pie Chart
   const taskStatusData = useMemo(() => {
    if (!isInitialized || viewMode !== 'tasks') return [];
        const statusCounts: Record<TaskStatus, number> = { pending: 0, 'in-progress': 0, completed: 0, missed: 0 };
        const relevantTasks = tasks.filter(task => {
             if (!task.dueDate) return false; // Consider tasks within the month or completed in the month
             try {
                const taskDate = parseISO(task.dueDate);
                const completedDate = task.completedAt ? parseISO(task.completedAt) : null;
                return isWithinInterval(taskDate, dateRange) || (completedDate && isWithinInterval(completedDate, dateRange));
             } catch (error) {
                console.error("Error parsing task date for chart:", task.dueDate, task.completedAt, error);
                return false;
             }
        });

        relevantTasks.forEach(task => {
            statusCounts[task.status]++;
        });

        return Object.entries(statusCounts)
            .filter(([, value]) => value > 0) // Only show statuses with count > 0
            .map(([name, value]) => ({ name: name.replace('-', ' '), value }));
    }, [isInitialized, tasks, dateRange, viewMode]);


   // Data for Habit Completion Chart (if habits view is selected)
   const habitCompletionData = useMemo(() => {
    if (!isInitialized || viewMode !== 'habits') return [];

        const targetHabitId = selectedHabitId === 'all' ? null : selectedHabitId;
        const relevantHabits = targetHabitId ? habits.filter(h => h.id === targetHabitId) : habits;

        return relevantHabits.map(habit => {
             const totalPossibleDays = differenceInDays(dateRange.end, dateRange.start) + 1; // Or calculate based on frequency
             const completedCount = habitEntries.filter(entry => {
                 try {
                    return entry.habitId === habit.id &&
                           entry.completed &&
                           isWithinInterval(parseISO(entry.date), dateRange);
                 } catch (error) {
                    console.error("Error parsing habit entry date for chart:", entry.date, error);
                    return false;
                 }
             }).length;

             // Adjust totalPossibleDays based on frequency (simplified)
             let possibleCompletions = totalPossibleDays;
             if(habit.frequency === 'weekly') possibleCompletions = Math.ceil(totalPossibleDays / 7);
             if(habit.frequency === 'monthly') possibleCompletions = 1; // Assuming once per month


             const completionRate = possibleCompletions > 0 ? Math.round((completedCount / possibleCompletions) * 100) : 0;

             return {
                name: habit.name,
                completed: completedCount,
                possible: possibleCompletions,
                rate: completionRate
             };
        });

    }, [isInitialized, habits, habitEntries, dateRange, viewMode, selectedHabitId]);


    const handlePreviousMonth = () => {
        setSelectedMonth(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
         const nextMonth = startOfMonth(addMonths(selectedMonth, 1));
         if(compareAsc(nextMonth, startOfMonth(new Date())) <= 0) { // Prevent going to future months
            setSelectedMonth(nextMonth);
         }
    };

     const handleSetCurrentMonth = () => {
        setSelectedMonth(startOfMonth(new Date()));
    };


  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const PIE_COLORS: Record<string, string> = {
      pending: '#facc15', // yellow-500
      'in progress': '#3b82f6', // blue-500
      completed: '#22c55e', // green-500
      missed: '#ef4444', // red-500
  };


  return (
    <TooltipProvider>
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold">Progress Overview</CardTitle>
                             <CardDescription>Visualize your task completion and habit consistency.</CardDescription>
                        </div>
                         <div className="flex flex-wrap gap-2">
                             <Select value={viewMode} onValueChange={(value: 'tasks' | 'habits') => setViewMode(value)}>
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <SelectValue placeholder="View Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tasks">Tasks</SelectItem>
                                    <SelectItem value="habits">Habits</SelectItem>
                                </SelectContent>
                            </Select>
                            {viewMode === 'habits' && (
                                <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Select Habit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Habits</SelectItem>
                                        {habits.map(habit => (
                                            <SelectItem key={habit.id} value={habit.id}>{habit.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                         </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Heatmap Card */}
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                             <Calendar className="h-5 w-5" />
                             {viewMode === 'tasks' ? 'Task Completion Heatmap' : 'Habit Consistency Heatmap'}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>&lt;</Button>
                            <Button variant="outline" size="sm" onClick={handleSetCurrentMonth} className="hidden sm:inline-flex">Today</Button>
                             <span className="font-medium text-sm w-28 text-center">{format(selectedMonth, 'MMMM yyyy')}</span>
                            <Button variant="outline" size="sm" onClick={handleNextMonth} disabled={compareAsc(addMonths(selectedMonth, 1), startOfMonth(new Date())) > 0}>&gt;</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <HeatmapCalendar
                        data={heatmapData}
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        dataTypeLabel={viewMode === 'tasks' ? 'Tasks Completed' : (selectedHabitId === 'all' ? 'Habits Done' : 'Habit Done')}
                    />
                     <div className="flex justify-end items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Less</span>
                        <div className={cn("h-3 w-3 rounded-sm", getHeatmapColor(0))} />
                        <div className={cn("h-3 w-3 rounded-sm", getHeatmapColor(1))} />
                        <div className={cn("h-3 w-3 rounded-sm", getHeatmapColor(2))} />
                        <div className={cn("h-3 w-3 rounded-sm", getHeatmapColor(3))} />
                        <div className={cn("h-3 w-3 rounded-sm", getHeatmapColor(4))} />
                        <span>More</span>
                    </div>
                </CardContent>
            </Card>

             {/* Additional Charts */}
             <div className="grid gap-6 md:grid-cols-2">
                 {/* Task Status Distribution */}
                {viewMode === 'tasks' && taskStatusData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Task Status ({format(selectedMonth, 'MMMM')})</CardTitle>
                            <CardDescription>Distribution of task statuses within the selected month.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                     <Pie
                                        data={taskStatusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        className="capitalize"
                                    >
                                        {taskStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name.toLowerCase()] || '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip formatter={(value) => [`${value} tasks`, null]}/>
                                     {/* <Legend /> */}
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Habit Completion Rate */}
                {viewMode === 'habits' && habitCompletionData.length > 0 && (
                    <Card className={cn(viewMode === 'tasks' && taskStatusData.length === 0 ? "md:col-span-2" : "")}>
                        <CardHeader>
                            <CardTitle>Habit Completion ({format(selectedMonth, 'MMMM')})</CardTitle>
                             <CardDescription>Completion rates for selected habits in the month.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={habitCompletionData} layout="vertical" margin={{ right: 30 }}>
                                     <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 100]} unit="%" />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }}/>
                                    <ChartTooltip formatter={(value, name) => {
                                         if (name === 'rate') return [`${value}% completion`, null];
                                         return [value, name]; // Default tooltip for other potential bars
                                    }}/>
                                     <Legend />
                                     <Bar dataKey="rate" name="Completion Rate" fill="var(--color-chart-2)" background={{ fill: 'hsl(var(--muted))' }} unit="%" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                 {/* Placeholder if no charts are available */}
                 {viewMode === 'tasks' && taskStatusData.length === 0 && (
                      <Card className="md:col-span-2 flex items-center justify-center h-[300px]">
                        <CardContent className="text-center text-muted-foreground">
                            <Info className="mx-auto h-10 w-10 mb-2"/>
                            No task data available for {format(selectedMonth, 'MMMM yyyy')} to generate charts.
                        </CardContent>
                    </Card>
                 )}
                 {viewMode === 'habits' && habitCompletionData.length === 0 && (
                     <Card className="md:col-span-2 flex items-center justify-center h-[300px]">
                        <CardContent className="text-center text-muted-foreground">
                             <Info className="mx-auto h-10 w-10 mb-2"/>
                             No habit data available for {format(selectedMonth, 'MMMM yyyy')} to generate charts. Add some habits and track them!
                        </CardContent>
                    </Card>
                 )}
            </div>
        </div>
    </TooltipProvider>
  );
}
