"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Edit2, Trash2, Loader2 } from "lucide-react";
import {
  Revenue,
  RevenueSource,
  REVENUE_SOURCES,
  PERFUMES,
} from "@/lib/types";
import { toast } from "sonner";

const formatPKR = (amount: number) =>
  `Rs ${amount.toLocaleString("en-PK")}`;

interface RevenueManagerProps {
  revenue: Revenue[];
  onAdd: (revenue: Revenue) => Promise<Revenue>;
  onUpdate: (revenue: Revenue) => Promise<Revenue>;
  onDelete: (id: string) => Promise<void>;
}

export default function RevenueManager({
  revenue,
  onAdd,
  onUpdate,
  onDelete,
}: RevenueManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formSource, setFormSource] = useState<RevenueSource>("Online Sale");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPerfume, setFormPerfume] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const resetForm = useCallback(() => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormSource("Online Sale");
    setFormDescription("");
    setFormAmount("");
    setFormPerfume("");
    setFormQuantity("");
    setFormNotes("");
    setEditingRevenue(null);
  }, []);

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (rev: Revenue) => {
    setEditingRevenue(rev);
    setFormDate(rev.date);
    setFormSource(rev.source);
    setFormDescription(rev.description);
    setFormAmount(rev.amount.toString());
    setFormPerfume(rev.perfume || "");
    setFormQuantity(rev.quantity.toString());
    setFormNotes(rev.notes);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formDescription.trim() || !formAmount || Number(formAmount) <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const rev: Revenue = {
        id: editingRevenue?.id || Date.now().toString(),
        date: formDate,
        source: formSource,
        description: formDescription.trim(),
        amount: Number(formAmount),
        perfume: formPerfume || undefined,
        quantity: Number(formQuantity) || 0,
        notes: formNotes,
      };

      if (editingRevenue) {
        await onUpdate(rev);
        toast.success("Revenue updated successfully 💛");
      } else {
        await onAdd(rev);
        toast.success("Revenue added successfully 💛");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to save revenue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await onDelete(deleteId);
      toast.success("Revenue entry deleted");
    } catch {
      toast.error("Failed to delete revenue. Please try again.");
    } finally {
      setDeleteId(null);
    }
  };

  // Filtered revenue
  const filteredRevenue = useMemo(() => {
    return revenue.filter((r) => {
      const matchesSearch =
        searchQuery === "" ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.perfume && r.perfume.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSource =
        filterSource === "all" || r.source === filterSource;
      return matchesSearch && matchesSource;
    });
  }, [revenue, searchQuery, filterSource]);

  const totalFiltered = useMemo(
    () => filteredRevenue.reduce((sum, r) => sum + r.amount, 0),
    [filteredRevenue]
  );

  // Revenue by perfume
  const perfumeRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    revenue.forEach((r) => {
      if (r.perfume) {
        map[r.perfume] = (map[r.perfume] || 0) + r.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [revenue]);

  return (
    <div className="space-y-6 tab-content-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Revenue</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track all your sales and income 💛
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-gold hover:bg-gold-dark text-black font-semibold gap-2"
        >
          <Plus size={18} />
          Add Revenue
        </Button>
      </div>

      {/* Stats cards */}
      {perfumeRevenue.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {perfumeRevenue.map(([perfume, amount]) => (
            <Card
              key={perfume}
              className="bg-[#111111] border-gold/20 hover:border-gold/40 transition-all"
            >
              <CardContent className="p-3 text-center">
                <p className="text-gold font-bold text-sm">{perfume}</p>
                <p className="text-white font-semibold text-xs mt-1">
                  {formatPKR(amount)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search revenue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#111111] border-gold/20 text-white placeholder:text-muted-foreground"
          />
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-full sm:w-48 bg-[#111111] border-gold/20 text-white">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent className="bg-[#111111] border-gold/20">
            <SelectItem value="all" className="text-white focus:text-white focus:bg-gold/10">
              All Sources
            </SelectItem>
            {REVENUE_SOURCES.map((src) => (
              <SelectItem
                key={src}
                value={src}
                className="text-white focus:text-white focus:bg-gold/10"
              >
                {src}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          Showing {filteredRevenue.length} of {revenue.length} entries
        </span>
        <span className="text-success font-semibold">
          Total: {formatPKR(totalFiltered)}
        </span>
      </div>

      {/* Revenue table */}
      <Card className="bg-[#111111] border-gold/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gold/20 hover:bg-transparent">
                  <TableHead className="text-gold">Date</TableHead>
                  <TableHead className="text-gold">Source</TableHead>
                  <TableHead className="text-gold">Description</TableHead>
                  <TableHead className="text-gold">Perfume</TableHead>
                  <TableHead className="text-gold text-right">Amount</TableHead>
                  <TableHead className="text-gold">Qty</TableHead>
                  <TableHead className="text-gold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredRevenue.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-12"
                      >
                        No revenue entries yet. Add your first sale!
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRevenue.map((rev) => (
                      <motion.tr
                        key={rev.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-gold/10 hover:bg-[#1A1A1A] transition-colors"
                      >
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(rev.date).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-success/30 text-success text-xs"
                          >
                            {rev.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white text-sm">
                              {rev.description}
                            </p>
                            {rev.notes && (
                              <p className="text-muted-foreground text-xs mt-0.5">
                                {rev.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gold text-sm">
                          {rev.perfume || "-"}
                        </TableCell>
                        <TableCell className="text-right text-success font-semibold">
                          {formatPKR(rev.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {rev.quantity || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(rev)}
                              className="text-muted-foreground hover:text-gold h-8 w-8"
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(rev.id)}
                              className="text-muted-foreground hover:text-danger h-8 w-8"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#111111] border-gold/30 text-white max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-gold text-xl">
              {editingRevenue ? "Edit Revenue" : "Add New Revenue"} 💛
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Date */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="bg-[#0A0A0A] border-gold/20 text-white"
              />
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Source</Label>
              <Select
                value={formSource}
                onValueChange={(v) => setFormSource(v as RevenueSource)}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-gold/20">
                  {REVENUE_SOURCES.map((src) => (
                    <SelectItem
                      key={src}
                      value={src}
                      className="text-white focus:text-white focus:bg-gold/10"
                    >
                      {src}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Description
              </Label>
              <Input
                placeholder="e.g. Shahkaar 50ml sale to Ahmed"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Amount (PKR)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 3500"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Perfume */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Perfume (optional)
              </Label>
              <Select value={formPerfume} onValueChange={setFormPerfume}>
                <SelectTrigger className="bg-[#0A0A0A] border-gold/20 text-white">
                  <SelectValue placeholder="Select perfume" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-gold/20">
                  <SelectItem value="none" className="text-white focus:text-white focus:bg-gold/10">
                    None
                  </SelectItem>
                  {PERFUMES.map((perf) => (
                    <SelectItem
                      key={perf}
                      value={perf}
                      className="text-white focus:text-white focus:bg-gold/10"
                    >
                      {perf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Quantity
              </Label>
              <Input
                type="number"
                placeholder="e.g. 2"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Notes (optional)
              </Label>
              <Textarea
                placeholder="Any additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50 resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="border-gold/30 text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gold hover:bg-gold-dark text-black font-semibold"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin mr-2" />
              ) : null}
              {editingRevenue ? "Update" : "Add Revenue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#111111] border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Revenue Entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. The revenue entry will be permanently deleted from Firebase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold/30 text-muted-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger hover:bg-danger/90 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
