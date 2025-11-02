"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { Candy as CandyIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Candy } from "@/lib/candy";

interface CandyChartProps {
  candies: Candy[];
}

type ChartDataPoint = {
  name: string;
  amount: number;
};

const CHART_HEIGHT = 300;
const EMPTY_STATE_HEIGHT = 250;
const CHART_MARGIN = { left: 10, right: 10, top: 10, bottom: 0 };

// Use multiple chart colors for visual variety
// Colors are defined in oklch format in CSS
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartConfig = {
  amount: {
    label: "Amount",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const CARD_TITLE = "Candy Distribution";
const CARD_DESCRIPTION = "Visual breakdown of your candy collection";
const EMPTY_STATE_MESSAGE = "No candy data to display";

// Truncate long names for display
function truncateName(name: string, maxLength: number = 12): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 3) + "...";
}

export function CandyChart({ candies }: CandyChartProps) {
  // Transform candy data for the chart
  const chartData = React.useMemo<ChartDataPoint[]>(() => {
    return candies
      .filter((candy) => candy.count > 0) // Only show candies with counts > 0
      .map((candy) => ({
        name: candy.candy_name,
        amount: candy.count,
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  }, [candies]);

  // Fixed bottom margin for horizontal labels - optimized for side-by-side layout
  const bottomMargin = 30;

  // Memoize tooltip formatter to avoid recreating on every render
  // Enhanced tooltip with color indicator
  const tooltipContent = React.useCallback(
    (props: {
      active?: boolean;
      payload?: Array<{
        value?: number;
        fill?: string;
        payload?: ChartDataPoint;
      }>;
    }) => {
      const { active, payload } = props;
      if (!active || !payload?.[0]) return null;
      const data = payload[0].payload as ChartDataPoint;
      const barColor = payload[0].fill || chartColors[0];
      return (
        <ChartTooltipContent indicator="dot" color={barColor}>
          <div className="space-y-1">
            <p className="font-medium">{data.name}</p>
            <p className="text-sm text-muted-foreground">
              Amount: {payload[0].value}
            </p>
          </div>
        </ChartTooltipContent>
      );
    },
    []
  );

  // Memoize tick formatter to avoid recreating on every render
  // Truncate labels - full name shown in tooltip on hover
  const tickFormatter = React.useCallback(
    (value: string) => {
      const maxLen = 15; // Fixed max length - tooltip shows full name
      return truncateName(value, maxLen);
    },
    []
  );

  if (chartData.length === 0) {
    return (
      <Card className="from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="tracking-tight text-lg">{CARD_TITLE}</CardTitle>
        <CardDescription className="text-xs">{CARD_DESCRIPTION}</CardDescription>
      </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground gap-4">
            <CandyIcon className="h-12 w-12 opacity-50" />
            <p>{EMPTY_STATE_MESSAGE}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="tracking-tight text-lg">{CARD_TITLE}</CardTitle>
        <CardDescription className="text-xs">{CARD_DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <ChartContainer config={chartConfig} className="h-[280px] lg:h-[300px] w-full">
          <BarChart
            data={chartData}
            margin={{ ...CHART_MARGIN, bottom: bottomMargin }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              angle={0}
              textAnchor="middle"
              height={bottomMargin}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickFormatter={tickFormatter}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={tooltipContent} />
            <Bar
              dataKey="amount"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

