"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Bot,
  Lightbulb,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ActiveTab } from "@/lib/types";
import { cn } from "@/lib/utils";
import AnimatedLogo from "./animated-logo";

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
}

const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { id: "expenses", label: "Expenses", icon: <Receipt size={20} /> },
  { id: "revenue", label: "Revenue", icon: <TrendingUp size={20} /> },
  { id: "ai-assistant", label: "AI Assistant", icon: <Bot size={20} /> },
  { id: "insights", label: "Insights", icon: <Lightbulb size={20} /> },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  isConnected,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-[#0A0A0A] border-r border-[rgba(223,173,24,0.15)] flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="p-6 border-b border-[rgba(223,173,24,0.15)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AnimatedLogo size="sm" />
              <div>
                <h1 className="as-logo-text text-xl font-bold tracking-wide">
                  #AS KHUSHBOO
                </h1>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Khushboo That Speaks for YOU 💛
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-muted-foreground hover:text-gold transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onTabChange(item.id);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === item.id
                  ? "bg-gold/10 text-gold border border-gold/30 gold-glow"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <span
                className={cn(
                  activeTab === item.id ? "text-gold" : "text-muted-foreground"
                )}
              >
                {item.icon}
              </span>
              {item.label}
            </motion.button>
          ))}
        </nav>

        {/* Firebase status & footer */}
        <div className="p-4 border-t border-[rgba(223,173,24,0.15)]">
          {/* Connection status */}
          <div className="flex items-center gap-2 mb-3">
            {isConnected ? (
              <Wifi size={12} className="text-success" />
            ) : (
              <WifiOff size={12} className="text-danger" />
            )}
            <span className={`text-xs ${isConnected ? "text-success" : "text-danger"}`}>
              {isConnected ? "Firebase Connected" : "Connecting..."}
            </span>
            <div
              className={`w-2 h-2 rounded-full ml-auto ${
                isConnected ? "bg-success animate-pulse" : "bg-danger"
              }`}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Founded by <span className="text-gold">Abdullah</span>
            </p>
            <p>
              Team: <span className="text-foreground">Ashir</span> (Details) &bull;{" "}
              <span className="text-foreground">Ahsan</span> (PM)
            </p>
            <p className="text-gold/60 pt-1">6 Perfumes &bull; Luxury &bull; 💛</p>
          </div>
        </div>
      </aside>
    </>
  );
}

// Mobile bottom navigation
export function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-[rgba(223,173,24,0.15)] lg:hidden pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all",
              activeTab === item.id
                ? "text-gold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
