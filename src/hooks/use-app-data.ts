
"use client";

import { useState, useEffect, useCallback } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { AppData, defaultAppData, LS_KEYS, Identifiable, generateId } from '@/lib/data-schema';

export type DataUpdater<T extends Identifiable> = (
    item: Partial<Omit<T, 'id' | 'createdAt'>> & { id?: string } // Allow id for creation
) => void;

export type DataDeleter = (id: string) => void;

export function useAppData() {
  const [appData, setAppData] = useLocalStorage<AppData>(LS_KEYS.APP_DATA, defaultAppData);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ensure initialization happens only once on the client
  useEffect(() => {
    if (typeof window !== 'undefined') {
        // Check if data exists, if not, set default
        const existingData = localStorage.getItem(LS_KEYS.APP_DATA);
        if (!existingData) {
            setAppData(defaultAppData);
        }
        setIsInitialized(true);
    }
  }, [setAppData]); // Add setAppData dependency

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData(prevData => ({
      ...prevData,
      ...updates,
      lastUpdated: new Date().toISOString(),
    }));
  }, [setAppData]);

  // Generic function to add or update an item in an array within AppData
  const createOrUpdateItem = useCallback(<T extends Identifiable>(
    key: keyof AppData,
    itemData: Partial<Omit<T, 'createdAt' | 'updatedAt'>> & { id?: string }
  ): T => {
    let newItem: T;
    const now = new Date().toISOString();

    setAppData(prevData => {
        const list = (prevData[key] as T[] | undefined) ?? [];
        const existingIndex = itemData.id ? list.findIndex(i => i.id === itemData.id) : -1;

        if (existingIndex !== -1) {
            // Update existing item
            newItem = {
                ...list[existingIndex],
                ...itemData,
                updatedAt: now,
            } as T;
            const updatedList = [...list];
            updatedList[existingIndex] = newItem;
            return {
                ...prevData,
                [key]: updatedList,
                lastUpdated: now,
            };
        } else {
            // Create new item
             newItem = {
                ...itemData,
                id: itemData.id || generateId(), // Use provided ID or generate new one
                createdAt: now,
                updatedAt: now,
             } as T;
             return {
                ...prevData,
                [key]: [...list, newItem],
                lastUpdated: now,
            };
        }
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return newItem!; // newItem is guaranteed to be assigned within setAppData
  }, [setAppData]);

  // Generic function to delete an item from an array within AppData
  const deleteItem = useCallback(<T extends Identifiable>(
    key: keyof AppData,
    id: string
  ) => {
    setAppData(prevData => {
        const list = (prevData[key] as T[] | undefined) ?? [];
        const updatedList = list.filter(item => item.id !== id);
        if (list.length === updatedList.length) {
            return prevData; // No change if item not found
        }
        return {
            ...prevData,
            [key]: updatedList,
            lastUpdated: new Date().toISOString(),
        };
    });
  }, [setAppData]);

  // Specific CRUD operations using the generic functions
  const tasks = appData.tasks;
  const updateTask = useCallback<DataUpdater<import('@/lib/data-schema').Task>>(
    (task) => createOrUpdateItem<'tasks', import('@/lib/data-schema').Task>('tasks', task),
    [createOrUpdateItem]
  );
  const deleteTask = useCallback<DataDeleter>(
    (id) => deleteItem<'tasks', import('@/lib/data-schema').Task>('tasks', id),
    [deleteItem]
  );

  const habits = appData.habits;
  const updateHabit = useCallback<DataUpdater<import('@/lib/data-schema').Habit>>(
    (habit) => createOrUpdateItem<'habits', import('@/lib/data-schema').Habit>('habits', habit),
    [createOrUpdateItem]
  );
  const deleteHabit = useCallback<DataDeleter>(
      (id) => deleteItem<'habits', import('@/lib/data-schema').Habit>('habits', id),
      [deleteItem]
  );

  const habitEntries = appData.habitEntries;
  const updateHabitEntry = useCallback<DataUpdater<import('@/lib/data-schema').HabitEntry>>(
    (entry) => createOrUpdateItem<'habitEntries', import('@/lib/data-schema').HabitEntry>('habitEntries', entry),
    [createOrUpdateItem]
  );
   const deleteHabitEntry = useCallback<DataDeleter>(
      (id) => deleteItem<'habitEntries', import('@/lib/data-schema').HabitEntry>('habitEntries', id),
      [deleteItem]
   );

   // Add CRUD for other data types similarly...
   const milestones = appData.milestones;
   const updateMilestone = useCallback<DataUpdater<import('@/lib/data-schema').Milestone>>(
     (milestone) => createOrUpdateItem<'milestones', import('@/lib/data-schema').Milestone>('milestones', milestone),
     [createOrUpdateItem]
   );
   const deleteMilestone = useCallback<DataDeleter>(
     (id) => deleteItem<'milestones', import('@/lib/data-schema').Milestone>('milestones', id),
     [deleteItem]
   );

   const journalEntries = appData.journalEntries;
   const updateJournalEntry = useCallback<DataUpdater<import('@/lib/data-schema').JournalEntry>>(
     (entry) => createOrUpdateItem<'journalEntries', import('@/lib/data-schema').JournalEntry>('journalEntries', entry),
     [createOrUpdateItem]
   );
   const deleteJournalEntry = useCallback<DataDeleter>(
     (id) => deleteItem<'journalEntries', import('@/lib/data-schema').JournalEntry>('journalEntries', id),
     [deleteItem]
   );

   const budgets = appData.budgets;
   const updateBudget = useCallback<DataUpdater<import('@/lib/data-schema').Budget>>(
     (budget) => createOrUpdateItem<'budgets', import('@/lib/data-schema').Budget>('budgets', budget),
     [createOrUpdateItem]
   );
   const deleteBudget = useCallback<DataDeleter>(
     (id) => deleteItem<'budgets', import('@/lib/data-schema').Budget>('budgets', id),
     [deleteItem]
   );

   const transactions = appData.transactions;
   const updateTransaction = useCallback<DataUpdater<import('@/lib/data-schema').Transaction>>(
     (transaction) => createOrUpdateItem<'transactions', import('@/lib/data-schema').Transaction>('transactions', transaction),
     [createOrUpdateItem]
   );
   const deleteTransaction = useCallback<DataDeleter>(
     (id) => deleteItem<'transactions', import('@/lib/data-schema').Transaction>('transactions', id),
     [deleteItem]
   );

   const financialGoals = appData.financialGoals;
   const updateFinancialGoal = useCallback<DataUpdater<import('@/lib/data-schema').FinancialGoal>>(
     (goal) => createOrUpdateItem<'financialGoals', import('@/lib/data-schema').FinancialGoal>('financialGoals', goal),
     [createOrUpdateItem]
   );
   const deleteFinancialGoal = useCallback<DataDeleter>(
     (id) => deleteItem<'financialGoals', import('@/lib/data-schema').FinancialGoal>('financialGoals', id),
     [deleteItem]
   );

   // For single objects like futureSelf and settings
   const futureSelf = appData.futureSelf;
   const updateFutureSelf = useCallback((data: Partial<import('@/lib/data-schema').FutureSelf>) => {
        updateAppData({
            futureSelf: {
                ...(appData.futureSelf || { current: {}, desired: {}, updatedAt: '' }), // Provide default structure if null
                ...data,
                updatedAt: new Date().toISOString(),
            }
        });
   }, [appData.futureSelf, updateAppData]);


   const settings = appData.settings;
   const updateSettings = useCallback((data: Partial<import('@/lib/data-schema').AppSettings>) => {
        updateAppData({ settings: { ...appData.settings, ...data } });
   }, [appData.settings, updateAppData]);


  // Function to export data
  const exportData = useCallback(() => {
    if (typeof window !== 'undefined') {
      const dataStr = JSON.stringify(appData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `kaizenflow_backup_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      linkElement.remove();
    }
  }, [appData]);

  // Function to import data
  const importData = useCallback((jsonData: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const parsedData = JSON.parse(jsonData) as AppData;
            // Basic validation (can be more robust)
            if (parsedData && typeof parsedData === 'object' && Array.isArray(parsedData.tasks)) {
                setAppData(parsedData);
                resolve();
            } else {
                reject(new Error("Invalid data format."));
            }
        } catch (error) {
            console.error("Error importing data:", error);
            reject(new Error("Failed to parse JSON data."));
        }
    });
  }, [setAppData]);


  return {
    isInitialized,
    appData,
    updateAppData,
    // Tasks
    tasks,
    updateTask,
    deleteTask,
    // Habits
    habits,
    updateHabit,
    deleteHabit,
    // Habit Entries
    habitEntries,
    updateHabitEntry,
    deleteHabitEntry,
    // Milestones
    milestones,
    updateMilestone,
    deleteMilestone,
    // Journal Entries
    journalEntries,
    updateJournalEntry,
    deleteJournalEntry,
    // Future Self
    futureSelf,
    updateFutureSelf,
    // Budgets
    budgets,
    updateBudget,
    deleteBudget,
    // Transactions
    transactions,
    updateTransaction,
    deleteTransaction,
    // Financial Goals
    financialGoals,
    updateFinancialGoal,
    deleteFinancialGoal,
    // Settings
    settings,
    updateSettings,
    // Import/Export
    exportData,
    importData,
    // Generic update/delete (optional, if direct access needed)
    createOrUpdateItem,
    deleteItem,
  };
}

// Helper function to create a generic updater
export function createGenericUpdater<T extends Identifiable>(
    key: keyof AppData,
    createOrUpdate: (key: keyof AppData, itemData: Partial<Omit<T, 'createdAt' | 'updatedAt'>> & { id?: string }) => T
): DataUpdater<T> {
    return (item) => createOrUpdate(key, item);
}

// Helper function to create a generic deleter
export function createGenericDeleter<T extends Identifiable>(
    key: keyof AppData,
    deleteFn: (key: keyof AppData, id: string) => void
): DataDeleter {
    return (id) => deleteFn(key, id);
}
