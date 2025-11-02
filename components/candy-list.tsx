"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CandyTable } from "@/components/candy-table";
import { YearSelector } from "@/components/year-selector";
import { AddCandyFormWrapper } from "@/components/add-candy-form-wrapper";
import { getPastYears } from "@/lib/year-utils";
import { getAllCandiesAction } from "@/app/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Candy } from "@/lib/candy";

interface CandyListProps {
  initialYear: number;
  currentYear: number;
  initialCandies: Candy[];
  onCandyAdded?: () => void;
}

export function CandyList({ initialYear, currentYear, initialCandies, onCandyAdded }: CandyListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedYear, setSelectedYear] = React.useState(initialYear);
  const [candies, setCandies] = React.useState<Candy[]>(initialCandies);
  const [isLoading, setIsLoading] = React.useState(false);

  // Track if this is the initial mount
  const isInitialMount = React.useRef(true);

  // Fetch data when year changes (but not on initial mount)
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getAllCandiesAction(selectedYear);
        setCandies(data);
      } catch (error) {
        console.error("Error fetching candies:", error);
        setCandies([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  // Update URL silently when year changes
  const handleYearChange = React.useCallback((year: number) => {
    setSelectedYear(year);
    
    // Update URL for bookmarking
    const params = new URLSearchParams(searchParams.toString());
    if (year === currentYear) {
      params.delete("year");
    } else {
      params.set("year", year.toString());
    }
    
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    window.history.replaceState({}, '', newUrl);
  }, [currentYear, searchParams]);

  const handleUpdate = () => {
    // Refresh current data
    getAllCandiesAction(selectedYear).then(setCandies).catch(console.error);
    router.refresh();
  };

  const handleCandyAddedLocal = () => {
    // Refresh table data
    handleUpdate();
    // Also notify parent to refresh metrics/chart
    onCandyAdded?.();
  };

  const isCurrentYear = selectedYear === currentYear;
  const pastYears = React.useMemo(() => getPastYears(currentYear, 5), [currentYear]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl tracking-tight">Your Candy Collection</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Viewing:</span>
            {isLoading ? (
              <Skeleton className="h-9 w-[140px]" />
            ) : (
              <YearSelector 
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
                availableYears={pastYears}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Candy Form - only show when current year is selected */}
        {isCurrentYear ? (
          <div className="pb-4 border-b space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Add candy to your collection by selecting a type and quantity
              </p>
            </div>
            <AddCandyFormWrapper 
              disabled={false}
              onSuccess={handleCandyAddedLocal}
            />
          </div>
        ) : (
          <div className="pb-4 border-b">
            <p className="text-sm text-muted-foreground">
              Viewing {selectedYear} data. Switch to {currentYear} to add new candy.
            </p>
          </div>
        )}
        
        {/* Data Table */}
        <CandyTable 
          candies={candies} 
          onUpdate={handleUpdate}
          selectedYear={selectedYear}
          currentYear={currentYear}
        />
      </CardContent>
    </Card>
  );
}

