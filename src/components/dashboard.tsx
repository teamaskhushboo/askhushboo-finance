"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Expense, Revenue, CHART_COLORS } from "@/lib/types";
import { TOTAL_INVESTMENT } from "@/lib/data";

interface DashboardProps {
  expenses: Expense[];
  revenue: Revenue[];
  isLoading: boolean;
}

const formatPKR = (amount: number) =>
  `Rs ${amount.toLocaleString("en-PK")}`;

// Custom tooltip component defined outside render
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#111111] border border-gold/30 rounded-lg p-3 shadow-lg">
      <p className="text-gold font-semibold text-sm mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-white text-sm">
          <span style={{ color: entry.color }}>&#9679;</span>{" "}
          {entry.name}: Rs {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard({ expenses, revenue, isLoading }: DashboardProps) {
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const totalRevenue = useMemo(
    () => revenue.reduce((sum, r) => sum + r.amount, 0),
    [revenue]
  );

  const netProfit = totalRevenue - totalExpenses;

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Monthly expense trends for bar chart
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const month = e.date.substring(0, 7);
      const label = new Date(month + "-01").toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
      map[label] = (map[label] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [expenses]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const allItems = [
      ...expenses.map((e) => ({
        date: e.date,
        description: e.description,
        amount: e.amount,
        type: "expense" as const,
        category: e.category,
      })),
      ...revenue.map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: "revenue" as const,
        category: r.source,
      })),
    ];
    return allItems.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [expenses, revenue]);

  const metricCards = [
    {
      title: "Total Investment",
      value: formatPKR(TOTAL_INVESTMENT),
      icon: <Wallet size={22} />,
      color: "text-gold",
      bgColor: "bg-gold/10",
      borderColor: "border-gold/30",
    },
    {
      title: "Total Revenue",
      value: formatPKR(totalRevenue),
      icon: <TrendingUp size={22} />,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
    },
    {
      title: "Net Profit/Loss",
      value: formatPKR(Math.abs(netProfit)),
      icon: netProfit >= 0 ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />,
      color: netProfit >= 0 ? "text-success" : "text-danger",
      bgColor: netProfit >= 0 ? "bg-success/10" : "bg-danger/10",
      borderColor: netProfit >= 0 ? "border-success/30" : "border-danger/30",
      prefix: netProfit >= 0 ? "+" : "-",
    },
    {
      title: "Total Expenses",
      value: `${expenses.length} items`,
      subtitle: formatPKR(totalExpenses),
      icon: <Activity size={22} />,
      color: "text-gold",
      bgColor: "bg-gold/10",
      borderColor: "border-gold/30",
    },
  ];

  // Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-[#111111] border-gold/20">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-24 bg-[#1A1A1A]" />
                <Skeleton className="h-8 w-32 bg-[#1A1A1A]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="bg-[#111111] border-gold/20">
              <CardContent className="p-5">
                <Skeleton className="h-[280px] bg-[#1A1A1A]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 tab-content-enter">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <Card className="bg-[#111111] border-gold/20 hover:border-gold/40 transition-all gold-glow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                    {card.icon}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  {card.prefix && (
                    <span className={card.color}>{card.prefix}</span>
                  )}
                  <span className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </span>
                </div>
                {card.subtitle && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="bg-[#111111] border-gold/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">
                💛 Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", color: "#A0A0A0" }}
                      formatter={(value: string) => (
                        <span style={{ color: "#A0A0A0" }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="bg-[#111111] border-gold/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">
                📊 Monthly Expense Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#A0A0A0", fontSize: 12 }}
                      axisLine={{ stroke: "rgba(223,173,24,0.2)" }}
                    />
                    <YAxis
                      tick={{ fill: "#A0A0A0", fontSize: 12 }}
                      axisLine={{ stroke: "rgba(223,173,24,0.2)" }}
                      tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="amount" name="Expenses" radius={[6, 6, 0, 0]}>
                      {monthlyData.map((_, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="bg-[#111111] border-gold/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">
              ⚡ Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No activity yet. Add your first expense or revenue!
                </p>
              ) : (
                recentActivity.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0A0A0A] hover:bg-[#1A1A1A] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 ${
                            item.type === "expense"
                              ? "border-danger/30 text-danger"
                              : "border-success/30 text-success"
                          }`}
                        >
                          {item.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ml-4 ${
                        item.type === "expense"
                          ? "text-danger"
                          : "text-success"
                      }`}
                    >
                      {item.type === "expense" ? "-" : "+"}
                      {formatPKR(item.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Brand perfumes overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Card className="bg-[#111111] border-gold/20 gold-glow">
          <CardContent className="p-5">
            <h3 className="text-gold font-bold text-sm uppercase tracking-wider mb-3">
              Our Perfumes 💛
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { name: "Shahkaar", type: "Men" },
                { name: "Meherban", type: "Men" },
                { name: "Gulnaz", type: "Women" },
                { name: "Noor-e-Jahan", type: "Women" },
                { name: "Rooh", type: "Unisex" },
                { name: "Rawaan", type: "Unisex" },
              ].map((perfume) => (
                <div
                  key={perfume.name}
                  className="text-center p-3 rounded-lg bg-[#0A0A0A] border border-gold/10 hover:border-gold/30 transition-all"
                >
                  <p className="text-white text-sm font-semibold">
                    {perfume.name}
                  </p>
                  <p className="text-gold text-xs mt-1">{perfume.type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
