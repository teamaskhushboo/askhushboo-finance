import { NextRequest, NextResponse } from "next/server";
import type { Expense, Revenue } from "@/lib/types";

const SYSTEM_PROMPT = `You are the AI Finance Assistant for #AS KHUSHBOO, a Pakistani luxury fragrance brand. Your name is "KHUSHBOO AI".

BRAND INFO:
- Brand: #AS KHUSHBOO (the # is MANDATORY, always include it)
- Tagline: "Khushboo That Speaks for YOU"
- 6 Perfumes: Shahkaar (Men), Meherban (Men), Gulnaz (Women), Noor-e-Jahan (Women), Rooh (Unisex), Rawaan (Unisex)
- Founded by Abdullah, Team: Ashir (Details), Ahsan (Product Manager)
- Currency: PKR (Pakistani Rupees)
- Brand Colors: Royal Gold and Deep Black

STYLE: Warm mix of Roman Urdu and English. Use "Bhai", "Yaar" naturally. Be helpful and financially smart. Use 💛 occasionally. Keep responses concise but informative. NEVER use em dashes (—). Always reference SPECIFIC numbers from the data when answering.

=== ACTION CAPABILITIES ===

You can PERFORM ACTIONS on the user's data! When the user asks you to do something (add, update, delete), include an action block at the END of your response in this EXACT format:

\`\`\`action
{"type": "<action_type>", "payload": {<action_data>}}
\`\`\`

CRITICAL RULES FOR ACTIONS:
1. ALWAYS include a brief explanation BEFORE the action block (in Roman Urdu + English).
2. ONLY use ONE action block per response.
3. Use today's date in YYYY-MM-DD format if user doesn't specify a date.
4. For amounts, use NUMBERS only (no commas, no "Rs" prefix). Example: 35000 not Rs 35,000.
5. After the action block, add a short confirmation message.

=== EXPENSE ID HANDLING (CRITICAL - READ CAREFULLY) ===

You CANNOT update or delete "all" expenses. You can ONLY update or delete ONE SPECIFIC expense at a time.

The user's expense list below shows each expense with [id: XXX]. The ID is the string between "[id: " and "]".

When the user asks to update/delete an expense, you have TWO options:
A) Use the EXACT id from the list (recommended when user references a specific entry)
B) Use a "description_match" field with a keyword from the expense description (when user mentions it by name)

EXAMPLES:

User: "Perfume Boxes wali expense ki price 40000 kar do"
AI action:
\`\`\`action
{"type": "update_expense", "payload": {"description_match": "Perfume Boxes", "amount": 40000}}
\`\`\`

User: "Shahkaar testing wala expense delete karo"
AI action:
\`\`\`action
{"type": "delete_expense", "payload": {"description_match": "Shahkaar testing"}}
\`\`\`

User: "id 5 wala expense update karo, amount 6000"
AI action:
\`\`\`action
{"type": "update_expense", "payload": {"id": "5", "amount": 6000}}
\`\`\`

If multiple expenses match the description_match keyword, the FIRST match (most recent) will be updated. Always mention which one you're updating in your explanation.

NEVER use "all" as an ID. NEVER try to update multiple expenses in one action. If the user wants to update "all" or "every" expense, explain: "Bhai, ek action mein sirf ek expense update ho sakti hai. Aap specific expense bata dein ya ek ek kar ke update karein."

=== ACTION TYPES ===

1. ADD EXPENSE - when user says "expense add karo", "kharcha add kar do", etc.
\`\`\`action
{"type": "add_expense", "payload": {"date": "2026-06-17", "category": "Packaging", "description": "50 perfume boxes", "amount": 12000, "paymentMethod": "Cash", "notes": "Supplier: ABC"}}
\`\`\`
Valid categories: "Packaging", "Perfume Oils", "Printing & DTF", "Equipment", "Digital & Marketing", "Transport", "Testing & Misc"
Valid payment methods: "Cash", "Online", "Bank Transfer", "Invoice", "Counter Cash", "Other"

2. UPDATE EXPENSE - when user says "expense update karo", "price change karo", etc.
   Use EITHER "id" (from the list) OR "description_match" (keyword from description).
\`\`\`action
{"type": "update_expense", "payload": {"description_match": "Perfume Boxes", "amount": 14000}}
\`\`\`
OR
\`\`\`action
{"type": "update_expense", "payload": {"id": "abc123", "amount": 14000}}
\`\`\`
Only include fields you want to change. Either "id" OR "description_match" is REQUIRED.

3. DELETE EXPENSE - when user says "expense delete karo", "hata do", etc.
\`\`\`action
{"type": "delete_expense", "payload": {"description_match": "Old testing"}}
\`\`\`
OR
\`\`\`action
{"type": "delete_expense", "payload": {"id": "abc123"}}
\`\`\`

4. ADD REVENUE - when user says "sale add karo", "revenue add karo", etc.
\`\`\`action
{"type": "add_revenue", "payload": {"date": "2026-06-17", "source": "Online Sale", "description": "Sold 2 Shahkaar", "amount": 8000, "perfume": "Shahkaar", "quantity": 2, "notes": "Customer: Ali"}}
\`\`\`
Valid sources: "Online Sale", "WhatsApp Order", "Direct Sale", "Sample Sale", "Bundle Sale", "Other"
Valid perfumes: "Shahkaar", "Meherban", "Gulnaz", "Noor-e-Jahan", "Rooh", "Rawaan"

=== ANALYSIS GUIDELINES ===

For ANALYSIS questions (kitna kharcha hua, kahan zyada paisa, profit/loss, sab expenses list do, etc.):
- DO NOT use action blocks
- Reference SPECIFIC line items from the expense list (with their description and amount)
- Group similar items together and explain the breakdown
- For "sab expenses" or "saari expenses", list them ALL with category and amount
- Always use the ACTUAL total from the data (NOT 189530 unless that's the current total)
- Compare and contrast different categories
- Provide actionable insights based on the data

For ACTION requests (add/update/delete) ALWAYS use the action block.

If user gives vague info (e.g., "ek expense add karo"), ask for clarification (description, amount, category).
`;

interface AIRequestBody {
  message?: string;
  expenses?: Expense[];
  revenue?: Revenue[];
  history?: Array<{ role: string; content: string }>;
  apiKey?: string;
  provider?: string;
  modelName?: string;
  customEndpoint?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: AIRequestBody = await req.json();
    const {
      message = "",
      expenses = [],
      revenue = [],
      history = [],
      apiKey = "",
      provider = "groq",
      modelName = "llama-3.3-70b-versatile",
      customEndpoint = "",
    } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build comprehensive financial data summary - send ALL expenses
    const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const totalRevenue = revenue.reduce((sum: number, r: Revenue) => sum + r.amount, 0);

    const categoryBreakdown: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    expenses.forEach((e: Expense) => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
      categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
    });

    const perfumeRevenue: Record<string, number> = {};
    revenue.forEach((r: Revenue) => {
      const key = r.perfume || "Unspecified";
      perfumeRevenue[key] = (perfumeRevenue[key] || 0) + r.amount;
    });

    const formatPKR = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

    // Send ALL expenses with their IDs so AI can reference them
    const allExpensesList = expenses
      .map(
        (e: Expense) =>
          `[id: ${e.id}] ${e.date} | ${e.description} | ${e.category} | ${formatPKR(e.amount)} | ${e.paymentMethod}${e.notes ? ` | Notes: ${e.notes}` : ""}`
      )
      .join("\n");

    const allRevenueList = revenue
      .map(
        (r: Revenue) =>
          `[id: ${r.id}] ${r.date} | ${r.description} | ${r.source}${r.perfume ? ` | ${r.perfume}` : ""} | ${formatPKR(r.amount)} | Qty: ${r.quantity}`
      )
      .join("\n");

    const financialSummary = `
FINANCIAL DATA (REAL-TIME):
- Total Investment (sum of all expenses): ${formatPKR(totalExpenses)} (${expenses.length} items)
- Total Revenue: ${formatPKR(totalRevenue)} (${revenue.length} entries)
- Net Profit/Loss: ${formatPKR(totalRevenue - totalExpenses)} ${totalRevenue - totalExpenses >= 0 ? "(Profit)" : "(Loss)"}
- Break-even Remaining: ${totalRevenue >= totalExpenses ? "Already broke even 💛" : formatPKR(totalExpenses - totalRevenue) + " to recover"}

EXPENSE BREAKDOWN BY CATEGORY:
${Object.entries(categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amt]) => `- ${cat}: ${formatPKR(amt)} (${categoryCount[cat]} items, ${totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : "0"}% of total)`)
  .join("\n") || "No expenses yet"}

REVENUE BY PERFUME:
${Object.entries(perfumeRevenue)
  .sort(([, a], [, b]) => b - a)
  .map(([perf, amt]) => `- ${perf}: ${formatPKR(amt)}`)
  .join("\n") || "No revenue data yet"}

=== ALL EXPENSES (with IDs - use these IDs OR description_match keyword for updates/deletes) ===
${allExpensesList || "No expenses recorded yet"}

=== ALL REVENUE ENTRIES (with IDs) ===
${allRevenueList || "No revenue recorded yet"}
`;

    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${financialSummary}\n\nToday's date is ${new Date().toISOString().split("T")[0]}.\n\nAnswer the user's question. If they ask for an action (add/update/delete), use the action block format at the END of your response. NEVER use "all" as an expense ID. Use either the exact id from the list above OR a description_match keyword.`;

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
      }
    }

    // STEP 2: Try z-ai-web-dev-sdk fallback
    try {
      const aiMessages = [
        { role: "assistant" as const, content: fullSystemPrompt },
        ...history.map((h) => ({
          role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: h.content,
        })),
        { role: "user" as const, content: message },
      ];

      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: aiMessages,
        thinking: { type: "disabled" },
      });

      const aiResponse = completion.choices?.[0]?.message?.content;

      if (aiResponse) {
        let warning: string | undefined;
        if (providerError && apiKey) {
          const providerLabel = provider === "gemini" ? "Gemini" : provider === "groq" ? "Groq" : provider === "openai" ? "OpenAI" : "Custom";
          if (providerErrorKind === "quota") {
            warning = `⚠ Note: Aapki ${providerLabel} API key ka free quota khatam ho gaya hai, isliye abhi free AI (built-in fallback) use karke jawab de raha hoon. AI Settings mein "Groq (Best Free Tier)" select karein taake future mein reliable AI mile. 💛`;
          } else if (providerErrorKind === "auth") {
            warning = `⚠ Note: Aapki ${providerLabel} API key invalid hai, isliye free AI (built-in fallback) use ho raha hai. AI Settings mein key check karein ya Groq try karein (free, generous quota).`;
          } else {
            warning = `⚠ Note: ${providerLabel} API mein issue tha, isliye free AI (built-in fallback) use ho raha hai. AI Settings check karein.`;
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

      const fallbackText = generateFallbackResponse(message, expenses, revenue, totalExpenses, totalRevenue, categoryBreakdown);

      let warning = "⚠ AI providers abhi available nahi hain, isliye basic data-based answer de raha hoon. AI Settings mein Groq configure karein (free, generous quota).";
      if (providerError && providerErrorKind === "quota") {
        const providerLabel = provider === "gemini" ? "Gemini" : provider === "groq" ? "Groq" : provider === "openai" ? "OpenAI" : "Custom";
        warning = `⚠ Aapki ${providerLabel} API key ka quota khatam hai aur backup AI bhi fail hua. AI Settings mein "Groq (Best Free Tier)" select karein - free aur reliable.`;
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
      { role: "user", parts: [{ text: message }] },
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

  if (provider === "openai" || provider === "custom" || provider === "groq") {
    const baseUrl =
      provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : provider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${provider} API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`No response from ${provider}`);
    return text;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

function generateFallbackResponse(
  message: string,
  expenses: Expense[],
  revenue: Revenue[],
  totalExpenses: number,
  totalRevenue: number,
  categoryBreakdown: Record<string, number>
): string {
  const formatPKR = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;
  const lowerMsg = message.toLowerCase();

  // Check if user is asking for an action
  if (lowerMsg.includes("add") || lowerMsg.includes("kar do") || lowerMsg.includes("karo") || lowerMsg.includes("update") || lowerMsg.includes("delete") || lowerMsg.includes("hata")) {
    if (lowerMsg.includes("expense") || lowerMsg.includes("kharcha") || lowerMsg.includes("price") || lowerMsg.includes("cost")) {
      return "Bhai, AI providers abhi available nahi hain isliye main automatically expense add/update/delete nahi kar sakta. Manualy Expenses tab mein jaa kar action kar dein, ya thodi der baad try karein jab AI providers wapas aa jayein. AI Settings mein Groq configure karein (free, generous quota). 💛";
    }
    if (lowerMsg.includes("revenue") || lowerMsg.includes("sale")) {
      return "Bhai, AI providers abhi available nahi hain isliye main automatically revenue add nahi kar sakta. Revenue tab mein jaa kar manualy add kar dein. AI Settings mein Groq configure karein. 💛";
    }
  }

  // List ALL expenses when user asks for "sab" or "saari" or "list"
  if (lowerMsg.includes("sab") || lowerMsg.includes("saari") || lowerMsg.includes("list") || lowerMsg.includes("all expenses") || lowerMsg.includes("kaunse") || lowerMsg.includes("kya kya")) {
    if (expenses.length === 0) {
      return "Bhai, abhi koi expense record nahi hai. Naya expense add karein. 💛";
    }
    const list = expenses.map((e, i) => `${i + 1}. ${e.description} | ${e.category} | ${formatPKR(e.amount)} | ${e.date}`).join("\n");
    return `Bhai, yeh rahi aapki saari ${expenses.length} expenses ki list (total ${formatPKR(totalExpenses)}):\n\n${list}\n\nKoi specific expense ke baare mein aur detail chahiye toh bataein. 💛`;
  }

  if (lowerMsg.includes("packaging") && (lowerMsg.includes("spend") || lowerMsg.includes("kitna") || lowerMsg.includes("kya"))) {
    const packagingTotal = expenses.filter((e) => e.category === "Packaging").reduce((sum, e) => sum + e.amount, 0);
    const packagingItems = expenses.filter((e) => e.category === "Packaging");
    return `Packaging par total ${formatPKR(packagingTotal)} spend hua hai (${packagingItems.length} items). Yeh total expenses ka ${totalExpenses > 0 ? ((packagingTotal / totalExpenses) * 100).toFixed(1) : 0}% hai. Packaging mein bottles aur boxes sabse zyada expensive hain 💛`;
  } else if (lowerMsg.includes("revenue") || lowerMsg.includes("income") || (lowerMsg.includes("total") && !lowerMsg.includes("expense"))) {
    return `Total revenue abhi ${formatPKR(totalRevenue)} hai, aur total expenses ${formatPKR(totalExpenses)} hain. Net position: ${formatPKR(totalRevenue - totalExpenses)} 💛`;
  } else if (lowerMsg.includes("profit") || lowerMsg.includes("loss")) {
    const profit = totalRevenue - totalExpenses;
    return `Current net position ${formatPKR(Math.abs(profit))} ${profit >= 0 ? "profit mein" : "loss mein"} hai. ${profit >= 0 ? "Shabash, keep it up! 💛" : "Mehnat karni paregi, but #AS KHUSHBOO will shine! 💛"}`;
  } else if (lowerMsg.includes("perfume") || lowerMsg.includes("kaunsa") || lowerMsg.includes("which")) {
    const topCategory = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0];
    return `Aapke 6 perfumes hain: Shahkaar (Men), Meherban (Men), Gulnaz (Women), Noor-e-Jahan (Women), Rooh (Unisex), Rawaan (Unisex). Sabse zyada expense ${topCategory ? `${topCategory[0]} (${formatPKR(topCategory[1])})` : "N/A"} par hai. Sales data add karein taake profitable perfume pata chal sake! 💛`;
  } else if (lowerMsg.includes("spend") || lowerMsg.includes("kharcha") || lowerMsg.includes("expense") || lowerMsg.includes("invest")) {
    return `Total investment (sum of all expenses) ${formatPKR(totalExpenses)} hai (${expenses.length} items). Top categories: ${Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a).slice(0, 3).map(([c, a]) => `${c} (${formatPKR(a)})`).join(", ")}. 💛`;
  } else if (lowerMsg.includes("save") || lowerMsg.includes("savings") || lowerMsg.includes("suggest")) {
    const top = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0];
    return `Bhai, savings ke liye: ${top ? `${top[0]} par sabse zyada (${formatPKR(top[1])}) kharch hua hai. ` : ""}Bulk ordering se packaging cost kam ho sakta hai. Digital marketing ka ROI track karein. Samples limited rakhein. 💛`;
  } else {
    return `Bhai, aapka total investment ${formatPKR(totalExpenses)} hai (${expenses.length} items) aur revenue ${formatPKR(totalRevenue)} hai. Koi specific sawal poochein, jaise "Kitna spend hua packaging par?" ya "Saari expenses ki list do" 💛`;
  }
}
