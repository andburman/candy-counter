"use client";

import * as React from "react";
import { Package, TrendingUp, Star, Candy as CandyIcon, ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllCandiesAction } from "@/app/actions";
import type { Candy } from "@/lib/candy";

interface CandyInsightsProps {
  candies: Candy[];
  currentYear: number;
}

export function CandyInsights({ candies, currentYear }: CandyInsightsProps) {
  const [previousYearCandies, setPreviousYearCandies] = React.useState<Candy[] | null>(null);
  const [isLoadingPrevious, setIsLoadingPrevious] = React.useState(true);

  // Fetch previous year data
  React.useEffect(() => {
    const previousYear = currentYear - 1;
    setIsLoadingPrevious(true);
    getAllCandiesAction(previousYear)
      .then(setPreviousYearCandies)
      .catch(console.error)
      .finally(() => setIsLoadingPrevious(false));
  }, [currentYear]);
  // Calculate current year statistics
  const totalUniqueTypes = candies.length;
  const totalPieces = candies.reduce((sum, candy) => sum + candy.count, 0);
  const averagePieces = totalUniqueTypes > 0 ? Math.round(totalPieces / totalUniqueTypes * 10) / 10 : 0;
  
  // Find top candy
  const topCandy = candies.length > 0 
    ? candies.reduce((max, candy) => candy.count > max.count ? candy : max, candies[0])
    : null;

  // Calculate previous year statistics
  const prevTotalUniqueTypes = previousYearCandies?.length ?? 0;
  const prevTotalPieces = previousYearCandies?.reduce((sum, candy) => sum + candy.count, 0) ?? 0;
  const prevAveragePieces = prevTotalUniqueTypes > 0 
    ? Math.round(prevTotalPieces / prevTotalUniqueTypes * 10) / 10 
    : 0;
  const prevTopCandy = previousYearCandies && previousYearCandies.length > 0
    ? previousYearCandies.reduce((max, candy) => candy.count > max.count ? candy : max, previousYearCandies[0])
    : null;

  // Helper to format YoY comparison
  const formatYoYComparison = (current: number, previous: number, isInteger = true) => {
    if (isLoadingPrevious) return null;
    if (!previousYearCandies || previousYearCandies.length === 0) {
      return { text: "No previous data", trend: "neutral" as const };
    }
    
    if (previous === 0 && current === 0) {
      return { text: "No change", trend: "neutral" as const, icon: Minus };
    }
    
    const diff = current - previous;
    const percentChange = previous > 0 ? Math.round((diff / previous) * 100) : (current > 0 ? 100 : 0);
    
    if (diff === 0) {
      return { text: "No change", trend: "neutral" as const, icon: Minus };
    }
    
    const sign = diff > 0 ? "+" : "";
    const displayDiff = isInteger ? diff : diff.toFixed(1);
    const trend = diff > 0 ? "positive" : "negative";
    const icon = diff > 0 ? ArrowUp : ArrowDown;
    
    return {
      text: `${sign}${displayDiff} (${sign}${percentChange}%)`,
      trend,
      icon,
    };
  };

  // YoY comparisons
  const typesComparison = formatYoYComparison(totalUniqueTypes, prevTotalUniqueTypes);
  const avgComparison = formatYoYComparison(averagePieces, prevAveragePieces, false);
  const totalComparison = formatYoYComparison(totalPieces, prevTotalPieces);
  
  // Top candy comparison (special handling)
  const topCandyComparison = (() => {
    if (isLoadingPrevious) return null;
    if (!previousYearCandies || previousYearCandies.length === 0) {
      return { text: "No previous data", trend: "neutral" as const };
    }
    if (!topCandy) {
      return { text: "No candy this year", trend: "neutral" as const };
    }
    if (!prevTopCandy) {
      return { text: `New top: ${topCandy.candy_name}`, trend: "positive" as const, icon: ArrowUp };
    }
    if (topCandy.candy_name === prevTopCandy.candy_name) {
      return { text: "Same as last year", trend: "neutral" as const, icon: Minus };
    }
    return { 
      text: `${prevTopCandy.candy_name} → ${topCandy.candy_name}`, 
      trend: "neutral" as const,
      icon: Minus
    };
  })();

  const stats = [
    {
      label: "Total Types",
      value: totalUniqueTypes,
      icon: Package,
      description: "Unique candy varieties",
      comparison: typesComparison,
    },
    {
      label: "Average Pieces",
      value: averagePieces,
      icon: TrendingUp,
      description: "Average per candy type",
      comparison: avgComparison,
    },
    {
      label: "Top Candy",
      value: topCandy ? topCandy.candy_name : "N/A",
      count: topCandy ? topCandy.count : null,
      icon: Star,
      description: topCandy ? `${topCandy.count} pieces` : "No candy yet",
      comparison: topCandyComparison,
    },
    {
      label: "Total Pieces",
      value: totalPieces,
      icon: CandyIcon,
      description: "Total pieces collected",
      comparison: totalComparison,
    },
  ];

  // Format number consistently to avoid hydration mismatch
  const formatNumber = (value: number | string): string => {
    if (typeof value === "string") return value;
    // Use en-US locale to ensure consistent formatting between server and client
    if (Number.isInteger(value)) {
      return value.toLocaleString("en-US");
    }
    // For decimals, show up to 1 decimal place
    return value.toLocaleString("en-US", { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 1 
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const displayValue = stat.value === "N/A" ? "N/A" : formatNumber(stat.value);
        const comparison = stat.comparison;
        const ComparisonIcon = comparison?.icon;
        
        return (
          <Card key={stat.label} className="@container/card from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight @[250px]/card:text-4xl">
                {stat.value === "N/A" ? (
                  <Badge variant="outline">{displayValue}</Badge>
                ) : (
                  <>
                    {displayValue}
                    {stat.count !== null && (
                      <span className="text-lg text-muted-foreground ml-2">
                        ({stat.count} pieces)
                      </span>
                    )}
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {stat.description} <Icon className="size-4" />
              </div>
              {comparison && (
                <div 
                  className={`flex items-center gap-1 text-xs font-medium ${
                    comparison.trend === "positive" 
                      ? "text-green-600 dark:text-green-400" 
                      : comparison.trend === "negative" 
                      ? "text-red-600 dark:text-red-400" 
                      : "text-muted-foreground"
                  }`}
                >
                  {ComparisonIcon && <ComparisonIcon className="size-3" />}
                  <span>vs {currentYear - 1}: {comparison.text}</span>
                </div>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

