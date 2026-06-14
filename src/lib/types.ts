export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: string;
  notes: string;
}

export interface Revenue {
  id: string;
  date: string;
  source: RevenueSource;
  description: string;
  amount: number;
  perfume?: string;
  quantity: number;
  notes: string;
}

export type ExpenseCategory =
  | "Packaging"
  | "Perfume Oils"
  | "Printing & DTF"
  | "Equipment"
  | "Digital & Marketing"
  | "Transport"
  | "Testing & Misc";

export type RevenueSource =
  | "Online Sale"
  | "WhatsApp Order"
  | "Direct Sale"
  | "Sample Sale"
  | "Bundle Sale"
  | "Other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Packaging",
  "Perfume Oils",
  "Printing & DTF",
  "Equipment",
  "Digital & Marketing",
  "Transport",
  "Testing & Misc",
];

export const REVENUE_SOURCES: RevenueSource[] = [
  "Online Sale",
  "WhatsApp Order",
  "Direct Sale",
  "Sample Sale",
  "Bundle Sale",
  "Other",
];

export const PERFUMES = [
  "Shahkaar",
  "Meherban",
  "Gulnaz",
  "Noor-e-Jahan",
  "Rooh",
  "Rawaan",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Online",
  "Bank Transfer",
  "Invoice",
  "Counter Cash",
  "Other",
];

export const CHART_COLORS = [
  "#DFAD18",
  "#B8860B",
  "#FFD700",
  "#DAA520",
  "#CD853F",
  "#8B6914",
  "#F4C430",
];

export type ActiveTab =
  | "dashboard"
  | "expenses"
  | "revenue"
  | "ai-assistant"
  | "insights";
