"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles, Loader2, Key } from "lucide-react";
import { Expense, Revenue, AppSettings } from "@/lib/types";
import AISettings from "./ai-settings";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  expenses: Expense[];
  revenue: Revenue[];
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const SUGGESTED_QUESTIONS = [
  "Kitna spend hua packaging par?",
  "Total revenue kya hai?",
  "Most profitable perfume kaunsa hai?",
  "Monthly expense breakdown do",
  "Kahan zyada paisa lag raha hai?",
  "Savings ke liye kya suggest karte ho?",
];

export default function AIAssistant({
  expenses,
  revenue,
  settings,
  onSettingsChange,
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

      // Compose final content - prepend warning if AI fell back
      let finalContent = data.response || "Sorry, I could not process that.";
      if (data.warning) {
        finalContent = `${data.warning}\n\n${finalContent}`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Show toast notification for fallback usage
      if (data.usedFallback && data.source === "fallback") {
        // Soft warning - fallback worked but Gemini key has issues
      } else if (data.usedFallback && data.source === "static") {
        // Hard warning - both failed
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, AI service is currently unavailable. Please try again later. 💛",
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
              <h3 className="text-white font-semibold text-lg">
                Setup AI Assistant
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                AI Assistant use karne ke liye, AI Settings panel mein apni AI provider configure karein.
                Recommended: <span className="text-gold">Groq (Best Free Tier)</span> - free, fast, generous quota, production-ready.
              </p>
              <div className="flex flex-col items-start gap-2 text-left mt-2">
                <p className="text-gold text-xs font-semibold">Quick Setup (Recommended - Groq):</p>
                <ol className="text-muted-foreground text-xs space-y-1 list-decimal list-inside">
                  <li>Free API key banao at{" "}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:text-gold-light underline"
                    >
                      console.groq.com/keys
                    </a>
                  </li>
                  <li>AI Settings panel open karein (above)</li>
                  <li>Select &quot;Groq (Best Free Tier)&quot;, paste your key</li>
                  <li>Click &quot;Test Connection&quot; then &quot;Save Settings&quot;</li>
                </ol>
                <p className="text-gold text-xs font-semibold mt-3">Other options:</p>
                <ul className="text-muted-foreground text-xs space-y-1 list-disc list-inside">
                  <li>Google Gemini - free tier but daily limit (429 error)</li>
                  <li>OpenAI - paid, high quality</li>
                  <li>Custom Endpoint - any OpenAI-compatible API</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat area */}
      <Card className="bg-[#111111] border-gold/20 flex-1 flex flex-col min-h-[500px]">
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div ref={scrollRef} className="space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-gold/10 mb-4">
                    <Bot size={40} className="text-gold" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    #AS KHUSHBOO AI Assistant
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                    Main aapke financial data ke baare mein koi bhi sawal ka
                    jawab de sakta hoon. Neeche kuch suggestions hain:
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
                        <Sparkles
                          size={12}
                          className="text-gold inline mr-2"
                        />
                        {q}
                      </motion.button>
                    ))}
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
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <Bot size={16} className="text-gold" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-gold text-black"
                          : "bg-[#0A0A0A] border border-gold/15 text-white"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          msg.role === "user"
                            ? "text-black/60"
                            : "text-muted-foreground"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString("en-PK", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                    <Bot size={16} className="text-gold" />
                  </div>
                  <div className="bg-[#0A0A0A] border border-gold/15 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="text-gold animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Soch raha hoon...
                      </span>
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
                placeholder="Apna sawal likhein..."
                className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gold hover:bg-gold-dark text-black font-semibold px-4"
              >
                <Send size={16} />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
