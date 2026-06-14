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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Edit2, Trash2, Sparkles } from "lucide-react";
import {
  Expense,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/types";
import { suggestCategory } from "@/lib/storage";
import { toast } from "sonner";

const formatPKR = (amount: number) =>
  `Rs ${amount.toLocaleString("en-PK")}`;

interface ExpenseManagerProps {
  expenses: Expense[];
  onAdd: (expense: Expense) => void;
  onUpdate: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseManager({
  expenses,
  onAdd,
  onUpdate,
  onDelete,
}: ExpenseManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Form state
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("Packaging");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("Cash");
  const [formNotes, setFormNotes] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(
    null
  );

  const resetForm = useCallback(() => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCategory("Packaging");
    setFormDescription("");
    setFormAmount("");
    setFormPaymentMethod("Cash");
    setFormNotes("");
    setSuggestedCategory(null);
    setEditingExpense(null);
  }, []);

  const handleDescriptionChange = (value: string) => {
    setFormDescription(value);
    if (value.length > 2) {
      const suggestion = suggestCategory(value);
      setSuggestedCategory(suggestion);
    } else {
      setSuggestedCategory(null);
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormDate(expense.date);
    setFormCategory(expense.category);
    setFormDescription(expense.description);
    setFormAmount(expense.amount.toString());
    setFormPaymentMethod(expense.paymentMethod);
    setFormNotes(expense.notes);
    setSuggestedCategory(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formDescription.trim() || !formAmount || Number(formAmount) <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const expense: Expense = {
      id: editingExpense?.id || Date.now().toString(),
      date: formDate,
      category: formCategory,
      description: formDescription.trim(),
      amount: Number(formAmount),
      paymentMethod: formPaymentMethod,
      notes: formNotes,
    };

    if (editingExpense) {
      onUpdate(expense);
      toast.success("Expense updated successfully 💛");
    } else {
      onAdd(expense);
      toast.success("Expense added successfully 💛");
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    toast.success("Expense deleted");
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        searchQuery === "" ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || e.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, filterCategory]);

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  return (
    <div className="space-y-6 tab-content-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Expenses</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track all your business expenses 💛
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-gold hover:bg-gold-dark text-black font-semibold gap-2"
        >
          <Plus size={18} />
          Add Expense
        </Button>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#111111] border-gold/20 text-white placeholder:text-muted-foreground"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48 bg-[#111111] border-gold/20 text-white">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent className="bg-[#111111] border-gold/20">
            <SelectItem value="all" className="text-white focus:text-white focus:bg-gold/10">
              All Categories
            </SelectItem>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem
                key={cat}
                value={cat}
                className="text-white focus:text-white focus:bg-gold/10"
              >
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          Showing {filteredExpenses.length} of {expenses.length} expenses
        </span>
        <span className="text-gold font-semibold">
          Total: {formatPKR(totalFiltered)}
        </span>
      </div>

      {/* Expenses table */}
      <Card className="bg-[#111111] border-gold/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gold/20 hover:bg-transparent">
                  <TableHead className="text-gold">Date</TableHead>
                  <TableHead className="text-gold">Category</TableHead>
                  <TableHead className="text-gold">Description</TableHead>
                  <TableHead className="text-gold text-right">Amount</TableHead>
                  <TableHead className="text-gold">Payment</TableHead>
                  <TableHead className="text-gold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-12"
                      >
                        No expenses found. Add your first expense!
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <motion.tr
                        key={expense.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-gold/10 hover:bg-[#1A1A1A] transition-colors"
                      >
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(expense.date).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-gold/30 text-gold text-xs"
                          >
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white text-sm">
                              {expense.description}
                            </p>
                            {expense.notes && (
                              <p className="text-muted-foreground text-xs mt-0.5">
                                {expense.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-white font-semibold">
                          {formatPKR(expense.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {expense.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(expense)}
                              className="text-muted-foreground hover:text-gold h-8 w-8"
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(expense.id)}
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
              {editingExpense ? "Edit Expense" : "Add New Expense"} 💛
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

            {/* Description with auto-category */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Description
              </Label>
              <Input
                placeholder="e.g. Perfume Boxes (150 pcs)"
                value={formDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
              />
              {suggestedCategory && suggestedCategory !== formCategory && (
                <button
                  onClick={() => {
                    setFormCategory(suggestedCategory as ExpenseCategory);
                    setSuggestedCategory(null);
                    toast.success(`Category auto-set to ${suggestedCategory}`);
                  }}
                  className="flex items-center gap-1.5 text-xs text-gold hover:text-gold-light transition-colors"
                >
                  <Sparkles size={12} />
                  Suggested: {suggestedCategory} (click to apply)
                </button>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Category</Label>
              <Select
                value={formCategory}
                onValueChange={(v) =>
                  setFormCategory(v as ExpenseCategory)
                }
              >
                <SelectTrigger className="bg-[#0A0A0A] border-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-gold/20">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem
                      key={cat}
                      value={cat}
                      className="text-white focus:text-white focus:bg-gold/10"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Amount (PKR)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Payment Method
              </Label>
              <Select
                value={formPaymentMethod}
                onValueChange={setFormPaymentMethod}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-gold/20">
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem
                      key={method}
                      value={method}
                      className="text-white focus:text-white focus:bg-gold/10"
                    >
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              className="border-gold/30 text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-gold hover:bg-gold-dark text-black font-semibold"
            >
              {editingExpense ? "Update" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
