
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to add months without mutation
export function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  // Handle edge case where the day doesn't exist in the target month
  // e.g., adding 1 month to Jan 31 should result in Feb 28/29, not Mar 2/3
  if (newDate.getDate() !== date.getDate()) {
    newDate.setDate(0); // Go to the last day of the previous month (which is the target month)
  }
  return newDate;
}
