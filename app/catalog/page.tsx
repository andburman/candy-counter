import { Suspense } from "react";
import { NavHeader } from "@/components/nav-header";
import { CandyCatalogManager } from "@/components/candy-catalog-manager";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogPage() {
  return (
    <div className="min-h-screen">
      <NavHeader />
      <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Candy Catalog Management
            </h1>
            <p className="text-muted-foreground">
              Manage candy types available in the system
            </p>
          </header>

          <Suspense
            fallback={
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            }
          >
            <CandyCatalogManager />
          </Suspense>
        </div>
      </div>
    </div>
  );
}


