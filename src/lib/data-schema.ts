// Define types for better structure and type safety
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator if needed, or use crypto.randomUUID

export type Priority = "high" | "medium" | "low";
export type TaskStatus = "pending" | "in-progress" | "completed" | "missed";
export type HabitFrequency = "daily" | "weekly" | "monthly";
export type Mood = "😊" | "😐" | "😢" | "😠" | "🎉"; // Example moods
export type TransactionType = "income" | "expense";

// Utility type for items with an ID
export interface Identifiable {
  id: string;
}

export interface Task extends Identifiable {
  title: string;
  duration?: string; // e.g., "1h 30m"
  category?: string;
  priority: Priority;
  notes?: string;
  dueDate?: string; // ISO date string YYYY-MM-DD
  dueTime?: string; // HH:mm format
  isRecurring: boolean;
  recurrenceRule?: {
    frequency: HabitFrequency;
    interval?: number; // e.g., every 2 weeks
    daysOfWeek?: number[]; // 0 for Sunday, 1 for Monday, ...
    dayOfMonth?: number;
  };
  status: TaskStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  completedAt?: string; // ISO date string
}

export interface Habit extends Identifiable {
  name: string;
  goal?: string; // e.g., "Meditate 10 minutes"
  frequency: HabitFrequency;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // Streak information will likely be calculated or stored separately
}

export interface HabitEntry extends Identifiable { // Added ID
    habitId: string;
    date: string; // YYYY-MM-DD
    completed: boolean;
}

export interface HabitStreak extends Identifiable { // Added ID
    habitId: string;
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate?: string; // YYYY-MM-DD
}

export interface Milestone extends Identifiable {
  title: string;
  description?: string;
  dateAchieved: string; // ISO date string
  category?: string; // e.g., Career, Personal
  createdAt: string; // ISO date string
}

export interface JournalEntry extends Identifiable {
  timestamp: string; // ISO date string
  content: string;
  mood?: Mood;
  tags?: string[];
}

export interface FutureSelfCategory {
  values?: string;
  skills?: { id: string; name: string; progress: number }[]; // Added id, progress 0-100
  habits?: string[]; // List of habit names or IDs
  financial?: { incomeGoal?: number; savingsGoal?: number; netWorthGoal?: number };
  relationships?: string; // Goals description
  career?: string; // Goals description
  health?: string; // Goals description
}

export interface FutureSelf { // Removed Identifiable as it's a single object
  current: FutureSelfCategory;
  desired: FutureSelfCategory;
  // GrowthPathway could be a more complex structure linking actions to goals
  updatedAt: string; // ISO date string
}


export interface Budget extends Identifiable {
  name: string; // e.g., "Monthly Budget - July 2024"
  period: "monthly" | "yearly" | "custom";
  startDate?: string; // ISO date string YYYY-MM-DD
  endDate?: string; // ISO date string YYYY-MM-DD
  incomeGoal: number;
  savingsGoal: number;
  categories: { [categoryName: string]: number }; // e.g., { "Groceries": 400, "Rent": 1500 }
  createdAt: string; // ISO date string
}

export interface Transaction extends Identifiable {
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // ISO date string YYYY-MM-DD
  description?: string;
  budgetId?: string; // Link to a specific budget
  createdAt: string; // ISO date string
}

export interface FinancialGoal extends Identifiable {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO date string
}

export interface AppSettings { // Removed Identifiable as it's a single object
  theme: "light" | "dark" | "system";
  customThemes?: { id: string; name: string; colors: Record<string, string> }[]; // Added id
  dashboardLayout?: string[]; // Array of widget keys in order
  notificationPreferences?: {
    taskStart?: boolean;
    taskEnd?: boolean;
    milestone?: boolean;
    // Add more as needed
  };
  // Add other customizable settings
}

// Main Local Storage Schema Structure
export interface AppData {
  tasks: Task[];
  habits: Habit[];
  habitEntries: HabitEntry[];
  habitStreaks: HabitStreak[];
  milestones: Milestone[];
  journalEntries: JournalEntry[];
  futureSelf: FutureSelf | null;
  budgets: Budget[];
  transactions: Transaction[];
  financialGoals: FinancialGoal[];
  settings: AppSettings;
  // Calculated values like self-discipline score are not stored directly,
  // but computed when needed.
  lastUpdated: string; // ISO date string
}

// Local storage keys
export const LS_KEYS = {
  APP_DATA: 'kaizenFlowAppData_v1', // Added versioning
};

// Function to generate a unique ID
export const generateId = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    } else {
        // Fallback for environments without crypto.randomUUID (e.g., older browsers, non-secure contexts)
        // Basic and not cryptographically secure, but fine for local storage IDs.
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

// Initial default state for AppData
export const defaultAppData: AppData = {
  tasks: [],
  habits: [],
  habitEntries: [],
  habitStreaks: [],
  milestones: [],
  journalEntries: [],
  futureSelf: {
      current: {},
      desired: {},
      updatedAt: new Date().toISOString(),
  },
  budgets: [],
  transactions: [],
  financialGoals: [],
  settings: {
    theme: "system",
    dashboardLayout: ['focus', 'quickAdd', 'progressSummary', 'motivation', 'navigation'], // Default layout
    notificationPreferences: {
        taskStart: true,
        taskEnd: false,
        milestone: true,
    },
    customThemes: [],
  },
  lastUpdated: new Date().toISOString(),
};
