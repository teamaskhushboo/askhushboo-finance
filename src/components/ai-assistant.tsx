"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { Expense, Revenue } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  expenses: Expense[];
  revenue: Revenue[];
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
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Sorry, I could not process that.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">AI Assistant</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Ask anything about your #AS KHUSHBOO finances 💛
        </p>
      </div>

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
