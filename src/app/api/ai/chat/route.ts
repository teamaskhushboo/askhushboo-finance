import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are the AI Finance Assistant for #AS KHUSHBOO, a Pakistani luxury fragrance brand. Your name is "KHUSHBOO AI".

BRAND INFO:
- Brand: #AS KHUSHBOO (the # is MANDATORY)
- Tagline: "Khushboo That Speaks for YOU"
- 6 Perfumes: Shahkaar (Men), Meherban (Men), Gulnaz (Women), Noor-e-Jahan (Women), Rooh (Unisex), Rawaan (Unisex)
- Founded by Abdullah, Team: Ashir (Details), Ahsan (Product Manager)
- Currency: PKR (Pakistani Rupees)
- Brand Colors: Royal Gold and Deep Black

STYLE: Warm mix of Roman Urdu and English. Use "Bhai", "Yaar" naturally. Be helpful and financially smart. Use 💛 occasionally. Keep responses concise but informative. NEVER use em dashes (—). Always reference specific numbers from the data when answering.`;

export async function POST(req: NextRequest) {
  let message = "";
  let expenses: Array<{ category: string; amount: number; date: string; description: string }> = [];
  let revenue: Array<{ amount: number; date: string; source: string; description: string; perfume?: string }> = [];
  let history: Array<{ role: string; content: string }> = [];
  let apiKey = "";
  let provider = "gemini";
  let modelName = "gemini-2.0-flash";
  let customEndpoint = "";

  try {
    const body = await req.json();
    message = body.message || "";
    expenses = body.expenses || [];
    revenue = body.revenue || [];
    history = body.history || [];
    apiKey = body.apiKey || "";
    provider = body.provider || "gemini";
    modelName = body.modelName || "gemini-2.0-flash";
    customEndpoint = body.customEndpoint || "";

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
  .map(([cat, amt]) => `- ${cat}: ${formatPKR(amt)} (${totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : "0"}%)`)
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

    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${financialSummary}\n\nAnswer the user's question based on the financial data provided. If asked about something not in the data, say so honestly. Always reference specific numbers when possible.`;

    // Track what's happening for diagnostics
    let providerError: string | null = null;
    let providerErrorKind: "quota" | "auth" | "model" | "network" | "unknown" | null = null;

    // STEP 1: If user has an API key (and not using "free" provider), try their provider
    if (apiKey && provider !== "free") {
      try {
        const aiResponse = await callAIProvider(provider, apiKey, modelName, customEndpoint, fullSystemPrompt, history, message);
        return NextResponse.json({
          response: aiResponse,
          source: provider,
          usedFallback: false,
        });
      } catch (aiError) {
        const errMsg = aiError instanceof Error ? aiError.message : String(aiError);
        providerError = errMsg;

        // Classify the error
        if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
          providerErrorKind = "quota";
        } else if (errMsg.includes("401") || errMsg.includes("403") || errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("api key")) {
          providerErrorKind = "auth";
        } else if (errMsg.includes("404") || errMsg.toLowerCase().includes("model")) {
          providerErrorKind = "model";
        } else if (errMsg.toLowerCase().includes("fetch") || errMsg.toLowerCase().includes("network")) {
          providerErrorKind = "network";
        } else {
          providerErrorKind = "unknown";
        }

        console.error(`[AI Chat] Provider '${provider}' failed (${providerErrorKind}):`, errMsg.substring(0, 300));

        // Fall through to z-ai-web-dev-sdk fallback
      }
    }

    // STEP 2: Try z-ai-web-dev-sdk (works on Vercel - it's a real HTTP-based SDK)
    try {
      const aiMessages = [
        {
          role: "assistant" as const,
          content: fullSystemPrompt,
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

      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: aiMessages,
        thinking: { type: "disabled" },
      });

      const aiResponse = completion.choices?.[0]?.message?.content;

      if (aiResponse) {
        // Compose a helpful notice when we fell back from a failing provider
        let warning: string | undefined;
        if (providerError && apiKey) {
          if (providerErrorKind === "quota") {
            warning =
              "⚠ Note: Aapki Gemini API key ka free quota khatam ho gaya hai, isliye abhi free AI (built-in fallback) use karke jawab de raha hoon. AI Settings mein jaakar 'Free AI (No Key Needed)' provider select karein taake future mein bhi yahi use ho. 💛";
          } else if (providerErrorKind === "auth") {
            warning =
              "⚠ Note: Aapki Gemini API key invalid hai, isliye free AI (built-in fallback) use ho raha hai. AI Settings mein key check karein.";
          } else {
            warning =
              "⚠ Note: API provider mein issue tha, isliye free AI (built-in fallback) use ho raha hai. AI Settings check karein.";
          }
        }

        return NextResponse.json({
          response: aiResponse,
          warning,
          source: "fallback",
          usedFallback: true,
          providerError: providerError ? providerError.substring(0, 200) : undefined,
          providerErrorKind,
        });
      }

      throw new Error("No response from fallback AI");
    } catch (fallbackError) {
      console.error("[AI Chat] Fallback AI also failed:", fallbackError);

      // STEP 3: Final hardcoded fallback - generate from data
      const fallbackText = generateFallbackResponse(message, expenses, revenue, totalExpenses, totalRevenue, categoryBreakdown);

      let warning = "⚠ AI providers abhi available nahi hain, isliye basic data-based answer de raha hoon. Thodi der baad try karein.";
      if (providerError && providerErrorKind === "quota") {
        warning = "⚠ Aapki Gemini API key ka quota khatam hai aur backup AI bhi fail hua. Thodi der baad try karein, ya AI Settings mein 'Free AI (No Key Needed)' select karein.";
      }

      return NextResponse.json({
        response: fallbackText,
        warning,
        source: "static",
        usedFallback: true,
        providerError: providerError ? providerError.substring(0, 200) : undefined,
        providerErrorKind,
      });
    }
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({
      response: "Sorry, AI service temporarily unavailable. Please try again later. 💛",
      warning: "System error occurred. Please try again.",
      source: "error",
      usedFallback: true,
    });
  }
}

async function callAIProvider(
  provider: string,
  apiKey: string,
  modelName: string,
  customEndpoint: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  message: string
): Promise<string> {
  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const contents = [
      ...history.map((h) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini");
    return text;
  }

  if (provider === "openai" || provider === "custom") {
    const baseUrl = provider === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : customEndpoint;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No response from OpenAI");
    return text;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

function generateFallbackResponse(
  message: string,
  expenses: Array<{ category: string; amount: number; description: string }>,
  revenue: Array<{ amount: number; source: string; perfume?: string }>,
  totalExpenses: number,
  totalRevenue: number,
  categoryBreakdown: Record<string, number>
): string {
  const formatPKR = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("packaging") && (lowerMsg.includes("spend") || lowerMsg.includes("kitna"))) {
    const packagingTotal = expenses.filter((e) => e.category === "Packaging").reduce((sum, e) => sum + e.amount, 0);
    return `Packaging par total ${formatPKR(packagingTotal)} spend hua hai. Yeh total expenses ka ${totalExpenses > 0 ? ((packagingTotal / totalExpenses) * 100).toFixed(1) : 0}% hai. Packaging mein bottles aur boxes sabse zyada expensive hain 💛`;
  } else if (lowerMsg.includes("revenue") || lowerMsg.includes("income") || (lowerMsg.includes("total") && !lowerMsg.includes("expense"))) {
    return `Total revenue abhi ${formatPKR(totalRevenue)} hai, aur total expenses ${formatPKR(totalExpenses)} hain. Net position: ${formatPKR(totalRevenue - totalExpenses)} 💛`;
  } else if (lowerMsg.includes("profit") || lowerMsg.includes("loss")) {
    const profit = totalRevenue - totalExpenses;
    return `Current net position ${formatPKR(Math.abs(profit))} ${profit >= 0 ? "profit mein" : "loss mein"} hai. ${profit >= 0 ? "Shabash, keep it up! 💛" : "Mehnat karni paregi, but #AS KHUSHBOO will shine! 💛"}`;
  } else if (lowerMsg.includes("perfume") || lowerMsg.includes("kaunsa") || lowerMsg.includes("which")) {
    const topCategory = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0];
    return `Aapke 6 perfumes hain: Shahkaar (Men), Meherban (Men), Gulnaz (Women), Noor-e-Jahan (Women), Rooh (Unisex), Rawaan (Unisex). Sabse zyada expense ${topCategory ? `${topCategory[0]} (${formatPKR(topCategory[1])})` : "N/A"} par hai. Sales data add karein taake profitable perfume pata chal sake! 💛`;
  } else if (lowerMsg.includes("spend") || lowerMsg.includes("kharcha") || lowerMsg.includes("expense")) {
    return `Total expenses ${formatPKR(totalExpenses)} hain (${expenses.length} items). Top categories: ${Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a).slice(0, 3).map(([c, a]) => `${c} (${formatPKR(a)})`).join(", ")}. 💛`;
  } else if (lowerMsg.includes("save") || lowerMsg.includes("savings") || lowerMsg.includes("suggest")) {
    const top = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0];
    return `Bhai, savings ke liye: ${top ? `${top[0]} par sabse zyada (${formatPKR(top[1])}) kharch hua hai. ` : ""}Bulk ordering se packaging cost kam ho sakta hai. Digital marketing ka ROI track karein. Samples limited rakhein. 💛`;
  } else {
    return `Bhai, aapke total expenses ${formatPKR(totalExpenses)} hain aur revenue ${formatPKR(totalRevenue)} hai. Koi specific sawal poochein, jaise "Kitna spend hua packaging par?" ya "Total revenue kya hai?" 💛`;
  }
}
