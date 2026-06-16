import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * SERVER-ONLY Firebase Admin SDK
 * ===============================
 * This module uses service account credentials stored in environment variables.
 * It MUST only be imported from server-side code (API routes, server components).
 *
 * The credentials bypass Firestore security rules, allowing the server to
 * read/write data even when client-side access is denied (locked down rules).
 *
 * Required env vars (set in Vercel project settings):
 *  - FIREBASE_PROJECT_ID
 *  - FIREBASE_CLIENT_EMAIL
 *  - FIREBASE_PRIVATE_KEY  (the full PEM string, including -----BEGIN-----)
 *
 * If env vars are missing, the app falls back to localStorage on the client.
 */

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAvailable: boolean | null = null;

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return null;
  }

  // The private key may come in with literal \n sequences (common when stored as env var).
  // Convert them to real newlines.
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return { projectId, clientEmail, privateKey };
}

function initAdmin(): boolean {
  if (adminAvailable !== null) return adminAvailable;

  try {
    const serviceAccount = getServiceAccount();
    if (!serviceAccount) {
      console.warn("[firebase-admin] Missing env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Server-side Firestore disabled.");
      adminAvailable = false;
      return false;
    }

    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
      });
    } else {
      adminApp = getApps()[0];
    }

    adminDb = getFirestore(adminApp);
    adminAvailable = true;
    console.log("[firebase-admin] Initialized with project:", serviceAccount.projectId);
    return true;
  } catch (e) {
    console.error("[firebase-admin] Initialization failed:", e instanceof Error ? e.message : String(e));
    adminAvailable = false;
    return false;
  }
}

export function getAdminDb(): Firestore | null {
  if (!initAdmin()) return null;
  return adminDb;
}

export function isAdminAvailable(): boolean {
  return initAdmin();
}

// Collection names (must match the client SDK)
export const EXPENSES_COLLECTION = "finance_expenses";
export const REVENUE_COLLECTION = "finance_revenue";
export const SETTINGS_COLLECTION = "finance_settings";
export const SETTINGS_DOC = "main";
