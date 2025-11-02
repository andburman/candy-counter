"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-primary/10">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 py-2 items-center justify-between">
          <div className="flex flex-col">
            <Link href="/" className="text-2xl lg:text-3xl font-bold tracking-tight">
              Candy Counter
            </Link>
            <p className="text-sm text-muted-foreground">
              Track your trick-or-treat candy collection
            </p>
          </div>
          <nav className="flex items-center gap-2">
            <Button
              asChild
              variant={pathname === "/" ? "default" : "ghost"}
              size="sm"
            >
              <Link href="/">Home</Link>
            </Button>
            <Button
              asChild
              variant={pathname === "/catalog" ? "default" : "ghost"}
              size="sm"
            >
              <Link href="/catalog">Catalog</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}


