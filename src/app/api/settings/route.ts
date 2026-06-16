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

// Note: When Firestore security rules block access, this endpoint will return
// the default settings. The client-side storage.ts handles localStorage fallback
// automatically, so the user can still save settings locally.

export async function GET() {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return NextResponse.json({
        id: snapshot.id,
        aiApiKey: data.aiApiKey || "",
        aiProvider: data.aiProvider || "groq",
        aiModelName: data.aiModelName || "llama-3.3-70b-versatile",
        aiCustomEndpoint: data.aiCustomEndpoint || "",
        updatedAt: data.updatedAt || null,
        firebaseConnected: true,
      });
    }

    return NextResponse.json({
      id: SETTINGS_DOC,
      aiApiKey: "",
      aiProvider: "groq",
      aiModelName: "llama-3.3-70b-versatile",
      aiCustomEndpoint: "",
      updatedAt: null,
      firebaseConnected: true,
    });
  } catch (error) {
    console.error("Settings GET error (Firebase unavailable):", error instanceof Error ? error.message : String(error));
    // Return defaults so client can use localStorage fallback
    return NextResponse.json({
      id: SETTINGS_DOC,
      aiApiKey: "",
      aiProvider: "groq",
      aiModelName: "llama-3.3-70b-versatile",
      aiCustomEndpoint: "",
      updatedAt: null,
      firebaseConnected: false,
      error: "Firebase unavailable - using localStorage",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { aiApiKey, aiProvider, aiModelName, aiCustomEndpoint } = body;

    // Try to save to Firebase
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
      await setDoc(docRef, {
        aiApiKey: aiApiKey || "",
        aiProvider: aiProvider || "groq",
        aiModelName: aiModelName || "llama-3.3-70b-versatile",
        aiCustomEndpoint: aiCustomEndpoint || "",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return NextResponse.json({
        success: true,
        firebaseConnected: true,
        message: "Settings saved to Firebase cloud",
      });
    } catch (firebaseError) {
      console.error("Settings POST Firebase error (client should use localStorage):", firebaseError instanceof Error ? firebaseError.message : String(firebaseError));
      // Don't fail - tell client to use localStorage
      return NextResponse.json({
        success: true,
        firebaseConnected: false,
        message: "Settings saved locally (Firebase unavailable). See console for fix instructions.",
      });
    }
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
