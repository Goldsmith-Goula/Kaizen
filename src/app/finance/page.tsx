

"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Edit, Trash2, Wallet, TrendingUp, Landmark, CalendarIcon, Filter, DollarSign, Receipt, Loader2, Info, CircleDollarSign, BarChart, X } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, compareDesc, isValid } from 'date-fns';
import { useAppData } from '@/hooks/use-app-data';
import { Budget, Transaction, FinancialGoal, TransactionType } from '@/lib/data-schema';
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
import { BarChart as RechartsBarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend as RechartsLegend } from 'recharts'; // For potential charts, aliased recharts Legend


// Define a unique value for the 'none' option
const NONE_BUDGET_VALUE = "__none__";

// Helper to format currency
const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount); // Adjust currency as needed
};


export default function FinancePage() {
  const {
    isInitialized,
    budgets, updateBudget, deleteBudget,
    transactions, updateTransaction, deleteTransaction,
    financialGoals, updateFinancialGoal, deleteFinancialGoal
  } = useAppData();

  const [selectedBudgetId, setSelectedBudgetId] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'transactions' | 'goals' | 'budgets'>('transactions');

  // --- Modal States ---
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [budgetModalData, setBudgetModalData] = useState<Partial<Budget>>({});
  const [budgetCategories, setBudgetCategories] = useState<Record<string, string>>({}); // Store as { name: amount_string } for editing

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionModalData, setTransactionModalData] = useState<Partial<Transaction>>({});

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<FinancialGoal | null>(null);
  const [goalModalData, setGoalModalData] = useState<Partial<FinancialGoal>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);


  // --- Derived Data ---
  const selectedBudget = useMemo(() => {
    if (selectedBudgetId === 'all') return null;
    return budgets.find(b => b.id === selectedBudgetId);
  }, [budgets, selectedBudgetId]);

  const filteredTransactions = useMemo(() => {
    if (!isInitialized) return [];
    let filtered = [...transactions];
    if (selectedBudgetId !== 'all') {
      filtered = filtered.filter(t => t.budgetId === selectedBudgetId);
    }
    // Sort by date, newest first
    return filtered.sort((a, b) => {
        try {
            const dateA = a.date ? parseISO(a.date) : new Date(0);
            const dateB = b.date ? parseISO(b.date) : new Date(0);
             if (!isValid(dateA)) return 1; // Invalid dates last
             if (!isValid(dateB)) return -1;
            return compareDesc(dateA, dateB);
        } catch (e) {
             console.error("Error comparing dates", a.date, b.date, e);
             return 0; // Keep original order if dates are invalid
        }
    });
  }, [transactions, selectedBudgetId, isInitialized]);

  // Calculate budget summary
  const budgetSummary = useMemo(() => {
    if (!selectedBudget) return null;

    const budgetTransactions = transactions.filter(t => t.budgetId === selectedBudget.id);
    const totalIncome = budgetTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = budgetTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalIncome - totalExpenses;
    const savingsProgress = selectedBudget.savingsGoal > 0 ? Math.min(100, Math.max(0, (netFlow / selectedBudget.savingsGoal) * 100)) : 0;

    const categorySpending: Record<string, number> = {};
    budgetTransactions.filter(t => t.type === 'expense').forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    return { totalIncome, totalExpenses, netFlow, savingsProgress, categorySpending };
  }, [selectedBudget, transactions]);

  const availableBudgetCategories = useMemo(() => {
    const categories = new Set<string>();
    budgets.forEach(b => Object.keys(b.categories).forEach(cat => categories.add(cat)));
    transactions.forEach(t => categories.add(t.category));
    return Array.from(categories).sort();
  }, [budgets, transactions]);


  // --- Modal Handling ---

  // Budget Modal
  useEffect(() => {
    if (editingBudget) {
        const startDate = editingBudget.startDate && isValid(parseISO(editingBudget.startDate)) ? format(parseISO(editingBudget.startDate), 'yyyy-MM-dd') : undefined;
        const endDate = editingBudget.endDate && isValid(parseISO(editingBudget.endDate)) ? format(parseISO(editingBudget.endDate), 'yyyy-MM-dd') : undefined;
        setBudgetModalData({
            ...editingBudget,
            startDate: startDate,
            endDate: endDate,
        });
         // Convert categories object to editable format
         const editableCategories: Record<string, string> = {};
         Object.entries(editingBudget.categories).forEach(([name, amount]) => {
             editableCategories[name] = amount.toString();
         });
         setBudgetCategories(editableCategories);
        setIsBudgetModalOpen(true);
    } else {
        setBudgetModalData({ period: 'monthly', incomeGoal: 0, savingsGoal: 0, categories: {} });
        setBudgetCategories({});
    }
  }, [editingBudget]);

  const handleOpenBudgetModal = (budget: Budget | null = null) => {
    setEditingBudget(budget);
    // Reset modal data based on whether editing or adding
    if (budget) {
        const startDate = budget.startDate && isValid(parseISO(budget.startDate)) ? format(parseISO(budget.startDate), 'yyyy-MM-dd') : undefined;
        const endDate = budget.endDate && isValid(parseISO(budget.endDate)) ? format(parseISO(budget.endDate), 'yyyy-MM-dd') : undefined;
        setBudgetModalData({
            ...budget,
            startDate: startDate,
            endDate: endDate,
        });
        const editableCategories: Record<string, string> = {};
        Object.entries(budget.categories).forEach(([name, amount]) => {
            editableCategories[name] = amount.toString();
        });
        setBudgetCategories(editableCategories);
    } else {
         setBudgetModalData({ period: 'monthly', incomeGoal: 0, savingsGoal: 0, categories: {} });
         setBudgetCategories({});
    }
    setIsBudgetModalOpen(true);
  };


  const handleBudgetModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBudgetModalData(prev => ({ ...prev, [name]: value }));
  };

   const handleBudgetCategoryChange = (categoryName: string, amountStr: string) => {
        setBudgetCategories(prev => ({ ...prev, [categoryName]: amountStr }));
    };

   const addBudgetCategoryField = () => {
        // Find a unique new category name (e.g., "New Category 1", "New Category 2")
        let i = 1;
        while (`New Category ${i}` in budgetCategories) {
            i++;
        }
        setBudgetCategories(prev => ({ ...prev, [`New Category ${i}`]: '0' }));
    };

   const removeBudgetCategoryField = (categoryName: string) => {
        setBudgetCategories(prev => {
            const newCategories = { ...prev };
            delete newCategories[categoryName];
            return newCategories;
        });
   };

    const handleBudgetModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!budgetModalData.name?.trim()) {
            alert("Budget name is required."); return;
        }

        // Convert category strings back to numbers
        const finalCategories: Record<string, number> = {};
        let categoryError = false;
        Object.entries(budgetCategories).forEach(([name, amountStr]) => {
             if (!name.trim()) { alert("Category name cannot be empty."); categoryError = true; return; }
             const amount = parseFloat(amountStr);
             if (isNaN(amount) || amount < 0) { alert(`Invalid amount for category "${name}". Please enter a positive number.`); categoryError = true; return;}
             finalCategories[name.trim()] = amount;
        });
        if(categoryError) return;


        setIsSubmitting(true);
        try {
            const startDate = budgetModalData.startDate && isValid(parseISO(budgetModalData.startDate)) ? format(parseISO(budgetModalData.startDate), "yyyy-MM-dd'T'00:00:00.000'Z'") : undefined;
            const endDate = budgetModalData.endDate && isValid(parseISO(budgetModalData.endDate)) ? format(parseISO(budgetModalData.endDate), "yyyy-MM-dd'T'00:00:00.000'Z'") : undefined;
            await updateBudget({
                id: editingBudget?.id,
                name: budgetModalData.name,
                period: budgetModalData.period || 'monthly',
                startDate: startDate,
                endDate: endDate,
                incomeGoal: parseFloat(budgetModalData.incomeGoal?.toString() || '0') || 0,
                savingsGoal: parseFloat(budgetModalData.savingsGoal?.toString() || '0') || 0,
                categories: finalCategories,
            });
            setIsBudgetModalOpen(false);
            setEditingBudget(null);
        } catch (error) { console.error("Failed to save budget:", error); }
        finally { setIsSubmitting(false); }
    };

    const handleConfirmDeleteBudget = () => {
        if (budgetToDelete) {
            // Optional: Decide whether to delete associated transactions or just unlink them
            // transactions.filter(t => t.budgetId === budgetToDelete.id).forEach(t => deleteTransaction(t.id));
             transactions.filter(t => t.budgetId === budgetToDelete.id).forEach(t => updateTransaction({ id: t.id, budgetId: undefined }));
            deleteBudget(budgetToDelete.id);
            setBudgetToDelete(null);
            if(selectedBudgetId === budgetToDelete.id) setSelectedBudgetId('all'); // Deselect if deleted
        }
    };

  // Transaction Modal
  useEffect(() => {
    if (editingTransaction) {
         const date = editingTransaction.date && isValid(parseISO(editingTransaction.date)) ? format(parseISO(editingTransaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        setTransactionModalData({
            ...editingTransaction,
             // Use yyyy-MM-dd for input display
             date: date,
             // Ensure budgetId is set correctly for the select input
             budgetId: editingTransaction.budgetId || NONE_BUDGET_VALUE, // Use NONE_BUDGET_VALUE if undefined
        });
        setIsTransactionModalOpen(true);
    } else {
        setTransactionModalData({
            type: 'expense', // Default to expense
            amount: 0,
            date: format(new Date(), 'yyyy-MM-dd'),
            category: '',
            // Pre-fill budget if one is selected, otherwise use NONE_BUDGET_VALUE for the select
            budgetId: selectedBudgetId !== 'all' ? selectedBudgetId : NONE_BUDGET_VALUE,
        });
    }
  }, [editingTransaction, selectedBudgetId]);

  const handleOpenTransactionModal = (transaction: Transaction | null = null) => {
    setEditingTransaction(transaction);
    // Reset modal data based on whether editing or adding
     if (transaction) {
         const date = transaction.date && isValid(parseISO(transaction.date)) ? format(parseISO(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
         setTransactionModalData({
            ...transaction,
            date: date,
            budgetId: transaction.budgetId || NONE_BUDGET_VALUE,
         });
     } else {
         setTransactionModalData({
             type: 'expense',
             amount: 0,
             date: format(new Date(), 'yyyy-MM-dd'),
             category: '',
             budgetId: selectedBudgetId !== 'all' ? selectedBudgetId : NONE_BUDGET_VALUE,
         });
     }
    setIsTransactionModalOpen(true);
  };

    const handleTransactionModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTransactionModalData(prev => ({ ...prev, [name]: value }));
    };

    const handleTransactionModalSelectChange = (name: keyof Transaction, value: string) => {
        // For budgetId, handle the special 'none' value
        if (name === 'budgetId') {
             setTransactionModalData(prev => ({ ...prev, budgetId: value === NONE_BUDGET_VALUE ? undefined : value }));
        } else {
            setTransactionModalData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleTransactionDateChange = (date: Date | undefined) => {
        setTransactionModalData(prev => ({ ...prev, date: date ? format(date, 'yyyy-MM-dd') : undefined }));
    };


    const handleTransactionModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(transactionModalData.amount?.toString() || '');
        if (isNaN(amount) || amount <= 0 || !transactionModalData.category?.trim() || !transactionModalData.date) {
            alert("Valid amount, category, and date are required."); return;
        }
         const parsedDate = transactionModalData.date ? parseISO(transactionModalData.date) : null;
         if (!parsedDate || !isValid(parsedDate)) {
            alert("Invalid date selected."); return;
         }

        setIsSubmitting(true);
        try {
             // Convert date from yyyy-MM-dd to full ISO string for storage
             const dateToStore = format(parsedDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
             // Convert NONE_BUDGET_VALUE back to undefined for storage
             const budgetIdToStore = transactionModalData.budgetId === NONE_BUDGET_VALUE ? undefined : transactionModalData.budgetId;


             await updateTransaction({
                id: editingTransaction?.id,
                type: transactionModalData.type || 'expense',
                amount: amount,
                category: transactionModalData.category.trim(),
                date: dateToStore,
                description: transactionModalData.description,
                budgetId: budgetIdToStore,
            });
            setIsTransactionModalOpen(false);
            setEditingTransaction(null);
        } catch (error) { console.error("Failed to save transaction:", error); }
        finally { setIsSubmitting(false); }
    };

    const handleConfirmDeleteTransaction = () => {
        if (transactionToDelete) {
            deleteTransaction(transactionToDelete.id);
            setTransactionToDelete(null);
        }
    };


  // Goal Modal
  useEffect(() => {
    if (editingGoal) {
         const deadline = editingGoal.deadline && isValid(parseISO(editingGoal.deadline)) ? format(parseISO(editingGoal.deadline), 'yyyy-MM-dd') : undefined;
        setGoalModalData({
            ...editingGoal,
            deadline: deadline,
        });
      setIsGoalModalOpen(true);
    } else {
      setGoalModalData({ name: '', targetAmount: 0, currentAmount: 0 });
    }
  }, [editingGoal]);

  const handleOpenGoalModal = (goal: FinancialGoal | null = null) => {
    setEditingGoal(goal);
     // Reset modal data based on whether editing or adding
    if (goal) {
        const deadline = goal.deadline && isValid(parseISO(goal.deadline)) ? format(parseISO(goal.deadline), 'yyyy-MM-dd') : undefined;
        setGoalModalData({
            ...goal,
             deadline: deadline,
        });
    } else {
         setGoalModalData({ name: '', targetAmount: 0, currentAmount: 0 });
    }
    setIsGoalModalOpen(true);
  };

   const handleGoalModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setGoalModalData(prev => ({ ...prev, [name]: value }));
    };

     const handleGoalDateChange = (date: Date | undefined) => {
        setGoalModalData(prev => ({ ...prev, deadline: date ? format(date, 'yyyy-MM-dd') : undefined }));
    };

    const handleGoalModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetAmount = parseFloat(goalModalData.targetAmount?.toString() || '');
        const currentAmount = parseFloat(goalModalData.currentAmount?.toString() || '0'); // Default current to 0
        if (!goalModalData.name?.trim() || isNaN(targetAmount) || targetAmount <= 0 || isNaN(currentAmount) || currentAmount < 0) {
            alert("Valid name and positive target amount are required. Current amount must be non-negative."); return;
        }
        const parsedDeadline = goalModalData.deadline ? parseISO(goalModalData.deadline) : null;
        if (goalModalData.deadline && (!parsedDeadline || !isValid(parsedDeadline))) {
             alert("Invalid deadline date selected."); return;
        }


        setIsSubmitting(true);
        try {
             // Convert deadline date to ISO string for storage
            const deadlineToStore = parsedDeadline ? format(parsedDeadline, "yyyy-MM-dd'T'00:00:00.000'Z'") : undefined;

            await updateFinancialGoal({
                id: editingGoal?.id,
                name: goalModalData.name.trim(),
                targetAmount: targetAmount,
                currentAmount: currentAmount,
                deadline: deadlineToStore,
            });
            setIsGoalModalOpen(false);
            setEditingGoal(null);
        } catch (error) { console.error("Failed to save goal:", error); }
        finally { setIsSubmitting(false); }
    };

     const handleConfirmDeleteGoal = () => {
        if (goalToDelete) {
            deleteFinancialGoal(goalToDelete.id);
            setGoalToDelete(null);
        }
    };


  // --- Render Logic ---
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header and View Selector */}
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
                 <div>
                    <CardTitle className="text-2xl font-bold">Finance Dashboard</CardTitle>
                     <CardDescription>Manage budgets, track spending, and reach your financial goals.</CardDescription>
                 </div>
                <div className="flex flex-wrap gap-2">
                    <Select value={viewMode} onValueChange={(value: 'transactions' | 'goals' | 'budgets') => setViewMode(value)}>
                         <SelectTrigger className="w-full sm:w-[160px]">
                            <SelectValue placeholder="Select View" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="transactions">Transactions</SelectItem>
                             <SelectItem value="budgets">Budgets</SelectItem>
                             <SelectItem value="goals">Financial Goals</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* Add Budget Selector only if not viewing budgets */}
                     {viewMode !== 'budgets' && (
                        <Select value={selectedBudgetId} onValueChange={setSelectedBudgetId}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Select Budget" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Budgets</SelectItem>
                                {budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                     {/* Contextual Add Buttons */}
                    {viewMode === 'transactions' && <Button onClick={() => handleOpenTransactionModal()}><Plus className="mr-2 h-4 w-4" /> Add Transaction</Button>}
                    {viewMode === 'budgets' && <Button onClick={() => handleOpenBudgetModal()}><Plus className="mr-2 h-4 w-4" /> Add Budget</Button>}
                    {viewMode === 'goals' && <Button onClick={() => handleOpenGoalModal()}><Plus className="mr-2 h-4 w-4" /> Add Goal</Button>}
                 </div>
            </CardHeader>
        </Card>


        {/* View Content */}
        {viewMode === 'transactions' && (
            <Card>
                <CardHeader>
                     <CardTitle>Transactions</CardTitle>
                     <CardDescription>{selectedBudget ? `Showing transactions for "${selectedBudget.name}"` : 'Showing all transactions'}</CardDescription>
                </CardHeader>
                 <CardContent>
                     {filteredTransactions.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.map(t => {
                                     // Ensure date is valid before formatting
                                    let formattedDate = 'Invalid Date';
                                    try {
                                        const parsedDate = t.date ? parseISO(t.date) : null;
                                        if (parsedDate && isValid(parsedDate)) {
                                            formattedDate = format(parsedDate, 'PP');
                                        }
                                    } catch (e) {
                                        console.error("Invalid date found in transaction:", t.id, t.date);
                                    }
                                    return (
                                        <TableRow key={t.id}>
                                            <TableCell>{formattedDate}</TableCell>
                                            <TableCell className={cn("capitalize font-medium", t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                                                {t.type}
                                            </TableCell>
                                            <TableCell>{t.category}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
                                            <TableCell className={cn("text-right font-mono", t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                                                {t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 justify-end">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenTransactionModal(t)}><Edit size={16} /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTransactionToDelete(t)}><Trash2 size={16} /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                             </TableBody>
                        </Table>
                     ) : (
                         <div className="text-center py-10 text-muted-foreground">
                            <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No transactions found{selectedBudget ? ` for "${selectedBudget.name}"` : ''}.</p>
                            <Button className="mt-4" onClick={() => handleOpenTransactionModal()}><Plus className="mr-2 h-4 w-4" /> Add Your First Transaction</Button>
                        </div>
                     )}
                 </CardContent>
            </Card>
        )}

        {viewMode === 'budgets' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {budgets.length > 0 ? budgets.map(budget => {
                     // Calculate summary for the specific budget card (optional, could be simplified)
                     const cardSummary = (() => {
                         const budgetTransactions = transactions.filter(t => t.budgetId === budget.id);
                         const totalIncome = budgetTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                         const totalExpenses = budgetTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                         return { totalIncome, totalExpenses };
                     })();
                     let formattedStartDate = '';
                     let formattedEndDate = '';
                     try {
                         formattedStartDate = budget.startDate && isValid(parseISO(budget.startDate)) ? format(parseISO(budget.startDate), 'PP') : '';
                         formattedEndDate = budget.endDate && isValid(parseISO(budget.endDate)) ? format(parseISO(budget.endDate), 'PP') : '';
                     } catch (e) {
                         console.error("Error formatting budget dates", budget.startDate, budget.endDate);
                     }
                     return (
                        <Card key={budget.id} className={cn("flex flex-col", selectedBudgetId === budget.id && "ring-2 ring-primary")}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                     <CardTitle className="text-lg font-medium flex items-center gap-2">
                                        <Landmark className="h-5 w-5 text-primary"/> {budget.name}
                                     </CardTitle>
                                     <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenBudgetModal(budget)}><Edit size={14} /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setBudgetToDelete(budget)}><Trash2 size={14} /></Button>
                                     </div>
                                </div>
                                <CardDescription className="text-sm">
                                     {budget.period}{formattedStartDate ? `: ${formattedStartDate}` : ''}{formattedEndDate ? ` - ${formattedEndDate}` : ''}
                                </CardDescription>
                            </CardHeader>
                             <CardContent className="flex-1 flex flex-col justify-between pt-2">
                                <div className="space-y-2 text-sm mb-4">
                                     <div>Income Goal: <span className="font-medium">{formatCurrency(budget.incomeGoal)}</span></div>
                                    <div>Savings Goal: <span className="font-medium">{formatCurrency(budget.savingsGoal)}</span></div>
                                    {/* Simple summary for card */}
                                    <div className="text-xs pt-1">Spent: <span className="text-red-600 dark:text-red-400">{formatCurrency(cardSummary.totalExpenses)}</span></div>
                                    <div className="text-xs">Earned: <span className="text-green-600 dark:text-green-400">{formatCurrency(cardSummary.totalIncome)}</span></div>
                                    {/* <div className="font-semibold pt-1">Categories:</div> */}
                                     {/* <ul className="list-disc list-inside pl-2 text-xs max-h-20 overflow-y-auto">
                                        {Object.entries(budget.categories).map(([name, amount]) => (
                                            <li key={name}>{name}: {formatCurrency(amount)}</li>
                                        ))}
                                    </ul> */}
                                </div>
                                <Button variant={selectedBudgetId === budget.id ? "default" : "outline"} size="sm" className="w-full mt-auto" onClick={() => setSelectedBudgetId(selectedBudgetId === budget.id ? 'all' : budget.id)}>
                                     {selectedBudgetId === budget.id ? 'View Details / Deselect' : 'Select & View Details'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                 }) : (
                     <Card className="md:col-span-2 lg:col-span-3">
                        <CardContent className="text-center py-10 text-muted-foreground">
                             <Landmark className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No budgets created yet.</p>
                             <Button className="mt-4" onClick={() => handleOpenBudgetModal()}><Plus className="mr-2 h-4 w-4" /> Create Your First Budget</Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        )}

        {/* Budget Details (Shown below budget cards if one is selected) */}
         {viewMode === 'budgets' && selectedBudget && budgetSummary && (
             <Card>
                 <CardHeader>
                     <CardTitle>Details for "{selectedBudget.name}"</CardTitle>
                 </CardHeader>
                 <CardContent className="grid gap-6 md:grid-cols-2">
                     {/* Summary Numbers */}
                     <div className="space-y-3">
                         <div className="flex justify-between items-center p-3 bg-secondary rounded">
                             <span>Total Income:</span>
                             <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(budgetSummary.totalIncome)}</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-secondary rounded">
                            <span>Total Expenses:</span>
                            <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(budgetSummary.totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-secondary rounded">
                            <span>Net Flow:</span>
                            <span className={cn("font-bold", budgetSummary.netFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{formatCurrency(budgetSummary.netFlow)}</span>
                        </div>
                         <div className="pt-2">
                            <Label className="text-sm">Savings Goal Progress ({formatCurrency(selectedBudget.savingsGoal)})</Label>
                            <Progress value={budgetSummary.savingsProgress} className="h-3 mt-1" />
                            <p className="text-xs text-right text-muted-foreground mt-1">{budgetSummary.savingsProgress.toFixed(0)}%</p>
                        </div>
                     </div>
                     {/* Category Spending Chart */}
                     <div className="space-y-2">
                        <Label className="text-sm font-semibold">Spending by Category</Label>
                         {Object.keys(selectedBudget.categories).length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                {/* Note: Using RechartsBarChart and RechartsBar aliases */}
                                <RechartsBarChart data={Object.entries(selectedBudget.categories).map(([name, budgetAmount]) => ({ name, budget: budgetAmount, spent: budgetSummary.categorySpending[name] || 0 }))} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                    <XAxis type="number" tickFormatter={formatCurrency} />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}}/>
                                     <ChartTooltip content={({ payload }) => {
                                        if (!payload || payload.length === 0) return null;
                                        const data = payload[0].payload;
                                        const overBudget = data.spent > data.budget;
                                        return (
                                            <div className="bg-popover p-2 border rounded shadow text-popover-foreground text-xs">
                                                <p className="font-bold mb-1">{data.name}</p>
                                                <p>Spent: {formatCurrency(data.spent)}</p>
                                                <p>Budget: {formatCurrency(data.budget)}</p>
                                                {overBudget && <p className="text-red-500 dark:text-red-400 font-medium mt-1">Over budget by {formatCurrency(data.spent - data.budget)}</p>}
                                            </div>
                                        );
                                    }}/>
                                    <RechartsLegend verticalAlign="top" height={36}/>
                                    <RechartsBar dataKey="spent" stackId="a" fill="var(--color-chart-2)" name="Spent" radius={[0, 4, 4, 0]}/>
                                    {/* Budget bar should represent the total budget, not stack additively */}
                                     <RechartsBar dataKey="budget" stackId="b" fill="hsl(var(--muted))" name="Budget Limit" radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        ) : (
                             <p className="text-sm text-muted-foreground py-4 text-center">No categories defined for this budget.</p>
                        )}
                     </div>
                 </CardContent>
             </Card>
         )}


        {viewMode === 'goals' && (
            <div className="grid gap-6 md:grid-cols-2">
                 {financialGoals.length > 0 ? financialGoals.map(goal => {
                    const progress = goal.targetAmount > 0 ? Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100)) : 0;
                    let formattedDeadline = '';
                     try {
                         formattedDeadline = goal.deadline && isValid(parseISO(goal.deadline)) ? format(parseISO(goal.deadline), 'PP') : '';
                     } catch (e) {
                         console.error("Error formatting goal deadline", goal.deadline);
                     }

                     return (
                        <Card key={goal.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                                         <CircleDollarSign className="h-5 w-5 text-green-600 dark:text-green-400"/> {goal.name}
                                    </CardTitle>
                                     <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenGoalModal(goal)}><Edit size={14} /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setGoalToDelete(goal)}><Trash2 size={14} /></Button>
                                     </div>
                                </div>
                                 {formattedDeadline && <CardDescription>Target Date: {formattedDeadline}</CardDescription>}
                            </CardHeader>
                            <CardContent>
                                <div className="mb-2 text-sm">
                                     <span className="font-semibold">{formatCurrency(goal.currentAmount)}</span> / {formatCurrency(goal.targetAmount)}
                                </div>
                                <Progress value={progress} aria-label={`${goal.name} progress`} />
                                <p className="text-xs text-right text-muted-foreground mt-1">{progress.toFixed(1)}%</p>
                            </CardContent>
                        </Card>
                    );
                }) : (
                    <Card className="md:col-span-2">
                        <CardContent className="text-center py-10 text-muted-foreground">
                             <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No financial goals set yet.</p>
                             <Button className="mt-4" onClick={() => handleOpenGoalModal()}><Plus className="mr-2 h-4 w-4" /> Set Your First Goal</Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        )}

         {/* --- Modals --- */}

        {/* Budget Modal */}
        <Dialog open={isBudgetModalOpen} onOpenChange={(open) => {if(!open) {setIsBudgetModalOpen(false); setEditingBudget(null);}}}>
             <DialogContent className="sm:max-w-[525px]">
                 <form onSubmit={handleBudgetModalSubmit}>
                    <DialogHeader>
                        <DialogTitle>{editingBudget ? 'Edit Budget' : 'Add New Budget'}</DialogTitle>
                         <DialogDescription>Define your income and spending targets.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                        {/* Basic Info */}
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="budgetName" className="text-right">Name*</Label>
                            <Input id="budgetName" name="name" value={budgetModalData.name || ''} onChange={handleBudgetModalChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="budgetPeriod" className="text-right">Period</Label>
                             <Select name="period" value={budgetModalData.period || 'monthly'} onValueChange={(value) => setBudgetModalData(prev => ({ ...prev, period: value as any }))}>
                                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                         {(budgetModalData.period === 'custom') && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="budgetStartDate" className="text-right">Start Date</Label>
                                    <Input id="budgetStartDate" name="startDate" type="date" value={budgetModalData.startDate || ''} onChange={handleBudgetModalChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="budgetEndDate" className="text-right">End Date</Label>
                                    <Input id="budgetEndDate" name="endDate" type="date" value={budgetModalData.endDate || ''} onChange={handleBudgetModalChange} className="col-span-3" />
                                </div>
                            </>
                        )}
                        {/* Goals */}
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="budgetIncomeGoal" className="text-right">Income Goal</Label>
                             <Input id="budgetIncomeGoal" name="incomeGoal" type="number" min="0" step="0.01" value={budgetModalData.incomeGoal || ''} onChange={handleBudgetModalChange} className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="budgetSavingsGoal" className="text-right">Savings Goal</Label>
                            <Input id="budgetSavingsGoal" name="savingsGoal" type="number" min="0" step="0.01" value={budgetModalData.savingsGoal || ''} onChange={handleBudgetModalChange} className="col-span-3" />
                        </div>

                        {/* Categories */}
                        <div className="col-span-4 mt-4">
                            <Label className="font-semibold">Budget Categories</Label>
                             <div className="space-y-2 mt-2">
                                {Object.entries(budgetCategories).map(([name, amount]) => (
                                    <div key={name} className="grid grid-cols-12 items-center gap-2">
                                         <Input value={name} onChange={(e) => {
                                             const newName = e.target.value;
                                             setBudgetCategories(prev => {
                                                 const updated = {...prev};
                                                 delete updated[name]; // Remove old name entry
                                                 updated[newName] = amount; // Add new name entry
                                                 return updated;
                                             });
                                         }} placeholder="Category Name" className="col-span-6" list="available-categories"/>
                                        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => handleBudgetCategoryChange(name, e.target.value)} placeholder="Amount" className="col-span-5" />
                                         <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive col-span-1" onClick={() => removeBudgetCategoryField(name)}><Trash2 size={16} /></Button>
                                    </div>
                                ))}
                                 <datalist id="available-categories">
                                    {availableBudgetCategories.map(cat => <option key={cat} value={cat} />)}
                                </datalist>
                                <Button type="button" variant="outline" size="sm" onClick={addBudgetCategoryField} className="mt-2">
                                     <Plus className="mr-2 h-4 w-4"/> Add Category
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" onClick={() => {setIsBudgetModalOpen(false); setEditingBudget(null);}}>Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}{editingBudget ? 'Save Changes' : 'Add Budget'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Transaction Modal */}
         <Dialog open={isTransactionModalOpen} onOpenChange={(open) => {if(!open) {setIsTransactionModalOpen(false); setEditingTransaction(null);}}}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleTransactionModalSubmit}>
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
                        <DialogDescription>Log an income or expense.</DialogDescription>
                    </DialogHeader>
                     <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="transType" className="text-right">Type</Label>
                             <Select name="type" value={transactionModalData.type || 'expense'} onValueChange={(value: TransactionType) => handleTransactionModalSelectChange('type', value)}>
                                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="transAmount" className="text-right">Amount*</Label>
                            <Input id="transAmount" name="amount" type="number" min="0.01" step="0.01" value={transactionModalData.amount || ''} onChange={handleTransactionModalChange} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="transCategory" className="text-right">Category*</Label>
                             <Input id="transCategory" name="category" value={transactionModalData.category || ''} onChange={handleTransactionModalChange} className="col-span-3" required list="available-categories"/>
                         </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="transDate" className="text-right">Date*</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !transactionModalData.date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {transactionModalData.date && isValid(parseISO(transactionModalData.date))
                                            ? format(parseISO(transactionModalData.date), "PPP")
                                            : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                     <Calendar
                                         mode="single"
                                         selected={transactionModalData.date ? parseISO(transactionModalData.date) : undefined}
                                         onSelect={handleTransactionDateChange}
                                         initialFocus
                                    />
                                </PopoverContent>
                             </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="transDescription" className="text-right">Description</Label>
                            <Input id="transDescription" name="description" value={transactionModalData.description || ''} onChange={handleTransactionModalChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="transBudget" className="text-right">Budget</Label>
                             {/* Use NONE_BUDGET_VALUE for the select value */}
                             <Select name="budgetId" value={transactionModalData.budgetId || NONE_BUDGET_VALUE} onValueChange={(value) => handleTransactionModalSelectChange('budgetId', value)}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Assign to budget (Optional)" /></SelectTrigger>
                                <SelectContent>
                                     <SelectItem value={NONE_BUDGET_VALUE}>-- None --</SelectItem>
                                    {budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                         </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" onClick={() => {setIsTransactionModalOpen(false); setEditingTransaction(null);}}>Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}{editingTransaction ? 'Save Changes' : 'Add Transaction'}</Button>
                    </DialogFooter>
                </form>
             </DialogContent>
         </Dialog>


        {/* Goal Modal */}
         <Dialog open={isGoalModalOpen} onOpenChange={(open) => {if(!open) {setIsGoalModalOpen(false); setEditingGoal(null);}}}>
             <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleGoalModalSubmit}>
                    <DialogHeader>
                        <DialogTitle>{editingGoal ? 'Edit Financial Goal' : 'Add Financial Goal'}</DialogTitle>
                        <DialogDescription>Set a target to save towards.</DialogDescription>
                    </DialogHeader>
                     <div className="grid gap-4 py-4">
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="goalName" className="text-right">Name*</Label>
                            <Input id="goalName" name="name" value={goalModalData.name || ''} onChange={handleGoalModalChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="goalTarget" className="text-right">Target Amount*</Label>
                            <Input id="goalTarget" name="targetAmount" type="number" min="0.01" step="0.01" value={goalModalData.targetAmount || ''} onChange={handleGoalModalChange} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="goalCurrent" className="text-right">Current Amount</Label>
                             <Input id="goalCurrent" name="currentAmount" type="number" min="0" step="0.01" value={goalModalData.currentAmount || '0'} onChange={handleGoalModalChange} className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="goalDeadline" className="text-right">Deadline</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !goalModalData.deadline && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                         {goalModalData.deadline && isValid(parseISO(goalModalData.deadline))
                                            ? format(parseISO(goalModalData.deadline), "PPP")
                                            : <span>Pick a date (Optional)</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                     <Calendar
                                         mode="single"
                                         selected={goalModalData.deadline ? parseISO(goalModalData.deadline) : undefined}
                                         onSelect={handleGoalDateChange}
                                         initialFocus
                                     />
                                </PopoverContent>
                            </Popover>
                        </div>
                     </div>
                    <DialogFooter>
                         <DialogClose asChild><Button type="button" variant="secondary" onClick={() => {setIsGoalModalOpen(false); setEditingGoal(null);}}>Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}{editingGoal ? 'Save Changes' : 'Add Goal'}</Button>
                    </DialogFooter>
                </form>
             </DialogContent>
         </Dialog>


        {/* Delete Confirmation Modals */}
         <Dialog open={!!budgetToDelete} onOpenChange={(open) => !open && setBudgetToDelete(null)}>
            <DialogContent><DialogHeader><DialogTitle>Confirm Deletion</DialogTitle><DialogDescription>Delete budget "{budgetToDelete?.name}"? Associated transactions will be unlinked.</DialogDescription></DialogHeader><DialogFooter><Button variant="secondary" onClick={() => setBudgetToDelete(null)}>Cancel</Button><Button variant="destructive" onClick={handleConfirmDeleteBudget}>Delete Budget</Button></DialogFooter></DialogContent>
         </Dialog>
         <Dialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
             <DialogContent><DialogHeader><DialogTitle>Confirm Deletion</DialogTitle><DialogDescription>Delete this transaction? This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="secondary" onClick={() => setTransactionToDelete(null)}>Cancel</Button><Button variant="destructive" onClick={handleConfirmDeleteTransaction}>Delete Transaction</Button></DialogFooter></DialogContent>
        </Dialog>
         <Dialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
             <DialogContent><DialogHeader><DialogTitle>Confirm Deletion</DialogTitle><DialogDescription>Delete financial goal "{goalToDelete?.name}"?</DialogDescription></DialogHeader><DialogFooter><Button variant="secondary" onClick={() => setGoalToDelete(null)}>Cancel</Button><Button variant="destructive" onClick={handleConfirmDeleteGoal}>Delete Goal</Button></DialogFooter></DialogContent>
        </Dialog>

    </div>
  );
}
