"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { addCandy, getAllCatalogItemsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CandyQuantityInput } from "@/components/candy-quantity-input";
import type { CandyCatalogItem } from "@/lib/catalog";

interface AddCandyFormValues {
  catalogId: number;
  quantity: number;
}

export function AddCandyForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [catalogItems, setCatalogItems] = React.useState<CandyCatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = React.useState(true);
  
  const form = useForm<AddCandyFormValues>({
    defaultValues: {
      catalogId: 0,
      quantity: 1,
    },
    mode: "onChange",
  });

  // Load catalog items on mount
  React.useEffect(() => {
    async function loadCatalog() {
      try {
        const items = await getAllCatalogItemsAction(false);
        setCatalogItems(items);
      } catch (error) {
        console.error("Error loading catalog:", error);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  const onSubmit = async (data: AddCandyFormValues) => {
    setIsSubmitting(true);
    try {
      await addCandy(data.catalogId, data.quantity);
      form.reset({ catalogId: 0, quantity: 1 });
      onSuccess?.();
    } catch (error) {
      console.error("Error adding candy:", error);
      // You could add toast notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
          <FormField
            control={form.control}
            name="catalogId"
            rules={{
              required: "Please select a candy type",
              validate: (value) => {
                if (!value || value === 0) {
                  return "Please select a candy type";
                }
                return true;
              },
            }}
            render={({ field }) => (
              <FormItem className="flex-1 min-w-0">
                <FormLabel className="sr-only">Candy Type</FormLabel>
                <FormControl>
                  <Select
                    value={field.value?.toString() || ""}
                    onValueChange={(value) => field.onChange(Number(value))}
                    disabled={isSubmitting || isLoadingCatalog}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingCatalog ? "Loading..." : "Choose a candy to add..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogItems.length === 0 && !isLoadingCatalog ? (
                        <SelectItem value="0" disabled>
                          No candy types available
                        </SelectItem>
                      ) : (
                        catalogItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            rules={{
              required: "Quantity is required",
              min: {
                value: 1,
                message: "Quantity must be at least 1",
              },
            }}
            render={({ field }) => (
              <FormItem className="w-full sm:w-auto">
                <FormLabel className="sr-only">Quantity</FormLabel>
                <FormControl>
                  <CandyQuantityInput
                    value={field.value}
                    onChange={field.onChange}
                    min={1}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto shrink-0">
            {isSubmitting ? "Adding..." : "Add Candy"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

