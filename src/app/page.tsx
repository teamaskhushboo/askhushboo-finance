"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar, { BottomNav } from "@/components/sidebar";
import Dashboard from "@/components/dashboard";
import ExpenseManager from "@/components/expense-manager";
import RevenueManager from "@/components/revenue-manager";
import AIAssistant from "@/components/ai-assistant";
import InsightsPanel from "@/components/insights-panel";
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
    aiProvider: "free",
    aiModelName: "z-ai-built-in",
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
        // Seed initial data if needed (only if Firestore is empty)
        await seedInitialData();

        // Load initial data
        const [expensesData, revenueData, settingsData] = await Promise.all([
          getExpenses(),
          getRevenue(),
          getSettings(),
        ]);

        setExpenses(expensesData);
        setRevenue(revenueData);
        setSettings(settingsData);
        setIsFirebaseConnected(true);
        setIsHydrated(true);

        // Set up real-time listeners
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

  // Expense CRUD
  const handleAddExpense = useCallback(async (expense: Expense) => {
    const newExpense = await addExpenseFirestore(expense);
    return newExpense;
  }, []);

  const handleUpdateExpense = useCallback(async (expense: Expense) => {
    const updatedExpense = await updateExpenseFirestore(expense);
    return updatedExpense;
  }, []);

  const handleDeleteExpense = useCallback(async (id: string) => {
    await deleteExpenseFirestore(id);
  }, []);

  // Revenue CRUD
  const handleAddRevenue = useCallback(async (rev: Revenue) => {
    const newRevenue = await addRevenueFirestore(rev);
    return newRevenue;
  }, []);

  const handleUpdateRevenue = useCallback(async (rev: Revenue) => {
    const updatedRevenue = await updateRevenueFirestore(rev);
    return updatedRevenue;
  }, []);

  const handleDeleteRevenue = useCallback(async (id: string) => {
    await deleteRevenueFirestore(id);
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💛</div>
          <h1 className="text-2xl font-bold text-gold mb-2">#AS KHUSHBOO</h1>
          <p className="text-muted-foreground text-sm">
            Connecting to Firebase...
          </p>
        </div>
      </div>
    );
  }

  return (
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
            <h1 className="text-gold font-bold text-lg">#AS KHUSHBOO</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto custom-scrollbar">
          {/* Page title for desktop */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">
                #AS KHUSHBOO <span className="text-gold">Finance</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Khushboo That Speaks for YOU 💛
              </p>
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
  );
}
