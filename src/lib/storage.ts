import {
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  getDoc,
  serverTimestamp,
} from "./firebase";
import { Expense, Revenue, AppSettings } from "./types";
import { PRELOADED_EXPENSES } from "./data";

const EXPENSES_COLLECTION = "finance_expenses";
const REVENUE_COLLECTION = "finance_revenue";
const SETTINGS_DOC = "main";
const SETTINGS_COLLECTION = "finance_settings";

// LocalStorage keys (fallback when Firebase is unavailable)
const LS_EXPENSES_KEY = "askhushboo_expenses";
const LS_REVENUE_KEY = "askhushboo_revenue";
const LS_SETTINGS_KEY = "askhushboo_settings";
const LS_SEEDED_KEY = "askhushboo_seeded_v1";

// Track Firebase availability globally
let firebaseAvailable: boolean | null = null;

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

// Test if Firebase is reachable (single time check)
export async function checkFirebaseAvailability(): Promise<boolean> {
  if (firebaseAvailable !== null) return firebaseAvailable;
  try {
    // Try a simple read operation
    await getDocs(collection(db, EXPENSES_COLLECTION));
    firebaseAvailable = true;
    return true;
  } catch (e) {
    console.warn("[Storage] Firebase unavailable, using localStorage fallback:", e instanceof Error ? e.message : String(e));
    firebaseAvailable = false;
    return false;
  }
}

// ========== Expenses ==========

export async function getExpenses(): Promise<Expense[]> {
  // Try Firebase first
  if (firebaseAvailable !== false) {
    try {
      const q = query(collection(db, EXPENSES_COLLECTION), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        firebaseAvailable = true;
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
      }
      // Empty Firestore - might be locked or genuinely empty
      // Fall through to localStorage
    } catch (e) {
      console.warn("[Storage] Firebase read failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
    }
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
  // Try Firebase first
  if (firebaseAvailable !== false) {
    try {
      const { id, ...data } = expense;
      const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
        ...data,
        createdAt: serverTimestamp(),
      });
      firebaseAvailable = true;
      return { ...expense, id: docRef.id };
    } catch (e) {
      console.warn("[Storage] Firebase write failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
    }
  }

  // Fallback: localStorage
  const expenses = readLS<Expense[]>(LS_EXPENSES_KEY, []);
  expenses.push(expense);
  writeLS(LS_EXPENSES_KEY, expenses);
  return expense;
}

export async function updateExpense(expense: Expense): Promise<Expense> {
  // Try Firebase first
  if (firebaseAvailable !== false) {
    try {
      const { id, ...data } = expense;
      const docRef = doc(db, EXPENSES_COLLECTION, id);
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
      firebaseAvailable = true;
      return expense;
    } catch (e) {
      console.warn("[Storage] Firebase update failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
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
  // Try Firebase first
  if (firebaseAvailable !== false) {
    try {
      const docRef = doc(db, EXPENSES_COLLECTION, id);
      await deleteDoc(docRef);
      firebaseAvailable = true;
      return;
    } catch (e) {
      console.warn("[Storage] Firebase delete failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
    }
  }

  // Fallback: localStorage
  const expenses = readLS<Expense[]>(LS_EXPENSES_KEY, []);
  writeLS(LS_EXPENSES_KEY, expenses.filter((e) => e.id !== id));
}

// ========== Revenue ==========

export async function getRevenue(): Promise<Revenue[]> {
  if (firebaseAvailable !== false) {
    try {
      const q = query(collection(db, REVENUE_COLLECTION), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        firebaseAvailable = true;
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Revenue));
      }
    } catch (e) {
      console.warn("[Storage] Firebase read failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
    }
  }

  return readLS<Revenue[]>(LS_REVENUE_KEY, []).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function addRevenue(revenue: Revenue): Promise<Revenue> {
  if (firebaseAvailable !== false) {
    try {
      const { id, ...data } = revenue;
      const docRef = await addDoc(collection(db, REVENUE_COLLECTION), {
        ...data,
        createdAt: serverTimestamp(),
      });
      firebaseAvailable = true;
      return { ...revenue, id: docRef.id };
    } catch (e) {
      console.warn("[Storage] Firebase write failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
    }
  }

  const revenueList = readLS<Revenue[]>(LS_REVENUE_KEY, []);
  revenueList.push(revenue);
  writeLS(LS_REVENUE_KEY, revenueList);
  return revenue;
}

export async function updateRevenue(revenue: Revenue): Promise<Revenue> {
  if (firebaseAvailable !== false) {
    try {
      const { id, ...data } = revenue;
      const docRef = doc(db, REVENUE_COLLECTION, id);
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
      firebaseAvailable = true;
      return revenue;
    } catch (e) {
      console.warn("[Storage] Firebase update failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
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
  if (firebaseAvailable !== false) {
    try {
      const docRef = doc(db, REVENUE_COLLECTION, id);
      await deleteDoc(docRef);
      firebaseAvailable = true;
      return;
    } catch (e) {
      console.warn("[Storage] Firebase delete failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
    }
  }

  const revenueList = readLS<Revenue[]>(LS_REVENUE_KEY, []);
  writeLS(LS_REVENUE_KEY, revenueList.filter((r) => r.id !== id));
}

// ========== Settings ==========

export async function getSettings(): Promise<AppSettings> {
  if (firebaseAvailable !== false) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        firebaseAvailable = true;
        return { id: snapshot.id, ...snapshot.data() } as AppSettings;
      }
      // If Firestore is reachable but doc doesn't exist, return defaults (will save later)
      firebaseAvailable = true;
    } catch (e) {
      console.warn("[Storage] Firebase settings read failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
    }
  }

  // Fallback: localStorage
  const lsSettings = readLS<Partial<AppSettings>>(LS_SETTINGS_KEY, {});
  return {
    id: SETTINGS_DOC,
    aiApiKey: lsSettings.aiApiKey || "",
    aiProvider: (lsSettings.aiProvider as AppSettings["aiProvider"]) || "groq",
    aiModelName: lsSettings.aiModelName || "llama-3.3-70b-versatile",
    aiCustomEndpoint: lsSettings.aiCustomEndpoint || "",
    updatedAt: lsSettings.updatedAt || null,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  // Always save to localStorage (works offline)
  writeLS(LS_SETTINGS_KEY, settings);

  // Try to also save to Firebase
  if (firebaseAvailable !== false) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
      const { id, ...data } = settings;
      await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      firebaseAvailable = true;
      return;
    } catch (e) {
      console.warn("[Storage] Firebase settings save failed, using localStorage only:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
      // Don't throw - localStorage already saved
      return;
    }
  }
}

// ========== Seed Data ==========

export async function seedInitialData(): Promise<void> {
  // Check if Firebase is available first
  await checkFirebaseAvailability();

  if (firebaseAvailable === true) {
    // Firebase path - check if Firestore has data
    try {
      const snapshot = await getDocs(collection(db, EXPENSES_COLLECTION));
      if (snapshot.empty) {
        // Seed Firebase
        for (const expense of PRELOADED_EXPENSES) {
          const { id, ...data } = expense;
          await addDoc(collection(db, EXPENSES_COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
          });
        }
      }
      return;
    } catch (e) {
      console.warn("[Storage] Firebase seed check failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
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
  if (firebaseAvailable !== false) {
    try {
      // Clear and reseed Firebase
      const snapshot = await getDocs(collection(db, EXPENSES_COLLECTION));
      const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      for (const expense of PRELOADED_EXPENSES) {
        const { id, ...data } = expense;
        await addDoc(collection(db, EXPENSES_COLLECTION), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      firebaseAvailable = true;
      return PRELOADED_EXPENSES.length;
    } catch (e) {
      console.warn("[Storage] Firebase reseed failed, using localStorage:", e instanceof Error ? e.message : String(e));
      firebaseAvailable = false;
    }
  }

  // localStorage path
  writeLS(LS_EXPENSES_KEY, [...PRELOADED_EXPENSES]);
  writeLS(LS_SEEDED_KEY, true);
  return PRELOADED_EXPENSES.length;
}

// ========== Real-time Listeners ==========

export function onExpensesChange(callback: (expenses: Expense[]) => void): () => void {
  if (firebaseAvailable === true) {
    try {
      const q = query(collection(db, EXPENSES_COLLECTION), orderBy("date", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const expenses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
          callback(expenses);
        },
        (error) => {
          console.warn("[Storage] Firebase onSnapshot error, switching to localStorage polling:", error.message);
          firebaseAvailable = false;
          // Fall back to localStorage polling
          startLSPolling(LS_EXPENSES_KEY, callback);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn("[Storage] Firebase listener setup failed:", e);
      firebaseAvailable = false;
    }
  }

  // Fallback: poll localStorage
  return startLSPolling(LS_EXPENSES_KEY, callback);
}

export function onRevenueChange(callback: (revenue: Revenue[]) => void): () => void {
  if (firebaseAvailable === true) {
    try {
      const q = query(collection(db, REVENUE_COLLECTION), orderBy("date", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const revenue = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Revenue));
          callback(revenue);
        },
        (error) => {
          console.warn("[Storage] Firebase onSnapshot error, switching to localStorage polling:", error.message);
          firebaseAvailable = false;
          startLSPolling(LS_REVENUE_KEY, callback);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn("[Storage] Firebase listener setup failed:", e);
      firebaseAvailable = false;
    }
  }

  return startLSPolling(LS_REVENUE_KEY, callback);
}

// Poll localStorage for changes (poor man's real-time)
function startLSPolling<T>(key: string, callback: (data: T[]) => void): () => void {
  // Initial load
  let lastValue = JSON.stringify(readLS<T[]>(key, []));
  callback(readLS<T[]>(key, []));

  const interval = setInterval(() => {
    const currentValue = JSON.stringify(readLS<T[]>(key, []));
    if (currentValue !== lastValue) {
      lastValue = currentValue;
      callback(readLS<T[]>(key, []));
    }
  }, 1000);

  // Also listen for storage events (cross-tab updates)
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
  return firebaseAvailable === true;
}

export function resetFirebaseCheck(): void {
  firebaseAvailable = null;
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
