"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  Loader2,
  Zap,
  Target,
  BarChart3,
  Sparkles,
  Key,
} from "lucide-react";
import { Expense, Revenue, AppSettings, CHART_COLORS } from "@/lib/types";
import { TOTAL_INVESTMENT } from "@/lib/data";

interface Insight {
  type: "alert" | "suggestion" | "prediction" | "analysis";
  title: string;
  description: string;
  severity?: "high" | "medium" | "low";
}

interface InsightsPanelProps {
  expenses: Expense[];
  revenue: Revenue[];
  settings: AppSettings;
}

const formatPKR = (amount: number) =>
  `Rs ${amount.toLocaleString("en-PK")}`;

export default function InsightsPanel({
  expenses,
  revenue,
  settings,
}: InsightsPanelProps) {
  const [aiInsights, setAiInsights] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  const isConfigured = !!(settings.aiApiKey && settings.aiApiKey.length > 0);

  // Computed analytics
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const totalRevenue = useMemo(
    () => revenue.reduce((sum, r) => sum + r.amount, 0),
    [revenue]
  );

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalExpenses]);

  const perfumeRevenueBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    revenue.forEach((r) => {
      const key = r.perfume || "Unspecified";
      if (!map[key]) map[key] = { amount: 0, count: 0 };
      map[key].amount += r.amount;
      map[key].count += r.quantity || 1;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [revenue]);

  // Generate local insights
  const localInsights = useMemo(() => {
    const insights: Insight[] = [];

    // Spending alerts: category exceeds 40% of total
    categoryBreakdown.forEach((cat) => {
      if (cat.percentage > 40) {
        insights.push({
          type: "alert",
          title: `${cat.name} Overspending Alert!`,
          description: `${cat.name} is ${cat.percentage.toFixed(
            1
          )}% of total expenses (${formatPKR(
            cat.amount
          )}). Consider optimizing this category.`,
          severity: "high",
        });
      } else if (cat.percentage > 25) {
        insights.push({
          type: "alert",
          title: `${cat.name} Spending Watch`,
          description: `${cat.name} is ${cat.percentage.toFixed(
            1
          )}% of total expenses (${formatPKR(cat.amount)}).`,
          severity: "medium",
        });
      }
    });

    // Profit/Loss analysis
    if (totalRevenue > 0) {
      const profitMargin = ((totalRevenue - totalExpenses) / totalRevenue) * 100;
      if (profitMargin > 20) {
        insights.push({
          type: "analysis",
          title: "Healthy Profit Margin",
          description: `Your profit margin is ${profitMargin.toFixed(
            1
          )}%. Revenue ${formatPKR(totalRevenue)} vs Expenses ${formatPKR(
            totalExpenses
          )}.`,
        });
      } else if (profitMargin > 0) {
        insights.push({
          type: "suggestion",
          title: "Improve Profit Margin",
          description: `Profit margin is only ${profitMargin.toFixed(
            1
          )}%. Try reducing expenses or increasing prices.`,
        });
      } else {
        insights.push({
          type: "alert",
          title: "Operating at a Loss!",
          description: `Expenses (${formatPKR(
            totalExpenses
          )}) exceed revenue (${formatPKR(totalRevenue)}). Immediate action needed!`,
          severity: "high",
        });
      }
    } else {
      insights.push({
        type: "prediction",
        title: "No Revenue Yet",
        description: `Total investment is ${formatPKR(
          TOTAL_INVESTMENT
        )}. Start tracking sales to see profitability analysis.`,
      });
    }

    // Savings suggestions
    const topCategory = categoryBreakdown[0];
    if (topCategory) {
      const potentialSaving = topCategory.amount * 0.1;
      insights.push({
        type: "suggestion",
        title: "Potential Savings in " + topCategory.name,
        description: `Even a 10% reduction in ${topCategory.name} could save ${formatPKR(
          potentialSaving
        )} per cycle.`,
      });
    }

    // Most profitable perfume
    if (perfumeRevenueBreakdown.length > 0) {
      const top = perfumeRevenueBreakdown[0];
      insights.push({
        type: "analysis",
        title: "Top Performing Perfume: " + top.name,
        description: `${top.name} has generated ${formatPKR(
          top.amount
        )} across ${top.count} sales. Focus marketing here!`,
      });
    }

    return insights;
  }, [categoryBreakdown, perfumeRevenueBreakdown, totalExpenses, totalRevenue]);

  const fetchAiInsights = useCallback(async () => {
    setIsAiLoading(true);
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses,
          revenue,
          apiKey: settings.aiApiKey || "",
          provider: settings.aiProvider || "groq",
          modelName: settings.aiModelName || "llama-3.3-70b-versatile",
          customEndpoint: settings.aiCustomEndpoint || "",
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch insights");

      const data = await response.json();
      setAiInsights(data.insights || "No AI insights available right now.");
      hasFetchedRef.current = true;
    } catch {
      setAiInsights(
        "AI insights are currently unavailable. Check the local insights below! 💛"
      );
      hasFetchedRef.current = true;
    } finally {
      setIsAiLoading(false);
    }
  }, [expenses, revenue, settings]);

  useEffect(() => {
    // Auto-fetch AI insights on first load if there's data and API key is configured
    if (expenses.length > 0 && !hasFetchedRef.current && !isAiLoading && isConfigured) {
      fetchAiInsights();
    }
  }, [expenses.length, isAiLoading, isConfigured, fetchAiInsights]);

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "alert":
        return <AlertTriangle size={18} className="text-danger" />;
      case "suggestion":
        return <Lightbulb size={18} className="text-gold" />;
      case "prediction":
        return <TrendingUp size={18} className="text-success" />;
      case "analysis":
        return <BarChart3 size={18} className="text-gold" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "border-danger/40 bg-danger/5";
      case "medium":
        return "border-gold/40 bg-gold/5";
      default:
        return "border-gold/20 bg-[#0A0A0A]";
    }
  };

  return (
    <div className="space-y-6 tab-content-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Smart Insights</h2>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered analysis of your #AS KHUSHBOO finances 💛
          </p>
        </div>
        {isConfigured && (
          <Button
            onClick={fetchAiInsights}
            disabled={isAiLoading}
            className="bg-gold hover:bg-gold-dark text-black font-semibold gap-2"
          >
            {isAiLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh AI Insights
          </Button>
        )}
      </div>

      {/* Category spending breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-[#111111] border-gold/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Target size={18} className="text-gold" />
                Category Spending
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryBreakdown.map((cat, idx) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-white text-sm font-medium">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gold text-sm font-semibold">
                        {formatPKR(cat.amount)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          cat.percentage > 40
                            ? "border-danger/40 text-danger"
                            : cat.percentage > 25
                            ? "border-gold/40 text-gold"
                            : "border-white/20 text-muted-foreground"
                        }`}
                      >
                        {cat.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={cat.percentage}
                    className="h-2 bg-[#0A0A0A]"
                    style={
                      {
                        "--progress-foreground":
                          CHART_COLORS[idx % CHART_COLORS.length],
                      } as React.CSSProperties
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Perfume revenue breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-[#111111] border-gold/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Zap size={18} className="text-gold" />
                Perfume Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {perfumeRevenueBreakdown.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">
                    No revenue data yet
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Add sales in the Revenue tab to see perfume performance
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {perfumeRevenueBreakdown.map((perf, idx) => {
                    const maxRevenue = perfumeRevenueBreakdown[0]?.amount || 1;
                    const barWidth = (perf.amount / maxRevenue) * 100;
                    return (
                      <div key={perf.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">
                            {perf.name}
                          </span>
                          <span className="text-success text-sm font-semibold">
                            {formatPKR(perf.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor:
                                CHART_COLORS[idx % CHART_COLORS.length],
                            }}
                          />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {perf.count} sale{perf.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Local insights */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingDown size={18} className="text-gold" />
          Quick Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {localInsights.map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
            >
              <Card
                className={`border ${getSeverityColor(insight.severity)} hover:border-gold/40 transition-all`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">
                        {insight.title}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      {isConfigured ? (
        <Card className="bg-[#111111] border-gold/20 gold-glow">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Sparkles size={18} className="text-gold" />
              AI-Powered Deep Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAiLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-gold animate-spin mr-3" />
                <span className="text-muted-foreground">
                  AI is analyzing your financial data...
                </span>
              </div>
            ) : aiInsights ? (
              <div className="prose prose-invert max-w-none">
                <div className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                  {aiInsights}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  Click &quot;Refresh AI Insights&quot; to get AI-powered analysis
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#111111] border-gold/20">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-gold/10">
                <Key size={24} className="text-gold" />
              </div>
              <h3 className="text-white font-semibold">AI Deep Insights</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Configure your AI API key in the AI Assistant tab to unlock deep AI-powered insights. 
                Get a free Gemini API key from{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:text-gold-light underline"
                >
                  Google AI Studio
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
