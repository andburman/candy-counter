"use client";

import * as React from "react";
import { getAllCandiesAction } from "@/app/actions";
import { CandyInsights } from "@/components/candy-insights";
import { CandyChart } from "@/components/candy-chart";
import { CandyList } from "@/components/candy-list";
import { Separator } from "@/components/ui/separator";
import type { Candy } from "@/lib/candy";

interface CandyDashboardProps {
  initialYear: number;
  currentYear: number;
  initialCandies: Candy[];
}

export function CandyDashboard({ 
  initialYear, 
  currentYear,
  initialCandies
}: CandyDashboardProps) {
  // Current year candies for metrics and chart
  const [currentYearCandies, setCurrentYearCandies] = React.useState<Candy[]>(
    initialYear === currentYear ? initialCandies : []
  );

  // Fetch current year data if we're initially viewing a different year
  React.useEffect(() => {
    if (initialYear !== currentYear) {
      getAllCandiesAction(currentYear).then(setCurrentYearCandies).catch(console.error);
    }
  }, [initialYear, currentYear]);

  // Refetch current year data when candy is added
  const handleCandyAdded = React.useCallback(() => {
    getAllCandiesAction(currentYear).then(setCurrentYearCandies).catch(console.error);
  }, [currentYear]);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Metrics - always show current year with YoY comparison */}
      <CandyInsights candies={currentYearCandies} currentYear={currentYear} />

      {/* Chart and Table side-by-side on desktop to reduce vertical scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CandyChart candies={currentYearCandies} />
        <CandyList 
          initialYear={initialYear}
          currentYear={currentYear}
          initialCandies={initialCandies}
          onCandyAdded={handleCandyAdded}
        />
      </div>
    </div>
  );
}

