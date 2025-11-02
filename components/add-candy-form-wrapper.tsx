"use client";

import { useRouter } from "next/navigation";
import { AddCandyForm } from "@/components/add-candy-form";
import { Card, CardContent } from "@/components/ui/card";

interface AddCandyFormWrapperProps {
  disabled?: boolean;
  disabledMessage?: string;
  onSuccess?: () => void;
}

export function AddCandyFormWrapper({ 
  disabled = false, 
  disabledMessage,
  onSuccess
}: AddCandyFormWrapperProps) {
  const router = useRouter();

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      router.refresh();
    }
  };

  if (disabled) {
    return (
      <Card className="border-muted bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            {disabledMessage || "Cannot add candy for this year"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <AddCandyForm onSuccess={handleSuccess} />;
}

