import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = body.apiKey || "";
    const provider = body.provider || "gemini";
    const modelName = body.modelName || "gemini-2.0-flash";
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
        return NextResponse.json({
          success: false,
          message: `Gemini API error: ${response.status} - ${errText.substring(0, 200)}`,
        });
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
        message: "Gemini API returned unexpected response",
      });
    }

    if (provider === "openai" || provider === "custom") {
      const baseUrl = provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
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
        return NextResponse.json({
          success: false,
          message: `${provider === "openai" ? "OpenAI" : "Custom"} API error: ${response.status} - ${errText.substring(0, 200)}`,
        });
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        return NextResponse.json({
          success: true,
          message: `${provider === "openai" ? "OpenAI" : "Custom"} API key is working! Connection successful. 💛`,
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
