import { Expense, Revenue } from "./types";
import { PRELOADED_EXPENSES } from "./data";

const STORAGE_KEY = "askhushboo_finance";

interface FinanceData {
  expenses: Expense[];
  revenue: Revenue[];
}

function getDefaultData(): FinanceData {
  return {
    expenses: PRELOADED_EXPENSES,
    revenue: [],
  };
}

export function loadData(): FinanceData {
  if (typeof window === "undefined") return getDefaultData();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const defaults = getDefaultData();
      saveData(defaults);
      return defaults;
    }
    return JSON.parse(stored);
  } catch {
    const defaults = getDefaultData();
    saveData(defaults);
    return defaults;
  }
}

export function saveData(data: FinanceData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data to localStorage", e);
  }
}

export function getExpenses(): Expense[] {
  return loadData().expenses;
}

export function saveExpenses(expenses: Expense[]): void {
  const data = loadData();
  data.expenses = expenses;
  saveData(data);
}

export function addExpense(expense: Expense): void {
  const data = loadData();
  data.expenses.unshift(expense);
  saveData(data);
}

export function updateExpense(updated: Expense): void {
  const data = loadData();
  data.expenses = data.expenses.map((e) =>
    e.id === updated.id ? updated : e
  );
  saveData(data);
}

export function deleteExpense(id: string): void {
  const data = loadData();
  data.expenses = data.expenses.filter((e) => e.id !== id);
  saveData(data);
}

export function getRevenue(): Revenue[] {
  return loadData().revenue;
}

export function saveRevenue(revenue: Revenue[]): void {
  const data = loadData();
  data.revenue = revenue;
  saveData(data);
}

export function addRevenue(revenue: Revenue): void {
  const data = loadData();
  data.revenue.unshift(revenue);
  saveData(data);
}

export function updateRevenue(updated: Revenue): void {
  const data = loadData();
  data.revenue = data.revenue.map((r) =>
    r.id === updated.id ? updated : r
  );
  saveData(data);
}

export function deleteRevenue(id: string): void {
  const data = loadData();
  data.revenue = data.revenue.filter((r) => r.id !== id);
  saveData(data);
}

// Auto-categorization based on keywords
const categoryKeywords: Record<string, string[]> = {
  Packaging: [
    "box", "bottle", "bag", "wrap", "tape", "tag", "card", "pack",
    "carton", "label", "cap", "spray", "pump", "container", "envelope",
    "bubble", "ductape", "string", "handbag", "thank you",
  ],
  "Perfume Oils": [
    "oil", "fragrance", "compound", "ethanol", "alcohol", "solvent",
    "concentrate", "notes", "scent", "aroma", "essence", "khamrah",
    "lattafa", "charlie", "gucci", "burberry", "mont blanc",
  ],
  "Printing & DTF": [
    "print", "dtf", "sticker", "flyer", "design", "card", "banner",
    "poster", "label", "story card", "narrative",
  ],
  Equipment: [
    "machine", "gun", "blender", "weight", "sealer", "counter",
    "tool", "equipment", "device", "glass bottle",
  ],
  "Digital & Marketing": [
    "website", "domain", "hosting", "social media", "tiktok", "instagram",
    "facebook", "animation", "marketing", "ad", "campaign", "digital",
    "online", "seo", "content",
  ],
  Transport: [
    "rikshaw", "bus", "fare", "delivery", "courier", "travel",
    "transport", "trip", "bike", "cab", "fuel", "petrol",
  ],
  "Testing & Misc": [
    "test", "sample", "trial", "experiment", "quality", "review",
    "misc", "other", "random", "initial",
  ],
};

export function suggestCategory(description: string): string | null {
  const lower = description.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += keyword.length; // Longer matches are more specific
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
}
