import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let expenses: Array<{ category: string; amount: number; description: string }> = [];
  let revenue: Array<{ amount: number; perfume?: string; source: string; quantity?: number }> = [];

  try {
    const body = await req.json();
    expenses = body.expenses || [];
    revenue = body.revenue || [];

    const totalExpenses = expenses.reduce(
      (sum: number, e: { amount: number }) => sum + e.amount,
      0
    );
    const totalRevenue = revenue.reduce(
      (sum: number, r: { amount: number }) => sum + r.amount,
      0
    );

    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((e: { category: string; amount: number }) => {
      categoryBreakdown[e.category] =
        (categoryBreakdown[e.category] || 0) + e.amount;
    });

    const perfumeRevenue: Record<string, { amount: number; count: number }> = {};
    revenue.forEach((r: { perfume?: string; amount: number; quantity?: number }) => {
      const key = r.perfume || "Unspecified";
      if (!perfumeRevenue[key]) perfumeRevenue[key] = { amount: 0, count: 0 };
      perfumeRevenue[key].amount += r.amount;
      perfumeRevenue[key].count += r.quantity || 1;
    });

    const formatPKR = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

    const financialData = `
Total Investment: ${formatPKR(189530)}
Total Expenses: ${formatPKR(totalExpenses)} (${expenses.length} items)
Total Revenue: ${formatPKR(totalRevenue)} (${revenue.length} entries)
Net Position: ${formatPKR(totalRevenue - totalExpenses)}

Category Breakdown:
${Object.entries(categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amt]) => `${cat}: ${formatPKR(amt)} (${((amt / totalExpenses) * 100).toFixed(1)}%)`)
  .join("\n")}

Perfume Revenue:
${Object.entries(perfumeRevenue)
  .map(([p, d]) => `${p}: ${formatPKR(d.amount)} (${d.count} sales)`)
  .join("\n") || "No revenue data yet"}
`;

    const systemPrompt = `You are a financial AI advisor for #AS KHUSHBOO, a Pakistani luxury fragrance brand. Generate deep, actionable insights about their financial data.

Brand: #AS KHUSHBOO
Tagline: "Khushboo That Speaks for YOU"
6 Perfumes: Shahkaar, Meherban (Men), Gulnaz, Noor-e-Jahan (Women), Rooh, Rawaan (Unisex)
Currency: PKR

FINANCIAL DATA:
${financialData}

Generate 5-7 smart, actionable insights in Roman Urdu + English mix. Be specific with numbers. Format each insight on a new line with a relevant emoji prefix. Cover:
1. Spending pattern analysis (kahan zyada paisa ja raha hai)
2. Savings opportunities (kahan bachat ho sakti hai)
3. Revenue optimization (sales kaise badhayein)
4. Risk alerts (kya khatarnak hai)
5. Growth predictions (agay kya expect karein)
6. Actionable recommendations (aaj kya karein)

Keep the tone warm, encouraging, and business-smart. Use 💛 occasionally.`;

    const messages = [
      {
        role: "assistant" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content:
          "Please analyze our financial data and give detailed insights for #AS KHUSHBOO.",
      },
    ];

    // Use z-ai-web-dev-sdk correctly
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });

    const aiResponse = completion.choices?.[0]?.message?.content;

    if (aiResponse) {
      return NextResponse.json({ insights: aiResponse });
    }

    throw new Error("No AI response");
  } catch (error) {
    console.error("AI Insights error:", error);

    // Generate fallback insights locally
    try {
      const totalExpenses = expenses.reduce(
        (sum: number, e: { amount: number }) => sum + e.amount,
        0
      );
      const totalRevenue = revenue.reduce(
        (sum: number, r: { amount: number }) => sum + r.amount,
        0
      );
      const categoryBreakdown: Record<string, number> = {};
      expenses.forEach((e: { category: string; amount: number }) => {
        categoryBreakdown[e.category] =
          (categoryBreakdown[e.category] || 0) + e.amount;
      });

      const insights = generateLocalInsights(
        expenses,
        revenue,
        totalExpenses,
        totalRevenue,
        categoryBreakdown
      );
      return NextResponse.json({ insights });
    } catch {
      return NextResponse.json({
        insights:
          "AI insights temporarily unavailable. Please try again later. 💛",
      });
    }
  }
}

function generateLocalInsights(
  expenses: Array<{ category: string; amount: number; description: string }>,
  revenue: Array<{ amount: number; perfume?: string; source: string }>,
  totalExpenses: number,
  totalRevenue: number,
  categoryBreakdown: Record<string, number>
): string {
  const formatPKR = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;
  const lines: string[] = [];

  lines.push("📊 #AS KHUSHBOO Financial Insights\n");

  // 1. Spending analysis
  const topCat = Object.entries(categoryBreakdown).sort(
    ([, a], [, b]) => b - a
  )[0];
  if (topCat) {
    const pct = ((topCat[1] / totalExpenses) * 100).toFixed(1);
    lines.push(
      `💰 Sabse zyada kharcha: ${topCat[0]} par ${formatPKR(topCat[1])} (${pct}% of total). Yeh optimize karna zaroori hai!`
    );
  }

  // 2. Revenue vs expenses
  const net = totalRevenue - totalExpenses;
  if (totalRevenue > 0) {
    if (net > 0) {
      lines.push(
        `✅ Profit mein ho! Net profit: ${formatPKR(net)}. Shabash, aise hi chalte raho! 💛`
      );
    } else {
      lines.push(
        `⚠️ Loss mein ja rahe ho! Expenses ${formatPKR(totalExpenses)} hain aur revenue sirf ${formatPKR(totalRevenue)}. Sales badhao ya costs kato!`
      );
    }
  } else {
    lines.push(
      `📈 Abhi revenue zero hai. Total investment ${formatPKR(189530)} hai. Pehle sales start karo, phir profit dekhein ge!`
    );
  }

  // 3. Savings tip
  if (topCat) {
    const saving10 = topCat[1] * 0.1;
    lines.push(
      `💡 Agar ${topCat[0]} mein se 10% bachao, toh ${formatPKR(saving10)} save ho jayenge! Suppliers se negotiate karo ya bulk order par discount maango.`
    );
  }

  // 4. Packaging specific
  const packagingTotal = categoryBreakdown["Packaging"] || 0;
  if (packagingTotal > 0) {
    const packagingPct = ((packagingTotal / totalExpenses) * 100).toFixed(1);
    lines.push(
      `📦 Packaging par ${formatPKR(packagingTotal)} (${packagingPct}%) lag gaye. Premium packaging zaroori hai, lekin wholesale rates par negotiate karo!`
    );
  }

  // 5. Perfume oils
  const oilsTotal = categoryBreakdown["Perfume Oils"] || 0;
  if (oilsTotal > 0) {
    lines.push(
      `🧴 Perfume Oils mein ${formatPKR(oilsTotal)} invest kiye. Yeh aapka core product hai! Quality maintain karo aur supplier relationships strong rakho.`
    );
  }

  // 6. Marketing
  const marketingTotal = categoryBreakdown["Digital & Marketing"] || 0;
  if (marketingTotal > 0) {
    lines.push(
      `📱 Digital & Marketing par ${formatPKR(marketingTotal)} spend kiye. Social media par consistent posting karo, especially TikTok aur Instagram!`
    );
  }

  // 7. Growth prediction
  if (totalRevenue > 0) {
    const avgRevenuePerEntry =
      revenue.length > 0 ? totalRevenue / revenue.length : 0;
    lines.push(
      `🚀 Average revenue per sale ${formatPKR(Math.round(avgRevenuePerEntry))} hai. Agar monthly 10 sales add karo, toh monthly ${formatPKR(Math.round(avgRevenuePerEntry * 10))} extra revenue ho sakta hai!`
    );
  } else {
    lines.push(
      `🌟 #AS KHUSHBOO ki 6 perfumes hain! Har perfume ka apna market hai. Shahkaar aur Meherban men ke liye, Gulnaz aur Noor-e-Jahan women ke liye, Rooh aur Rawaan unisex hain. Target audience identify karo aur marketing shuru karo! 💛`
    );
  }

  return lines.join("\n\n");
}
