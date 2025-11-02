/**
 * Generate a list of past years including the current year
 * @param currentYear - The current year to start from
 * @param count - Number of past years to include (default: 5)
 * @returns Array of years from current year going back
 */
export function getPastYears(currentYear: number, count: number = 5): number[] {
  if (!currentYear || isNaN(currentYear)) {
    // Fallback to actual current year if invalid
    const year = new Date().getFullYear();
    return Array.from({ length: count + 1 }, (_, i) => year - i);
  }
  return Array.from({ length: count + 1 }, (_, i) => currentYear - i);
}


