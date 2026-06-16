"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar, { BottomNav } from "@/components/sidebar";
import Dashboard from "@/components/dashboard";
import ExpenseManager from "@/components/expense-manager";
import RevenueManager from "@/components/revenue-manager";
import AIAssistant from "@/components/ai-assistant";
import InsightsPanel from "@/components/insights-panel";
import AuthGate from "@/components/auth-gate";
import AnimatedLogo from "@/components/animated-logo";
import { ActiveTab, Expense, Revenue, AppSettings } from "@/lib/types";
import {
  getExpenses,
  addExpense as addExpenseFirestore,
  updateExpense as updateExpenseFirestore,
  deleteExpense as deleteExpenseFirestore,
  getRevenue,
  addRevenue as addRevenueFirestore,
  updateRevenue as updateRevenueFirestore,
  deleteRevenue as deleteRevenueFirestore,
  getSettings,
  saveSettings,
  seedInitialData,
  forceReseedExpenses,
  onExpensesChange,
  onRevenueChange,
} from "@/lib/storage";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    id: "main",
    aiApiKey: "",
    aiProvider: "groq",
    aiModelName: "llama-3.3-70b-versatile",
    aiCustomEndpoint: "",
    updatedAt: null,
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize Firebase data and real-time listeners
  useEffect(() => {
    let unsubscribeExpenses: (() => void) | undefined;
    let unsubscribeRevenue: (() => void) | undefined;

    const init = async () => {
      try {
        // Load settings from localStorage FIRST (instant, guaranteed to work)
        try {
          const lsSettings = localStorage.getItem("askhushboo_settings");
          if (lsSettings) {
            const parsed = JSON.parse(lsSettings);
            setSettings({
              id: "main",
              aiApiKey: parsed.aiApiKey || "",
              aiProvider: parsed.aiProvider || "groq",
              aiModelName: parsed.aiModelName || "llama-3.3-70b-versatile",
              aiCustomEndpoint: parsed.aiCustomEndpoint || "",
              updatedAt: parsed.updatedAt || null,
            });
          }
        } catch (e) {
          console.warn("Could not load settings from localStorage:", e);
        }

        // Seed initial data if needed (handles Firebase + localStorage)
        await seedInitialData();

        // Load initial data (falls back to localStorage if Firebase unavailable)
        const [expensesData, revenueData, settingsData] = await Promise.all([
          getExpenses(),
          getRevenue(),
          getSettings(),
        ]);

        setExpenses(expensesData);
        setRevenue(revenueData);
        // Only overwrite settings if Firebase returned actual data (not defaults)
        if (settingsData.aiApiKey || settingsData.updatedAt) {
          setSettings(settingsData);
        }
        setIsFirebaseConnected(true); // True = data is loaded (from either source)
        setIsHydrated(true);

        // Set up real-time listeners (auto-falls back to localStorage polling)
        unsubscribeExpenses = onExpensesChange((updatedExpenses) => {
          setExpenses(updatedExpenses);
        });

        unsubscribeRevenue = onRevenueChange((updatedRevenue) => {
          setRevenue(updatedRevenue);
        });
      } catch (error) {
        console.error("Firebase initialization error:", error);
        setIsFirebaseConnected(false);
        setIsHydrated(true);
      }
    };

    init();

    return () => {
      unsubscribeExpenses?.();
      unsubscribeRevenue?.();
    };
  }, []);

  // Expense CRUD - with optimistic state updates for instant dashboard refresh
  const handleAddExpense = useCallback(async (expense: Expense) => {
    const newExpense = await addExpenseFirestore(expense);
    // Instant local state update (no waiting for polling)
    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      return updated.sort((a, b) => (a.date < b.date ? 1 : -1));
    });
    return newExpense;
  }, []);

  const handleUpdateExpense = useCallback(async (expense: Expense) => {
    const updatedExpense = await updateExpenseFirestore(expense);
    // Instant local state update
    setExpenses((prev) => {
      const updated = prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));
      return updated.sort((a, b) => (a.date < b.date ? 1 : -1));
    });
    return updatedExpense;
  }, []);

  const handleDeleteExpense = useCallback(async (id: string) => {
    await deleteExpenseFirestore(id);
    // Instant local state update
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Restore pre-loaded expenses (39 items, Rs 189,530)
  const handleRestoreExpenses = useCallback(async () => {
    const count = await forceReseedExpenses();
    // Force refresh from server
    try {
      const freshExpenses = await getExpenses();
      setExpenses(freshExpenses);
    } catch (e) {
      console.warn("Refresh after reseed failed:", e);
    }
    return count;
  }, [getExpenses]);

  // Revenue CRUD - with optimistic state updates
  const handleAddRevenue = useCallback(async (rev: Revenue) => {
    const newRevenue = await addRevenueFirestore(rev);
    setRevenue((prev) => {
      const updated = [newRevenue, ...prev];
      return updated.sort((a, b) => (a.date < b.date ? 1 : -1));
    });
    return newRevenue;
  }, []);

  const handleUpdateRevenue = useCallback(async (rev: Revenue) => {
    const updatedRevenue = await updateRevenueFirestore(rev);
    setRevenue((prev) => {
      const updated = prev.map((r) => (r.id === updatedRevenue.id ? updatedRevenue : r));
      return updated.sort((a, b) => (a.date < b.date ? 1 : -1));
    });
    return updatedRevenue;
  }, []);

  const handleDeleteRevenue = useCallback(async (id: string) => {
    await deleteRevenueFirestore(id);
    setRevenue((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Settings
  const handleSettingsChange = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
  }, []);

  // Render current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard expenses={expenses} revenue={revenue} isLoading={!isHydrated} />;
      case "expenses":
        return (
          <ExpenseManager
            expenses={expenses}
            onAdd={handleAddExpense}
            onUpdate={handleUpdateExpense}
            onDelete={handleDeleteExpense}
            onRestore={handleRestoreExpenses}
          />
        );
      case "revenue":
        return (
          <RevenueManager
            revenue={revenue}
            onAdd={handleAddRevenue}
            onUpdate={handleUpdateRevenue}
            onDelete={handleDeleteRevenue}
          />
        );
      case "ai-assistant":
        return (
          <AIAssistant
            expenses={expenses}
            revenue={revenue}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddRevenue={handleAddRevenue}
            onUpdateRevenue={handleUpdateRevenue}
            onDeleteRevenue={handleDeleteRevenue}
          />
        );
      case "insights":
        return (
          <InsightsPanel
            expenses={expenses}
            revenue={revenue}
            settings={settings}
          />
        );
      default:
        return <Dashboard expenses={expenses} revenue={revenue} isLoading={!isHydrated} />;
    }
  };

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <AuthGate>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <AnimatedLogo size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              Loading your finance data...
            </p>
          </div>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isConnected={isFirebaseConnected}
      />

      {/* Main content */}
      <main className="flex-1 min-h-screen flex flex-col lg:ml-0">
        {/* Top header (mobile) */}
        <header className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-[rgba(223,173,24,0.15)] lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="text-gold hover:bg-gold/10"
            >
              <Menu size={22} />
            </Button>
            <div className="flex items-center justify-center">
              <AnimatedLogo size="xs" />
            </div>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto custom-scrollbar">
          {/* Page title for desktop */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <AnimatedLogo size="lg" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {expenses.length} expenses &bull; {revenue.length} revenue
                entries
              </span>
            </div>
          </div>

          {renderTabContent()}
        </div>
      </main>

      {/* Bottom navigation (mobile) */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
    </AuthGate>
  );
}
