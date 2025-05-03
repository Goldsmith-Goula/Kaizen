
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppData } from '@/hooks/use-app-data';
import { Task, TaskStatus, Habit, HabitEntry } from '@/lib/data-schema';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, isWithinInterval, compareAsc, differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Minus, CalendarCheck2, Repeat } from 'lucide-react';

// --- Types ---
interface ReportData {
    periodLabel: string;
    tasksCompleted: number;
    tasksTotal: number;
    tasksCompletionRate: number;
    habitStats: {
        [habitId: string]: {
            name: string;
            completed: number;
            possible: number; // Based on frequency and period length
            consistencyRate: number;
        }
    };
}

// --- Helper Functions ---
const calculateReportData = (
    period: { start: Date; end: Date },
    tasks: Task[],
    habits: Habit[],
    habitEntries: HabitEntry[],
    periodLabel: string
): ReportData => {

    // Task calculations
    const tasksInPeriod = tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = parseISO(task.dueDate);
        // Include tasks due in the period or completed in the period
        return isWithinInterval(dueDate, period) || (task.completedAt && isWithinInterval(parseISO(task.completedAt), period));
    });
    const tasksCompleted = tasksInPeriod.filter(t => t.status === 'completed').length;
    const tasksTotal = tasksInPeriod.length;
    const tasksCompletionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

    // Habit calculations
    const habitStats: ReportData['habitStats'] = {};
    const periodLengthDays = differenceInDays(period.end, period.start) + 1;

    habits.forEach(habit => {
        let possibleCompletions = 0;
        switch (habit.frequency) {
            case 'daily': possibleCompletions = periodLengthDays; break;
            case 'weekly': possibleCompletions = Math.ceil(periodLengthDays / 7); break; // Simplified
            case 'monthly': possibleCompletions = 1; break; // Simplified
            default: possibleCompletions = periodLengthDays; // Default to daily if unknown
        }

        const completedCount = habitEntries.filter(entry =>
            entry.habitId === habit.id &&
            entry.completed &&
            isWithinInterval(parseISO(entry.date), period)
        ).length;

        const consistencyRate = possibleCompletions > 0 ? Math.round((completedCount / possibleCompletions) * 100) : 0;

        habitStats[habit.id] = {
            name: habit.name,
            completed: completedCount,
            possible: possibleCompletions,
            consistencyRate: consistencyRate,
        };
    });

    return {
        periodLabel,
        tasksCompleted,
        tasksTotal,
        tasksCompletionRate,
        habitStats,
    };
};

// --- Components ---

interface ReportCardProps {
    title: string;
    currentData: ReportData;
    previousData?: ReportData; // For comparison
}

const ReportCard: React.FC<ReportCardProps> = ({ title, currentData, previousData }) => {

    const taskRateChange = previousData ? currentData.tasksCompletionRate - previousData.tasksCompletionRate : null;
    const habitConsistencyAvg = useMemo(() => {
         const rates = Object.values(currentData.habitStats).map(s => s.consistencyRate);
         return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    }, [currentData.habitStats]);
     const prevHabitConsistencyAvg = useMemo(() => {
        if (!previousData) return null;
        const rates = Object.values(previousData.habitStats).map(s => s.consistencyRate);
        return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
     }, [previousData]);
     const habitRateChange = prevHabitConsistencyAvg !== null ? habitConsistencyAvg - prevHabitConsistencyAvg : null;


     const taskChartData = [
        { name: 'Completed', value: currentData.tasksCompleted, fill: 'var(--color-chart-2)' },
        { name: 'Missed/Pending', value: currentData.tasksTotal - currentData.tasksCompleted, fill: 'var(--color-chart-5)' },
     ];

     const habitChartData = Object.values(currentData.habitStats).map(stat => ({
         name: stat.name,
         consistency: stat.consistencyRate,
         fill: 'var(--color-chart-3)', // Use consistent color or map based on habit
     }));


    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{currentData.periodLabel}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                 {/* Task Summary */}
                 <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><CalendarCheck2 className="h-5 w-5"/> Task Summary</h3>
                    <div className="flex justify-between items-center p-3 bg-secondary rounded">
                         <span>Completion Rate:</span>
                        <div className="flex items-center gap-2">
                             <span className="font-bold text-lg">{currentData.tasksCompletionRate}%</span>
                             {taskRateChange !== null && (
                                <span className={`flex items-center text-xs font-medium ${taskRateChange > 0 ? 'text-green-600' : taskRateChange < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {taskRateChange > 0 ? <TrendingUp className="h-4 w-4"/> : taskRateChange < 0 ? <TrendingDown className="h-4 w-4"/> : <Minus className="h-4 w-4"/>}
                                    {taskRateChange.toFixed(0)}%
                                 </span>
                             )}
                         </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{currentData.tasksCompleted} out of {currentData.tasksTotal} tasks completed.</p>
                    {currentData.tasksTotal > 0 && (
                        <ResponsiveContainer width="100%" height={100}>
                             <PieChart>
                                <Pie data={taskChartData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={2} startAngle={90} endAngle={-270}>
                                    {taskChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} tasks`, null]} />
                             </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Habit Summary */}
                 <div className="space-y-4">
                     <h3 className="font-semibold flex items-center gap-2"><Repeat className="h-5 w-5"/> Habit Summary</h3>
                      <div className="flex justify-between items-center p-3 bg-secondary rounded">
                         <span>Avg. Consistency:</span>
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{habitConsistencyAvg.toFixed(0)}%</span>
                            {habitRateChange !== null && (
                                <span className={`flex items-center text-xs font-medium ${habitRateChange > 0 ? 'text-green-600' : habitRateChange < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {habitRateChange > 0 ? <TrendingUp className="h-4 w-4"/> : habitRateChange < 0 ? <TrendingDown className="h-4 w-4"/> : <Minus className="h-4 w-4"/>}
                                    {habitRateChange.toFixed(0)}%
                                 </span>
                             )}
                        </div>
                     </div>
                     {habitChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={habitChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                 <XAxis type="number" domain={[0, 100]} unit="%"/>
                                 <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 10}}/>
                                <Tooltip formatter={(value) => [`${value}% consistent`, null]}/>
                                 <Bar dataKey="consistency" name="Consistency" fill="var(--color-chart-3)" barSize={15} radius={[0, 4, 4, 0]}/>
                             </BarChart>
                        </ResponsiveContainer>
                     ) : (
                        <p className="text-sm text-muted-foreground">No habits tracked in this period.</p>
                     )}
                </div>

            </CardContent>
        </Card>
    );
}


export default function ReportsPage() {
    const { isInitialized, tasks, habits, habitEntries } = useAppData();

    // Calculate data for current and previous periods
    const now = new Date();

    // Weekly Data
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const weeklyReport = useMemo(() => {
        if (!isInitialized) return null;
        return calculateReportData(
            { start: currentWeekStart, end: currentWeekEnd },
            tasks, habits, habitEntries,
            `Week: ${format(currentWeekStart, 'MMM d')} - ${format(currentWeekEnd, 'MMM d, yyyy')}`
        );
    }, [isInitialized, tasks, habits, habitEntries, currentWeekStart, currentWeekEnd]);

    const previousWeeklyReport = useMemo(() => {
        if (!isInitialized) return null;
         return calculateReportData(
            { start: previousWeekStart, end: previousWeekEnd },
             tasks, habits, habitEntries,
             `Week: ${format(previousWeekStart, 'MMM d')} - ${format(previousWeekEnd, 'MMM d, yyyy')}`
         );
    }, [isInitialized, tasks, habits, habitEntries, previousWeekStart, previousWeekEnd]);


    // Monthly Data
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const monthlyReport = useMemo(() => {
        if (!isInitialized) return null;
        return calculateReportData(
            { start: currentMonthStart, end: currentMonthEnd },
            tasks, habits, habitEntries,
             `Month: ${format(currentMonthStart, 'MMMM yyyy')}`
        );
    }, [isInitialized, tasks, habits, habitEntries, currentMonthStart, currentMonthEnd]);

    const previousMonthlyReport = useMemo(() => {
        if (!isInitialized) return null;
        return calculateReportData(
            { start: previousMonthStart, end: previousMonthEnd },
             tasks, habits, habitEntries,
             `Month: ${format(previousMonthStart, 'MMMM yyyy')}`
        );
    }, [isInitialized, tasks, habits, habitEntries, previousMonthStart, previousMonthEnd]);


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
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Progress Reports</CardTitle>
                    <CardDescription>Review your performance over the last week and month.</CardDescription>
                </CardHeader>
            </Card>

            {weeklyReport && (
                <ReportCard
                    title="Weekly Report"
                    currentData={weeklyReport}
                    previousData={previousWeeklyReport || undefined}
                />
            )}

             {monthlyReport && (
                <ReportCard
                    title="Monthly Report"
                    currentData={monthlyReport}
                    previousData={previousMonthlyReport || undefined}
                />
            )}

             {!weeklyReport && !monthlyReport && (
                 <Card>
                    <CardContent className="text-center py-10 text-muted-foreground">
                         <p>No data available to generate reports yet.</p>
                         <p>Keep tracking your tasks and habits!</p>
                    </CardContent>
                </Card>
             )}
        </div>
    );
}
