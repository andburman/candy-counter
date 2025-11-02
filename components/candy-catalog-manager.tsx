"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import {
  getAllCatalogItemsAction,
  createCatalogItemAction,
  updateCatalogItemAction,
  deactivateCatalogItemAction,
  activateCatalogItemAction,
  mergeCatalogItemsAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Plus, RotateCcw, Merge, CheckCircle2, AlertCircle } from "lucide-react";
import type { CandyCatalogItem } from "@/lib/catalog";

interface CatalogFormValues {
  name: string;
  description?: string;
}

interface MergeFormValues {
  sourceId: number;
  targetId: number;
}

export function CandyCatalogManager() {
  const [catalogItems, setCatalogItems] = React.useState<CandyCatalogItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingItem, setEditingItem] = React.useState<CandyCatalogItem | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isMerging, setIsMerging] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = React.useState(false);
  const [alertMessage, setAlertMessage] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const form = useForm<CatalogFormValues>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const mergeForm = useForm<MergeFormValues>({
    defaultValues: {
      sourceId: 0,
      targetId: 0,
    },
  });

  const loadCatalog = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getAllCatalogItemsAction(true); // Include inactive
      setCatalogItems(items);
    } catch (error: any) {
      console.error("Error loading catalog:", error);
      setAlertMessage({ type: "error", message: "Failed to load catalog" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  React.useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name,
        description: editingItem.description || "",
      });
    }
  }, [editingItem, form]);

  // Auto-hide alert after 5 seconds
  React.useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleCreate = () => {
    setEditingItem(null);
    setIsCreating(true);
    form.reset({ name: "", description: "" });
    setDialogOpen(true);
  };

  const handleEdit = (item: CandyCatalogItem) => {
    setEditingItem(item);
    setIsCreating(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CatalogFormValues) => {
    try {
      if (isCreating) {
        await createCatalogItemAction(data.name, data.description);
        setAlertMessage({ type: "success", message: `"${data.name}" added to catalog` });
      } else if (editingItem) {
        await updateCatalogItemAction(editingItem.id, data.name, data.description);
        setAlertMessage({ type: "success", message: `"${data.name}" updated successfully` });
      }
      setDialogOpen(false);
      setEditingItem(null);
      setIsCreating(false);
      await loadCatalog();
    } catch (error: any) {
      console.error("Error saving catalog item:", error);
      setAlertMessage({ type: "error", message: error.message || "Failed to save catalog item" });
    }
  };

  const handleToggleActive = async (item: CandyCatalogItem) => {
    try {
      if (item.is_active) {
        await deactivateCatalogItemAction(item.id);
        setAlertMessage({ type: "success", message: `"${item.name}" deactivated` });
      } else {
        await activateCatalogItemAction(item.id);
        setAlertMessage({ type: "success", message: `"${item.name}" reactivated` });
      }
      await loadCatalog();
    } catch (error: any) {
      console.error("Error toggling catalog item:", error);
      setAlertMessage({ type: "error", message: error.message || "Failed to toggle catalog item" });
    }
  };

  const handleMerge = () => {
    setIsMerging(true);
    mergeForm.reset({ sourceId: 0, targetId: 0 });
    setMergeDialogOpen(true);
  };

  const handleMergeSubmit = async (data: MergeFormValues) => {
    if (!data.sourceId || !data.targetId || data.sourceId === data.targetId) {
      return;
    }

    try {
      const sourceItem = catalogItems.find(item => item.id === data.sourceId);
      const targetItem = catalogItems.find(item => item.id === data.targetId);
      await mergeCatalogItemsAction(data.sourceId, data.targetId);
      setAlertMessage({ 
        type: "success", 
        message: `"${sourceItem?.name}" merged into "${targetItem?.name}"` 
      });
      setMergeDialogOpen(false);
      setIsMerging(false);
      await loadCatalog();
    } catch (error: any) {
      console.error("Error merging catalog items:", error);
      setAlertMessage({ type: "error", message: error.message || "Failed to merge catalog items" });
    }
  };

  const activeItems = catalogItems.filter((item) => item.is_active);
  const inactiveItems = catalogItems.filter((item) => !item.is_active);

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {alertMessage && (
        <Alert variant={alertMessage.type === "error" ? "destructive" : "default"}>
          {alertMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{alertMessage.type === "success" ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{alertMessage.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Candy Catalog Management</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleMerge} variant="outline" size="sm">
                <Merge className="h-4 w-4 mr-2" />
                Merge Items
              </Button>
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Candy Type
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Candy Types ({activeItems.length})</h3>
              {activeItems.length === 0 ? (
                <p className="text-muted-foreground">No active candy types</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit {item.name}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Deactivate {item.name}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Inactive Candy Types - Using Accordion */}
            {inactiveItems.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="inactive">
                  <AccordionTrigger>
                    <h3 className="text-lg font-semibold">
                      Inactive Candy Types ({inactiveItems.length})
                    </h3>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inactiveItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-2">
                                {item.name}
                                <Badge variant="secondary">Inactive</Badge>
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.description || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit {item.name}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleActive(item)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  <span className="sr-only">Reactivate {item.name}</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Add Candy Type" : "Edit Candy Type"}
            </DialogTitle>
            <DialogDescription>
              {isCreating
                ? "Create a new candy type in the catalog"
                : "Update the candy type information"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{
                  required: "Candy name is required",
                  validate: (value) => {
                    if (!value || value.trim().length === 0) {
                      return "Candy name cannot be empty";
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candy Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Klubba" autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional description" />
                    </FormControl>
                    <FormDescription>
                      Add an optional description for this candy type
                    </FormDescription>
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
                    setEditingItem(null);
                    setIsCreating(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isCreating ? "Create" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Candy Types</DialogTitle>
            <DialogDescription>
              Merge one candy type into another. All candy counts will be combined, and the source
              type will be deactivated. This is useful for fixing duplicates like "Klubbor" and "Klubba".
            </DialogDescription>
          </DialogHeader>
          <Form {...mergeForm}>
            <form onSubmit={mergeForm.handleSubmit(handleMergeSubmit)} className="space-y-4">
              <FormField
                control={mergeForm.control}
                name="sourceId"
                rules={{
                  required: "Please select source candy type",
                  validate: (value) => value > 0 || "Please select source candy type",
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source (will be merged into target)</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString() || ""}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source candy type" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeItems.map((item) => (
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
                control={mergeForm.control}
                name="targetId"
                rules={{
                  required: "Please select target candy type",
                  validate: (value, formValues) => {
                    if (!value || value === 0) {
                      return "Please select target candy type";
                    }
                    if (value === formValues.sourceId) {
                      return "Target must be different from source";
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target (will receive merged data)</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString() || ""}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target candy type" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeItems.map((item) => (
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMergeDialogOpen(false);
                    setIsMerging(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Merge</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </Card>
    </div>
  );
}

