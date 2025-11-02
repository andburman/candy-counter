"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears?: number[];
}

export function YearSelector({ 
  selectedYear, 
  onYearChange,
  availableYears = [selectedYear]
}: YearSelectorProps) {
  // Ensure we always have a valid array with at least the selected year
  const yearsToShow = React.useMemo(() => {
    if (!availableYears || availableYears.length === 0) {
      return [selectedYear];
    }
    // Ensure selectedYear is included even if not in availableYears
    const uniqueYears = [...new Set([selectedYear, ...availableYears])].sort((a, b) => b - a);
    return uniqueYears;
  }, [availableYears, selectedYear]);

  return (
    <Select
      value={selectedYear.toString()}
      onValueChange={(value) => onYearChange(Number(value))}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        {yearsToShow.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

