import { Expense, Revenue, AppSettings } from "./types";
import { PRELOADED_EXPENSES } from "./data";

// LocalStorage keys (fallback when server-side Firebase is unavailable)
const LS_EXPENSES_KEY = "askhushboo_expenses";
const LS_REVENUE_KEY = "askhushboo_revenue";
const LS_SETTINGS_KEY = "askhushboo_settings";
const LS_SEEDED_KEY = "askhushboo_seeded_v2";

// Track server availability globally
let serverAvailable: boolean | null = null;

// ========== LocalStorage helpers ==========

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("LocalStorage write failed:", e);
  }
}

// Test if server-side API is reachable (single time check)
export async function checkServerAvailability(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const res = await fetch("/api/health", { method: "GET" });
    serverAvailable = res.ok;
    return serverAvailable;
  } catch {
    serverAvailable = false;
    return false;
  }
}

// ========== Expenses ==========

export async function getExpenses(): Promise<Expense[]> {
  // Try server first
  try {
    const res = await fetch("/api/expenses", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.expenses && Array.isArray(data.expenses)) {
        serverAvailable = true;
        return data.expenses as Expense[];
      }
    }
    // 503 means server is up but Firebase env vars not set
    if (res.status === 503) {
      serverAvailable = false;
      console.warn("[Storage] Server Firebase not configured, using localStorage");
    }
  } catch (e) {
    console.warn("[Storage] Server fetch failed, using localStorage:", e instanceof Error ? e.message : String(e));
    serverAvailable = false;
  }

  // Fallback: localStorage
  let expenses = readLS<Expense[]>(LS_EXPENSES_KEY, []);

  // Auto-seed preloaded expenses on first run
  if (expenses.length === 0) {
    const seeded = readLS<boolean>(LS_SEEDED_KEY, false);
    if (!seeded) {
      expenses = [...PRELOADED_EXPENSES];
      writeLS(LS_EXPENSES_KEY, expenses);
      writeLS(LS_SEEDED_KEY, true);
    }
  }

  return expenses.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function addExpense(expense: Expense): Promise<Expense> {
  // Try server first
  if (serverAvailable !== false) {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expense }),
      });
      if (res.ok) {
        const data = await res.json();
        serverAvailable = true;
        return data.expense as Expense;
      }
      if (res.status === 503) serverAvailable = false;
    } catch (e) {
      console.warn("[Storage] Server add failed, using localStorage:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
    }
  }

  // Fallback: localStorage
  const expenses = readLS<Expense[]>(LS_EXPENSES_KEY, []);
  expenses.push(expense);
  writeLS(LS_EXPENSES_KEY, expenses);
  return expense;
}

export async function updateExpense(expense: Expense): Promise<Expense> {
  if (serverAvailable !== false) {
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expense }),
      });
      if (res.ok) {
        serverAvailable = true;
        return expense;
      }
      if (res.status === 503) serverAvailable = false;
    } catch (e) {
      console.warn("[Storage] Server update failed, using localStorage:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
    }
  }

  // Fallback: localStorage
  const expenses = readLS<Expense[]>(LS_EXPENSES_KEY, []);
  const idx = expenses.findIndex((e) => e.id === expense.id);
  if (idx >= 0) {
    expenses[idx] = expense;
    writeLS(LS_EXPENSES_KEY, expenses);
  }
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  if (serverAvailable !== false) {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        serverAvailable = true;
        return;
      }
      if (res.status === 503) serverAvailable = false;
    } catch (e) {
      console.warn("[Storage] Server delete failed, using localStorage:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
    }
  }

  // Fallback: localStorage
  const expenses = readLS<Expense[]>(LS_EXPENSES_KEY, []);
  writeLS(LS_EXPENSES_KEY, expenses.filter((e) => e.id !== id));
}

// ========== Revenue ==========

export async function getRevenue(): Promise<Revenue[]> {
  try {
    const res = await fetch("/api/revenue", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.revenue && Array.isArray(data.revenue)) {
        serverAvailable = true;
        return data.revenue as Revenue[];
      }
    }
    if (res.status === 503) serverAvailable = false;
  } catch (e) {
    console.warn("[Storage] Server fetch failed, using localStorage:", e instanceof Error ? e.message : String(e));
    serverAvailable = false;
  }

  return readLS<Revenue[]>(LS_REVENUE_KEY, []).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function addRevenue(revenue: Revenue): Promise<Revenue> {
  if (serverAvailable !== false) {
    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revenue }),
      });
      if (res.ok) {
        const data = await res.json();
        serverAvailable = true;
        return data.revenue as Revenue;
      }
      if (res.status === 503) serverAvailable = false;
    } catch (e) {
      console.warn("[Storage] Server add failed, using localStorage:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
    }
  }

  const revenueList = readLS<Revenue[]>(LS_REVENUE_KEY, []);
  revenueList.push(revenue);
  writeLS(LS_REVENUE_KEY, revenueList);
  return revenue;
}

export async function updateRevenue(revenue: Revenue): Promise<Revenue> {
  if (serverAvailable !== false) {
    try {
      const res = await fetch(`/api/revenue/${revenue.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revenue }),
      });
      if (res.ok) {
        serverAvailable = true;
        return revenue;
      }
      if (res.status === 503) serverAvailable = false;
    } catch (e) {
      console.warn("[Storage] Server update failed, using localStorage:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
    }
  }

  const revenueList = readLS<Revenue[]>(LS_REVENUE_KEY, []);
  const idx = revenueList.findIndex((r) => r.id === revenue.id);
  if (idx >= 0) {
    revenueList[idx] = revenue;
    writeLS(LS_REVENUE_KEY, revenueList);
  }
  return revenue;
}

export async function deleteRevenue(id: string): Promise<void> {
  if (serverAvailable !== false) {
    try {
      const res = await fetch(`/api/revenue/${id}`, { method: "DELETE" });
      if (res.ok) {
        serverAvailable = true;
        return;
      }
      if (res.status === 503) serverAvailable = false;
    } catch (e) {
      console.warn("[Storage] Server delete failed, using localStorage:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
    }
  }

  const revenueList = readLS<Revenue[]>(LS_REVENUE_KEY, []);
  writeLS(LS_REVENUE_KEY, revenueList.filter((r) => r.id !== id));
}

// ========== Settings ==========

export async function getSettings(): Promise<AppSettings> {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      serverAvailable = true;
      return {
        id: data.id || "main",
        aiApiKey: data.aiApiKey || "",
        aiProvider: data.aiProvider || "groq",
        aiModelName: data.aiModelName || "llama-3.3-70b-versatile",
        aiCustomEndpoint: data.aiCustomEndpoint || "",
        updatedAt: data.updatedAt || null,
      };
    }
    if (res.status === 503) serverAvailable = false;
  } catch (e) {
    console.warn("[Storage] Server settings fetch failed, using localStorage:", e instanceof Error ? e.message : String(e));
    serverAvailable = false;
  }

  // Fallback: localStorage
  const lsSettings = readLS<Partial<AppSettings>>(LS_SETTINGS_KEY, {});
  return {
    id: "main",
    aiApiKey: lsSettings.aiApiKey || "",
    aiProvider: (lsSettings.aiProvider as AppSettings["aiProvider"]) || "groq",
    aiModelName: lsSettings.aiModelName || "llama-3.3-70b-versatile",
    aiCustomEndpoint: lsSettings.aiCustomEndpoint || "",
    updatedAt: lsSettings.updatedAt || null,
  };
}

export async function saveSettings(settings: AppSettings): Promise<{ success: boolean; firebaseConnected: boolean; error?: string }> {
  // Always save to localStorage (works offline)
  writeLS(LS_SETTINGS_KEY, settings);

  // Try to save to server
  if (serverAvailable !== false) {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiApiKey: settings.aiApiKey,
          aiProvider: settings.aiProvider,
          aiModelName: settings.aiModelName,
          aiCustomEndpoint: settings.aiCustomEndpoint,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        serverAvailable = true;
        return { success: true, firebaseConnected: data.firebaseConnected ?? true };
      }
      const errData = await res.json().catch(() => ({}));
      if (res.status === 503) serverAvailable = false;
      return {
        success: false,
        firebaseConnected: false,
        error: errData.error || `Server returned ${res.status}`,
      };
    } catch (e) {
      console.warn("[Storage] Server settings save failed, using localStorage only:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
      return {
        success: false,
        firebaseConnected: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return { success: true, firebaseConnected: false };
}

// ========== Seed Data ==========

export async function seedInitialData(): Promise<void> {
  await checkServerAvailability();

  if (serverAvailable === true) {
    // Server path - request with seed=true so server seeds Firestore if empty
    try {
      await fetch("/api/expenses?seed=true", { cache: "no-store" });
      return;
    } catch (e) {
      console.warn("[Storage] Server seed request failed:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
    }
  }

  // localStorage path - seed if not done yet
  const existing = readLS<Expense[]>(LS_EXPENSES_KEY, []);
  const seeded = readLS<boolean>(LS_SEEDED_KEY, false);
  if (existing.length === 0 && !seeded) {
    writeLS(LS_EXPENSES_KEY, [...PRELOADED_EXPENSES]);
    writeLS(LS_SEEDED_KEY, true);
    console.log(`[Storage] Seeded ${PRELOADED_EXPENSES.length} pre-loaded expenses to localStorage`);
  }
}

// Force re-seed function (for the "Restore Pre-loaded Expenses" button)
export async function forceReseedExpenses(): Promise<number> {
  if (serverAvailable !== false) {
    try {
      const res = await fetch("/api/expenses/reseed", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        serverAvailable = true;
        return data.count || PRELOADED_EXPENSES.length;
      }
      if (res.status === 503) serverAvailable = false;
    } catch (e) {
      console.warn("[Storage] Server reseed failed, using localStorage:", e instanceof Error ? e.message : String(e));
      serverAvailable = false;
    }
  }

  // localStorage path
  writeLS(LS_EXPENSES_KEY, [...PRELOADED_EXPENSES]);
  writeLS(LS_SEEDED_KEY, true);
  return PRELOADED_EXPENSES.length;
}

// ========== Real-time Listeners (now polling-based) ==========

export function onExpensesChange(callback: (expenses: Expense[]) => void): () => void {
  // Try server polling if server is available
  if (serverAvailable === true) {
    return startServerPolling<Expense>("/api/expenses", "expenses", callback);
  }

  // Fallback: poll localStorage
  return startLSPolling(LS_EXPENSES_KEY, callback);
}

export function onRevenueChange(callback: (revenue: Revenue[]) => void): () => void {
  if (serverAvailable === true) {
    return startServerPolling<Revenue>("/api/revenue", "revenue", callback);
  }

  return startLSPolling(LS_REVENUE_KEY, callback);
}

// Poll server API for changes (every 5 seconds)
function startServerPolling<T>(
  url: string,
  dataKey: string,
  callback: (data: T[]) => void
): () => void {
  let lastValue = "";
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const items = data[dataKey] || [];
        const serialized = JSON.stringify(items);
        if (serialized !== lastValue) {
          lastValue = serialized;
          callback(items as T[]);
        }
      }
    } catch (e) {
      // Network error, keep polling
      console.warn("[Storage] Server poll error:", e instanceof Error ? e.message : String(e));
    }
  };

  // Initial fetch
  poll();

  const interval = setInterval(poll, 5000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

// Poll localStorage for changes (poor man's real-time)
function startLSPolling<T>(key: string, callback: (data: T[]) => void): () => void {
  let lastValue = JSON.stringify(readLS<T[]>(key, []));
  callback(readLS<T[]>(key, []));

  const interval = setInterval(() => {
    const currentValue = JSON.stringify(readLS<T[]>(key, []));
    if (currentValue !== lastValue) {
      lastValue = currentValue;
      callback(readLS<T[]>(key, []));
    }
  }, 1000);

  const storageHandler = (e: StorageEvent) => {
    if (e.key === key && e.newValue) {
      try {
        const newValue = JSON.parse(e.newValue) as T[];
        lastValue = JSON.stringify(newValue);
        callback(newValue);
      } catch {
        // ignore
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", storageHandler);
  }

  return () => {
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", storageHandler);
    }
  };
}

// ========== Utility ==========

export function isFirebaseConnected(): boolean {
  return serverAvailable === true;
}

export function resetFirebaseCheck(): void {
  serverAvailable = null;
}

// ========== Auto-categorization ==========

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
    "print", "dtf", "sticker", "flyer", "design", "banner",
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
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
}
