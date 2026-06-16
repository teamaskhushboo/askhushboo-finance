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

// ========== Expenses ==========

export async function getExpenses(): Promise<Expense[]> {
  const q = query(collection(db, EXPENSES_COLLECTION), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
}

export async function addExpense(expense: Expense): Promise<Expense> {
  const { id, ...data } = expense;
  const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { ...expense, id: docRef.id };
}

export async function updateExpense(expense: Expense): Promise<Expense> {
  const { id, ...data } = expense;
  const docRef = doc(db, EXPENSES_COLLECTION, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const docRef = doc(db, EXPENSES_COLLECTION, id);
  await deleteDoc(docRef);
}

// ========== Revenue ==========

export async function getRevenue(): Promise<Revenue[]> {
  const q = query(collection(db, REVENUE_COLLECTION), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Revenue));
}

export async function addRevenue(revenue: Revenue): Promise<Revenue> {
  const { id, ...data } = revenue;
  const docRef = await addDoc(collection(db, REVENUE_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { ...revenue, id: docRef.id };
}

export async function updateRevenue(revenue: Revenue): Promise<Revenue> {
  const { id, ...data } = revenue;
  const docRef = doc(db, REVENUE_COLLECTION, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return revenue;
}

export async function deleteRevenue(id: string): Promise<void> {
  const docRef = doc(db, REVENUE_COLLECTION, id);
  await deleteDoc(docRef);
}

// ========== Settings ==========

export async function getSettings(): Promise<AppSettings> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as AppSettings;
  }
  return {
    id: SETTINGS_DOC,
    aiApiKey: "",
    aiProvider: "free",
    aiModelName: "z-ai-built-in",
    aiCustomEndpoint: "",
    updatedAt: null,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  const { id, ...data } = settings;
  await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ========== Seed Data ==========

export async function seedInitialData(): Promise<void> {
  // Check if expenses already exist
  const snapshot = await getDocs(collection(db, EXPENSES_COLLECTION));
  if (!snapshot.empty) return; // Already seeded

  // Seed the 39 preloaded expenses
  for (const expense of PRELOADED_EXPENSES) {
    const { id, ...data } = expense;
    await addDoc(collection(db, EXPENSES_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }
}

// ========== Real-time Listeners ==========

export function onExpensesChange(callback: (expenses: Expense[]) => void): () => void {
  const q = query(collection(db, EXPENSES_COLLECTION), orderBy("date", "desc"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
    callback(expenses);
  });
  return unsubscribe;
}

export function onRevenueChange(callback: (revenue: Revenue[]) => void): () => void {
  const q = query(collection(db, REVENUE_COLLECTION), orderBy("date", "desc"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const revenue = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Revenue));
    callback(revenue);
  });
  return unsubscribe;
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
