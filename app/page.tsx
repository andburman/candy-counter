import { Suspense } from "react";
import { getAllCandiesAction } from "@/app/actions";
import { CandyDashboard } from "@/components/candy-dashboard";
import { NavHeader } from "@/components/nav-header";
import { getCurrentYear } from "@/lib/candy";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface HomeProps {
  searchParams: { year?: string };
}

export default async function Home({ searchParams }: HomeProps) {
  const yearParam = searchParams.year ? Number(searchParams.year) : undefined;
  const selectedYear = yearParam && !isNaN(yearParam) ? yearParam : getCurrentYear();
  const currentYear = getCurrentYear();
  
  // Fetch initial data server-side for SSR
  const initialCandies = await getAllCandiesAction(selectedYear);

  return (
    <div className="min-h-screen">
      <NavHeader />
      <div className="container mx-auto max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 lg:space-y-8">
        <Suspense fallback={
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-8">
                <div className="space-y-2">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-6 w-64" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <Skeleton className="h-64" />
              </div>
            </CardContent>
          </Card>
        }>
          <CandyDashboard 
            initialYear={selectedYear}
            currentYear={currentYear}
            initialCandies={initialCandies}
          />
        </Suspense>
        </div>
      </div>
    </div>
  );
}
