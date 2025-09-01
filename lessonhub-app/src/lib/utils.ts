// file: src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a string with the week number and day of the week.
 * e.g., "35-SUN"
 * @param date The date to format.
 * @returns A formatted string.
 */
export function getWeekAndDay(date: Date): string {
  const d = new Date(date);
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayOfWeek = dayNames[d.getUTCDay()];

  // Create a copy of the date to avoid modifying the original
  const tempDate = new Date(d.valueOf());
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
  const yearStart = new Date(tempDate.getUTCFullYear(), 0, 1);
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return `${weekNo}-${dayOfWeek}`;
}