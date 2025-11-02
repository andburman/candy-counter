"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { updateCandy, deleteCandy as deleteCandyAction, getAllCatalogItemsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CandyQuantityInput } from "@/components/candy-quantity-input";
import { Pencil, Trash2 } from "lucide-react";
import type { Candy } from "@/lib/candy";
import type { CandyCatalogItem } from "@/lib/catalog";

interface CandyTableProps {
  candies: Candy[];
  onUpdate?: () => void;
  selectedYear?: number;
  currentYear?: number;
}

interface EditCandyFormValues {
  catalogId: number;
  count: number;
}

export function CandyTable({ candies, onUpdate, selectedYear, currentYear }: CandyTableProps) {
  const [editingCandy, setEditingCandy] = React.useState<Candy | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [catalogItems, setCatalogItems] = React.useState<CandyCatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = React.useState(true);

  const form = useForm<EditCandyFormValues>({
    defaultValues: {
      catalogId: 0,
      count: 1,
    },
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

  React.useEffect(() => {
    if (editingCandy) {
      form.reset({
        catalogId: editingCandy.catalog_id,
        count: editingCandy.count,
      });
    }
  }, [editingCandy, form]);

  const handleEdit = (candy: Candy) => {
    setEditingCandy(candy);
    setDialogOpen(true);
  };

  const handleEditSubmit = async (data: EditCandyFormValues) => {
    if (!editingCandy) return;

    try {
      await updateCandy(editingCandy.id, data.catalogId, data.count);
      setEditingCandy(null);
      setDialogOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating candy:", error);
      // You could add toast notification here
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    setIsDeleting(id);
    try {
      await deleteCandyAction(id);
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting candy:", error);
      // You could add toast notification here
    } finally {
      setIsDeleting(null);
    }
  };

  // Calculate total pieces
  const totalPieces = candies.reduce((sum, candy) => sum + candy.count, 0);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candy Name</TableHead>
            <TableHead className="text-right">Count</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                <p>
                  {selectedYear && selectedYear !== currentYear
                    ? `No candy data for ${selectedYear}. You can only add candy for ${currentYear}.`
                    : "No candy added yet. Start by adding your first candy!"}
                </p>
              </TableCell>
            </TableRow>
          ) : (
            candies.map((candy) => (
              <TableRow key={candy.id}>
                <TableCell className="font-medium">
                  {candy.candy_name}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {candy.count}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(candy)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit {candy.candy_name}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(candy.id, candy.candy_name)}
                      disabled={isDeleting === candy.id}
                      className="group"
                    >
                      <Trash2 className="h-4 w-4 group-hover:text-destructive" />
                      <span className="sr-only">
                        Delete {candy.candy_name}
                      </span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
          {/* Summary row */}
          <TableRow className="border-t-2 border-t-border bg-muted/50 font-bold">
            <TableCell className="font-bold">Total pieces</TableCell>
            <TableCell className="text-right font-bold">{totalPieces}</TableCell>
            <TableCell className="text-right"></TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Candy</DialogTitle>
            <DialogDescription>
              Update the candy name and count.
            </DialogDescription>
          </DialogHeader>
          {editingCandy && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleEditSubmit)}
                className="space-y-4"
              >
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
                    <FormItem>
                      <FormLabel>Candy Type</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(value) => field.onChange(Number(value))}
                          disabled={isLoadingCatalog}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={isLoadingCatalog ? "Loading..." : "Select candy type"} />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogItems.map((item) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="count"
                  rules={{
                    required: "Count is required",
                    min: {
                      value: 0,
                      message: "Count cannot be negative",
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Count</FormLabel>
                      <FormControl>
                        <CandyQuantityInput
                          value={field.value}
                          onChange={field.onChange}
                          min={0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingCandy(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

