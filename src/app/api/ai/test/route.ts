import { NextRequest, NextResponse } from "next/server";

interface TestResult {
  success: boolean;
  message: string;
  quotaExceeded?: boolean;
  keyValid?: boolean;
}

function parseGeminiError(status: number, errText: string): TestResult {
  // Try to parse the error body
  let errBody: { error?: { code?: number; message?: string; status?: string } } = {};
  try {
    errBody = JSON.parse(errText);
  } catch {
    // not JSON, use raw text
  }

  const errMsg = errBody?.error?.message || errText.substring(0, 200);
  const errStatus = errBody?.error?.status || "";

  if (status === 429) {
    return {
      success: false,
      quotaExceeded: true,
      keyValid: true, // key itself is valid, just quota exceeded
      message:
        "Aapki Gemini API key ka free quota khatam ho gaya hai. API key theek hai, bas limit exceed ho gayi. " +
        "Options: (1) Google AI Studio par wait karein, free quota daily reset hota hai. " +
        "(2) Google Cloud Console par billing enable karke paid plan use karein. " +
        "(3) AI Settings mein 'Free AI (No Key)' select karein, yeh free aur unlimited hai. " +
        "(4) OpenAI ya koi custom provider use karein. 💛",
    };
  }

  if (status === 400 || errStatus === "INVALID_ARGUMENT") {
    return {
      success: false,
      message: `Invalid model name ya request format. Model "${errBody?.error?.message?.includes("model") ? "check your model name" : "unknown"}" may not exist. Try "gemini-2.0-flash" or "gemini-1.5-flash".`,
    };
  }

  if (status === 401 || status === 403) {
    return {
      success: false,
      message: "API key invalid ya unauthorized hai. Google AI Studio (aistudio.google.com/apikey) se naye key generate karein.",
    };
  }

  if (status === 404) {
    return {
      success: false,
      message: `Model "${modelName}" nahi mila. Sahi model name use karein, e.g. "gemini-2.0-flash".`,
    };
  }

  return {
    success: false,
    message: `Gemini API error: ${status} - ${errMsg}`,
  };
}

function parseOpenAIError(status: number, errText: string, provider: string): TestResult {
  let errBody: { error?: { code?: string; message?: string; type?: string } } = {};
  try {
    errBody = JSON.parse(errText);
  } catch {
    // not JSON
  }

  const errMsg = errBody?.error?.message || errText.substring(0, 200);
  const errType = errBody?.error?.type || "";

  if (status === 429) {
    return {
      success: false,
      quotaExceeded: true,
      keyValid: true,
      message: `${provider} quota exceeded. API key valid hai, bas rate limit hit ho gayi. Thodi der baad try karein ya plan upgrade karein.`,
    };
  }

  if (status === 401) {
    return {
      success: false,
      message: `${provider} API key invalid hai. Naya key generate karke try karein.`,
    };
  }

  if (status === 404) {
    return {
      success: false,
      message: `${provider} model nahi mila. Model name check karein.`,
    };
  }

  return {
    success: false,
    message: `${provider} API error: ${status} - ${errMsg}`,
  };
}

let modelName: string = "gemini-2.0-flash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = body.apiKey || "";
    const provider = body.provider || "gemini";
    modelName = body.modelName || "gemini-2.0-flash";
    const customEndpoint = body.customEndpoint || "";

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "API key is required",
      });
    }

    const testMessage = "Hello, respond with OK";

    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: testMessage }] }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        const result = parseGeminiError(response.status, errText);
        return NextResponse.json(result);
      }

      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        return NextResponse.json({
          success: true,
          message: "Gemini API key is working! Connection successful. 💛",
        });
      }

      return NextResponse.json({
        success: false,
        message: "Gemini API returned unexpected response. Model name check karein.",
      });
    }

    if (provider === "openai" || provider === "custom" || provider === "groq") {
      const baseUrl = provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : provider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : customEndpoint;

      if (provider === "custom" && !customEndpoint) {
        return NextResponse.json({
          success: false,
          message: "Custom endpoint URL is required for custom provider",
        });
      }

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: testMessage }],
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        const providerLabel = provider === "openai" ? "OpenAI" : provider === "groq" ? "Groq" : "Custom";
        const result = parseOpenAIError(response.status, errText, providerLabel);
        return NextResponse.json(result);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        const providerLabel = provider === "openai" ? "OpenAI" : provider === "groq" ? "Groq" : "Custom";
        return NextResponse.json({
          success: true,
          message: `${providerLabel} API key is working! Connection successful. 💛`,
        });
      }

      return NextResponse.json({
        success: false,
        message: `${provider} API returned unexpected response`,
      });
    }

    return NextResponse.json({
      success: false,
      message: `Unknown provider: ${provider}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      success: false,
      message: `Connection test failed: ${message}`,
    });
  }
}
