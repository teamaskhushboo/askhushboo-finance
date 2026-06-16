"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Key,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { Expense, Revenue, AppSettings, ExpenseCategory, RevenueSource } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import AISettings from "./ai-settings";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: ActionState;
}

interface ActionState {
  type: "add_expense" | "update_expense" | "delete_expense" | "add_revenue" | "update_revenue" | "delete_revenue";
  payload: Record<string, unknown>;
  status: "pending" | "executed" | "failed";
  result?: string;
}

interface AIAssistantProps {
  expenses: Expense[];
  revenue: Revenue[];
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onAddExpense?: (expense: Expense) => Promise<Expense>;
  onUpdateExpense?: (expense: Expense) => Promise<Expense>;
  onDeleteExpense?: (id: string) => Promise<void>;
  onAddRevenue?: (revenue: Revenue) => Promise<Revenue>;
  onUpdateRevenue?: (revenue: Revenue) => Promise<Revenue>;
  onDeleteRevenue?: (id: string) => Promise<void>;
}

const SUGGESTED_QUESTIONS = [
  "Kitna spend hua packaging par?",
  "Total revenue kya hai?",
  "Most profitable perfume kaunsa hai?",
  "Saari expenses ki list do",
  "Kahan zyada paisa lag raha hai?",
  "Savings ke liye kya suggest karte ho?",
];

// Parse AI response to extract action block + clean text
function parseAIResponse(rawResponse: string): {
  text: string;
  action: ActionState | null;
} {
  // Match ```action ... ``` block
  const actionMatch = rawResponse.match(/```action\s*([\s\S]*?)```/);
  if (!actionMatch) {
    return { text: rawResponse.trim(), action: null };
  }

  try {
    const actionJson = JSON.parse(actionMatch[1].trim());
    // Remove the action block from the displayed text
    const textWithoutAction = rawResponse
      .replace(/```action\s*[\s\S]*?```/, "")
      .trim();

    return {
      text: textWithoutAction,
      action: {
        type: actionJson.type as ActionState["type"],
        payload: actionJson.payload || {},
        status: "pending",
      },
    };
  } catch (e) {
    console.warn("Failed to parse AI action block:", e);
    return { text: rawResponse.trim(), action: null };
  }
}

export default function AIAssistant({
  expenses,
  revenue,
  settings,
  onSettingsChange,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddRevenue,
  onUpdateRevenue,
  onDeleteRevenue,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfigured =
    settings.aiProvider === "free" ||
    !!(settings.aiApiKey && settings.aiApiKey.length > 0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Execute an AI-requested action
  const executeAction = useCallback(
    async (messageId: string, action: ActionState): Promise<void> => {
      try {
        let result = "";
        const payload = action.payload;

        if (action.type === "add_expense") {
          if (!onAddExpense) {
            throw new Error("Add expense handler not available");
          }
          const newExpense: Expense = {
            id: uuidv4(),
            date: (payload.date as string) || new Date().toISOString().split("T")[0],
            category: (payload.category as ExpenseCategory) || "Testing & Misc",
            description: (payload.description as string) || "Added by AI",
            amount: Number(payload.amount) || 0,
            paymentMethod: (payload.paymentMethod as string) || "Cash",
            notes: (payload.notes as string) || "Added via AI Assistant",
          };
          await onAddExpense(newExpense);
          result = `Expense added: ${newExpense.description} (Rs ${newExpense.amount.toLocaleString("en-PK")})`;
          toast.success(`AI ne expense add kar diya: ${newExpense.description}`);
        } else if (action.type === "update_expense") {
          if (!onUpdateExpense) {
            throw new Error("Update expense handler not available");
          }
          const expenseId = payload.id as string;
          const existing = expenses.find((e) => e.id === expenseId);
          if (!existing) {
            throw new Error(`Expense with id ${expenseId} not found`);
          }
          const updatedExpense: Expense = {
            ...existing,
            ...(payload.date ? { date: payload.date as string } : {}),
            ...(payload.category ? { category: payload.category as ExpenseCategory } : {}),
            ...(payload.description ? { description: payload.description as string } : {}),
            ...(payload.amount !== undefined ? { amount: Number(payload.amount) } : {}),
            ...(payload.paymentMethod ? { paymentMethod: payload.paymentMethod as string } : {}),
            ...(payload.notes ? { notes: payload.notes as string } : {}),
          };
          await onUpdateExpense(updatedExpense);
          result = `Expense updated: ${updatedExpense.description}`;
          toast.success(`AI ne expense update kar diya`);
        } else if (action.type === "delete_expense") {
          if (!onDeleteExpense) {
            throw new Error("Delete expense handler not available");
          }
          const expenseId = payload.id as string;
          const existing = expenses.find((e) => e.id === expenseId);
          await onDeleteExpense(expenseId);
          result = `Expense deleted: ${existing?.description || expenseId}`;
          toast.success(`AI ne expense delete kar diya`);
        } else if (action.type === "add_revenue") {
          if (!onAddRevenue) {
            throw new Error("Add revenue handler not available");
          }
          const newRevenue: Revenue = {
            id: uuidv4(),
            date: (payload.date as string) || new Date().toISOString().split("T")[0],
            source: (payload.source as RevenueSource) || "Direct Sale",
            description: (payload.description as string) || "Added by AI",
            amount: Number(payload.amount) || 0,
            perfume: payload.perfume as string | undefined,
            quantity: Number(payload.quantity) || 1,
            notes: (payload.notes as string) || "Added via AI Assistant",
          };
          await onAddRevenue(newRevenue);
          result = `Revenue added: ${newRevenue.description} (Rs ${newRevenue.amount.toLocaleString("en-PK")})`;
          toast.success(`AI ne revenue add kar diya: ${newRevenue.description}`);
        } else {
          throw new Error(`Unknown action type: ${action.type}`);
        }

        // Mark message action as executed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.action
              ? { ...m, action: { ...m.action, status: "executed", result } }
              : m
          )
        );
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error("Action execution failed:", errMsg);
        toast.error(`Action failed: ${errMsg}`);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.action
              ? { ...m, action: { ...m.action, status: "failed", result: errMsg } }
              : m
          )
        );
      }
    },
    [expenses, onAddExpense, onUpdateExpense, onDeleteExpense, onAddRevenue]
  );

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          expenses,
          revenue,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          apiKey: settings.aiApiKey || "",
          provider: settings.aiProvider || "groq",
          modelName: settings.aiModelName || "llama-3.3-70b-versatile",
          customEndpoint: settings.aiCustomEndpoint || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      const parsed = parseAIResponse(data.response || "Sorry, I could not process that.");

      let finalContent = parsed.text;
      if (data.warning) {
        finalContent = `${data.warning}\n\n${finalContent}`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalContent,
        timestamp: new Date(),
        action: parsed.action || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-execute the action immediately
      if (parsed.action && parsed.action.status === "pending") {
        // Small delay so user can see the message first
        setTimeout(() => {
          executeAction(assistantMessage.id, parsed.action!);
        }, 800);
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, AI service is currently unavailable. Please try again later. 💛",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const getActionIcon = (type: ActionState["type"]) => {
    switch (type) {
      case "add_expense":
      case "add_revenue":
        return <Plus size={12} />;
      case "update_expense":
      case "update_revenue":
        return <Edit size={12} />;
      case "delete_expense":
      case "delete_revenue":
        return <Trash2 size={12} />;
    }
  };

  const getActionLabel = (type: ActionState["type"]) => {
    switch (type) {
      case "add_expense":
        return "Adding Expense";
      case "add_revenue":
        return "Adding Revenue";
      case "update_expense":
        return "Updating Expense";
      case "update_revenue":
        return "Updating Revenue";
      case "delete_expense":
        return "Deleting Expense";
      case "delete_revenue":
        return "Deleting Revenue";
    }
  };

  return (
    <div className="space-y-4 tab-content-enter h-full flex flex-col">
      {/* AI Settings panel */}
      <AISettings settings={settings} onSettingsChange={onSettingsChange} />

      {/* Not configured prompt */}
      {!isConfigured && (
        <Card className="bg-[#111111] border-gold/20">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-gold/10">
                <Key size={28} className="text-gold" />
              </div>
              <h3 className="text-white font-semibold text-lg">Setup AI Assistant</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                AI Assistant use karne ke liye, AI Settings panel mein apni AI provider configure karein. Recommended: <span className="text-gold">Groq (Best Free Tier)</span> - free, fast, generous quota, production-ready.
              </p>
              <div className="flex flex-col items-start gap-2 text-left mt-2">
                <p className="text-gold text-xs font-semibold">Quick Setup (Recommended - Groq):</p>
                <ol className="text-muted-foreground text-xs space-y-1 list-decimal list-inside">
                  <li>Free API key banao at{" "}
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light underline">console.groq.com/keys</a>
                  </li>
                  <li>AI Settings panel open karein (above)</li>
                  <li>Select &quot;Groq (Best Free Tier)&quot;, paste your key</li>
                  <li>Click &quot;Test Connection&quot; then &quot;Save Settings&quot;</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat area */}
      <Card className="bg-[#111111] border-gold/20 flex-1 flex flex-col min-h-[500px]">
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* Header banner with action capability note */}
          <div className="px-4 py-2 border-b border-gold/15 bg-gold/5">
            <p className="text-xs text-gold/80 flex items-center gap-2">
              <Sparkles size={12} />
              AI ab actions perform kar sakta hai: expense/revenue add, update, delete karein
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div ref={scrollRef} className="space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-gold/10 mb-4">
                    <Bot size={40} className="text-gold" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">#AS KHUSHBOO AI Assistant</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                    Main aapke financial data ke baare mein koi bhi sawal ka jawab de sakta hoon. Aur ab main actions bhi kar sakta hoon - expense add/update/delete, revenue add, etc.!
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => sendMessage(q)}
                        className="text-left p-3 rounded-lg bg-[#0A0A0A] border border-gold/15 hover:border-gold/40 text-sm text-muted-foreground hover:text-white transition-all"
                      >
                        <Sparkles size={12} className="text-gold inline mr-2" />
                        {q}
                      </motion.button>
                    ))}
                  </div>

                  {/* Action examples */}
                  <div className="mt-6 p-3 rounded-lg bg-gold/5 border border-gold/20 max-w-lg">
                    <p className="text-xs text-gold font-semibold mb-2">Try asking AI to do things:</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>&quot;Rs 5000 ka packaging expense add karo - 100 boxes&quot;</p>
                      <p>&quot;Shahkaar ki 2 bottles sold - Rs 8000 revenue add karo&quot;</p>
                      <p>&quot;Pichle expense ki price 6000 kar do&quot;</p>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <Bot size={16} className="text-gold" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-gold text-black" : "bg-[#0A0A0A] border border-gold/15 text-white"}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                      {/* Action status block */}
                      {msg.action && (
                        <div
                          className={`mt-3 p-2.5 rounded-lg flex items-center gap-2 text-xs ${
                            msg.action.status === "executed"
                              ? "bg-success/10 border border-success/30 text-success"
                              : msg.action.status === "failed"
                                ? "bg-danger/10 border border-danger/30 text-danger"
                                : "bg-gold/10 border border-gold/30 text-gold"
                          }`}
                        >
                          {msg.action.status === "executed" ? (
                            <CheckCircle2 size={14} className="flex-shrink-0" />
                          ) : msg.action.status === "failed" ? (
                            <AlertCircle size={14} className="flex-shrink-0" />
                          ) : (
                            <Loader2 size={14} className="flex-shrink-0 animate-spin" />
                          )}
                          <span className="flex-shrink-0">{getActionIcon(msg.action.type)}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold">{getActionLabel(msg.action.type)}</span>
                            {msg.action.result && (
                              <p className="opacity-80 mt-0.5">{msg.action.result}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-black/60" : "text-muted-foreground"}`}>
                        {msg.timestamp.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                    <Bot size={16} className="text-gold" />
                  </div>
                  <div className="bg-[#0A0A0A] border border-gold/15 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="text-gold animate-spin" />
                      <span className="text-sm text-muted-foreground">Soch raha hoon...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-gold/15">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Apna sawal likhein... (e.g. 'Rs 5000 ka expense add karo')"
                className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} className="bg-gold hover:bg-gold-dark text-black font-semibold px-4">
                <Send size={16} />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
