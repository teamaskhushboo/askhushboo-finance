import { NextRequest, NextResponse } from "next/server";
import {
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "@/lib/firebase";

const SETTINGS_COLLECTION = "finance_settings";
const SETTINGS_DOC = "main";

export async function GET() {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return NextResponse.json({
        id: snapshot.id,
        aiApiKey: data.aiApiKey || "",
        aiProvider: data.aiProvider || "gemini",
        aiModelName: data.aiModelName || "gemini-2.0-flash",
        aiCustomEndpoint: data.aiCustomEndpoint || "",
        updatedAt: data.updatedAt || null,
      });
    }

    return NextResponse.json({
      id: SETTINGS_DOC,
      aiApiKey: "",
      aiProvider: "groq",
      aiModelName: "llama-3.3-70b-versatile",
      aiCustomEndpoint: "",
      updatedAt: null,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { aiApiKey, aiProvider, aiModelName, aiCustomEndpoint } = body;

    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    await setDoc(docRef, {
      aiApiKey: aiApiKey || "",
      aiProvider: aiProvider || "gemini",
      aiModelName: aiModelName || "gemini-2.0-flash",
      aiCustomEndpoint: aiCustomEndpoint || "",
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
