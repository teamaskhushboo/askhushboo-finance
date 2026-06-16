/**
 * DEPRECATED - This file is no longer used.
 *
 * All Firestore operations now go through server-side API routes
 * that use the Firebase Admin SDK (see src/lib/firebase-admin.ts).
 *
 * The browser no longer talks to Firestore directly. This means:
 * 1. The Firebase API key in the client bundle is harmless (rules deny all client access)
 * 2. All data operations are authenticated server-side via service account
 * 3. The Firestore security rules are locked down (see firestore.rules)
 *
 * This file is kept only for backward compatibility. Do not import from it.
 */

export const FIREBASE_DEPRECATED = true;
