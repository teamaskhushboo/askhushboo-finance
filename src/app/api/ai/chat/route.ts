import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let message = "";
  let expenses: Array<{ category: string; amount: number; date: string; description: string }> = [];
  let revenue: Array<{ amount: number; date: string; source: string; description: string; perfume?: string }> = [];
  let history: Array<{ role: string; content: string }> = [];

  try {
    const body = await req.json();
    message = body.message || "";
    expenses = body.expenses || [];
    revenue = body.revenue || [];
    history = body.history || [];

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build financial data summary for context
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

    const perfumeRevenue: Record<string, number> = {};
    revenue.forEach((r: { perfume?: string; amount: number }) => {
      const key = r.perfume || "Unspecified";
      perfumeRevenue[key] = (perfumeRevenue[key] || 0) + r.amount;
    });

    const formatPKR = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

    const financialSummary = `
FINANCIAL DATA:
- Total Investment: ${formatPKR(189530)}
- Total Expenses: ${formatPKR(totalExpenses)} (${expenses.length} items)
- Total Revenue: ${formatPKR(totalRevenue)} (${revenue.length} entries)
- Net Profit/Loss: ${formatPKR(totalRevenue - totalExpenses)} ${totalRevenue - totalExpenses >= 0 ? "(Profit)" : "(Loss)"}

EXPENSE BREAKDOWN BY CATEGORY:
${Object.entries(categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amt]) => `- ${cat}: ${formatPKR(amt)} (${((amt / totalExpenses) * 100).toFixed(1)}%)`)
  .join("\n")}

REVENUE BY PERFUME:
${Object.entries(perfumeRevenue)
  .sort(([, a], [, b]) => b - a)
  .map(([perf, amt]) => `- ${perf}: ${formatPKR(amt)}`)
  .join("\n") || "No revenue data yet"}

RECENT EXPENSES (last 5):
${expenses
  .slice(0, 5)
  .map((e: { date: string; category: string; description: string; amount: number }) => `- ${e.date}: ${e.description} (${e.category}) - ${formatPKR(e.amount)}`)
  .join("\n")}

RECENT REVENUE (last 5):
${revenue
  .slice(0, 5)
  .map((r: { date: string; source: string; description: string; amount: number; perfume?: string }) => `- ${r.date}: ${r.description} (${r.source}${r.perfume ? `, ${r.perfume}` : ""}) - ${formatPKR(r.amount)}`)
  .join("\n") || "No revenue entries yet"}
`;

    const systemPrompt = `You are the AI Finance Assistant for #AS KHUSHBOO, a Pakistani luxury fragrance brand. Your name is "KHUSHBOO AI".

IMPORTANT BRAND INFO:
- Brand: #AS KHUSHBOO (the # is MANDATORY)
- Tagline: "Khushboo That Speaks for YOU"
- 6 Perfumes: Shahkaar (Men), Meherban (Men), Gulnaz (Women), Noor-e-Jahan (Women), Rooh (Unisex), Rawaan (Unisex)
- Founded by Abdullah, Team: Ashir (Details), Ahsan (Product Manager)
- Currency: PKR (Pakistani Rupees)
- Brand Colors: Royal Gold and Deep Black

COMMUNICATION STYLE:
- Speak in a warm mix of Roman Urdu and English (like a Pakistani business advisor)
- Use phrases like "Bhai", "Yaar", "Dekhein", "Suno", etc. naturally
- Be helpful, encouraging, and financially smart
- Use 💛 emoji occasionally as brand signature
- Keep responses concise but informative
- When giving amounts, always use PKR format

${financialSummary}

Answer the user's question based on the financial data provided. If asked about something not in the data, say so honestly. Always reference specific numbers when possible.`;

    // Build messages for the AI
    const aiMessages = [
      {
        role: "assistant" as const,
        content: systemPrompt,
      },
      ...history.map((h: { role: string; content: string }) => ({
        role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: h.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    // Use z-ai-web-dev-sdk correctly
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: aiMessages,
      thinking: { type: "disabled" },
    });

    const aiResponse = completion.choices?.[0]?.message?.content;

    if (aiResponse) {
      return NextResponse.json({ response: aiResponse });
    }

    throw new Error("No response from AI");
  } catch (error) {
    console.error("AI Chat error:", error);

    // Fallback: generate a basic response based on data
    try {
      const totalExpenses = expenses.reduce(
        (sum: number, e: { amount: number }) => sum + e.amount,
        0
      );
      const totalRevenue = revenue.reduce(
        (sum: number, r: { amount: number }) => sum + r.amount,
        0
      );
      const formatPKR = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

      const lowerMsg = message.toLowerCase();

      let fallbackResponse = "";

      if (
        lowerMsg.includes("packaging") &&
        (lowerMsg.includes("spend") || lowerMsg.includes("kitna"))
      ) {
        const packagingTotal = expenses
          .filter((e: { category: string }) => e.category === "Packaging")
          .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
        fallbackResponse = `Packaging par total ${formatPKR(packagingTotal)} spend hua hai. Yeh total expenses ka ${totalExpenses > 0 ? ((packagingTotal / totalExpenses) * 100).toFixed(1) : 0}% hai. Packaging mein bottles aur boxes sabse zyada expensive hain 💛`;
      } else if (
        lowerMsg.includes("revenue") ||
        lowerMsg.includes("total") ||
        lowerMsg.includes("income")
      ) {
        fallbackResponse = `Total revenue abhi ${formatPKR(totalRevenue)} hai, aur total expenses ${formatPKR(totalExpenses)} hain. Net position: ${formatPKR(totalRevenue - totalExpenses)} 💛`;
      } else if (
        lowerMsg.includes("profit") ||
        lowerMsg.includes("loss")
      ) {
        const profit = totalRevenue - totalExpenses;
        fallbackResponse = `Current net position ${formatPKR(Math.abs(profit))} ${profit >= 0 ? "profit mein" : "loss mein"} hai. ${profit >= 0 ? "Shabash, keep it up! 💛" : "Mehnat karni paregi, but #AS KHUSHBOO will shine! 💛"}`;
      } else if (
        lowerMsg.includes("perfume") ||
        lowerMsg.includes("kaunsa") ||
        lowerMsg.includes("which")
      ) {
        const categoryBreakdown: Record<string, number> = {};
        expenses.forEach((e: { category: string; amount: number }) => {
          categoryBreakdown[e.category] =
            (categoryBreakdown[e.category] || 0) + e.amount;
        });
        const topCategory = Object.entries(categoryBreakdown).sort(
          ([, a], [, b]) => b - a
        )[0];
        fallbackResponse = `Aapke 6 perfumes hain: Shahkaar (Men), Meherban (Men), Gulnaz (Women), Noor-e-Jahan (Women), Rooh (Unisex), Rawaan (Unisex). Sabse zyada expense ${topCategory ? `${topCategory[0]} (${formatPKR(topCategory[1])})` : "N/A"} par hai. Sales data add karein taake profitable perfume pata chal sake! 💛`;
      } else if (
        lowerMsg.includes("spend") ||
        lowerMsg.includes("kharcha") ||
        lowerMsg.includes("expense")
      ) {
        fallbackResponse = `Total expenses ${formatPKR(totalExpenses)} hain (${expenses.length} items). Expenses add karte rahein taake better analysis ho sake! 💛`;
      } else {
        fallbackResponse = `Bhai, aapke total expenses ${formatPKR(totalExpenses)} hain aur revenue ${formatPKR(totalRevenue)} hai. Koi specific sawal poochein, jaise "Kitna spend hua packaging par?" ya "Total revenue kya hai?" 💛`;
      }

      return NextResponse.json({ response: fallbackResponse });
    } catch {
      return NextResponse.json({
        response:
          "Sorry, AI service temporarily unavailable. Please try again later. 💛",
      });
    }
  }
}
