"use client";

import { useState, useReducer, useCallback, useEffect } from "react";
import Sidebar, { BottomNav } from "@/components/sidebar";
import Dashboard from "@/components/dashboard";
import ExpenseManager from "@/components/expense-manager";
import RevenueManager from "@/components/revenue-manager";
import AIAssistant from "@/components/ai-assistant";
import InsightsPanel from "@/components/insights-panel";
import { ActiveTab, Expense, Revenue } from "@/lib/types";
import {
  loadData,
  addExpense as addExpenseStorage,
  updateExpense as updateExpenseStorage,
  deleteExpense as deleteExpenseStorage,
  addRevenue as addRevenueStorage,
  updateRevenue as updateRevenueStorage,
  deleteRevenue as deleteRevenueStorage,
} from "@/lib/storage";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinanceState {
  expenses: Expense[];
  revenue: Revenue[];
  isHydrated: boolean;
}

type FinanceAction =
  | { type: "HYDRATE"; expenses: Expense[]; revenue: Revenue[] }
  | { type: "ADD_EXPENSE"; expense: Expense }
  | { type: "UPDATE_EXPENSE"; expense: Expense }
  | { type: "DELETE_EXPENSE"; id: string }
  | { type: "ADD_REVENUE"; revenue: Revenue }
  | { type: "UPDATE_REVENUE"; revenue: Revenue }
  | { type: "DELETE_REVENUE"; id: string };

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        expenses: action.expenses,
        revenue: action.revenue,
        isHydrated: true,
      };
    case "ADD_EXPENSE":
      return { ...state, expenses: [action.expense, ...state.expenses] };
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.expense.id ? action.expense : e
        ),
      };
    case "DELETE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.id),
      };
    case "ADD_REVENUE":
      return { ...state, revenue: [action.revenue, ...state.revenue] };
    case "UPDATE_REVENUE":
      return {
        ...state,
        revenue: state.revenue.map((r) =>
          r.id === action.revenue.id ? action.revenue : r
        ),
      };
    case "DELETE_REVENUE":
      return {
        ...state,
        revenue: state.revenue.filter((r) => r.id !== action.id),
      };
    default:
      return state;
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(financeReducer, {
    expenses: [],
    revenue: [],
    isHydrated: false,
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const data = loadData();
    dispatch({
      type: "HYDRATE",
      expenses: data.expenses,
      revenue: data.revenue,
    });
  }, []);

  const handleAddExpense = useCallback((expense: Expense) => {
    addExpenseStorage(expense);
    dispatch({ type: "ADD_EXPENSE", expense });
  }, []);

  const handleUpdateExpense = useCallback((expense: Expense) => {
    updateExpenseStorage(expense);
    dispatch({ type: "UPDATE_EXPENSE", expense });
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    deleteExpenseStorage(id);
    dispatch({ type: "DELETE_EXPENSE", id });
  }, []);

  const handleAddRevenue = useCallback((revenue: Revenue) => {
    addRevenueStorage(revenue);
    dispatch({ type: "ADD_REVENUE", revenue });
  }, []);

  const handleUpdateRevenue = useCallback((revenue: Revenue) => {
    updateRevenueStorage(revenue);
    dispatch({ type: "UPDATE_REVENUE", revenue });
  }, []);

  const handleDeleteRevenue = useCallback((id: string) => {
    deleteRevenueStorage(id);
    dispatch({ type: "DELETE_REVENUE", id });
  }, []);

  // Render current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard expenses={state.expenses} revenue={state.revenue} />;
      case "expenses":
        return (
          <ExpenseManager
            expenses={state.expenses}
            onAdd={handleAddExpense}
            onUpdate={handleUpdateExpense}
            onDelete={handleDeleteExpense}
          />
        );
      case "revenue":
        return (
          <RevenueManager
            revenue={state.revenue}
            onAdd={handleAddRevenue}
            onUpdate={handleUpdateRevenue}
            onDelete={handleDeleteRevenue}
          />
        );
      case "ai-assistant":
        return (
          <AIAssistant expenses={state.expenses} revenue={state.revenue} />
        );
      case "insights":
        return (
          <InsightsPanel expenses={state.expenses} revenue={state.revenue} />
        );
      default:
        return <Dashboard expenses={state.expenses} revenue={state.revenue} />;
    }
  };

  // Show loading while hydrating
  if (!state.isHydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💛</div>
          <h1 className="text-2xl font-bold text-gold mb-2">#AS KHUSHBOO</h1>
          <p className="text-muted-foreground text-sm">
            Loading your finances...
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
                {state.expenses.length} expenses • {state.revenue.length} revenue
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
