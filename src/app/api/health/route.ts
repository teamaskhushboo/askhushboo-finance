import { NextResponse } from "next/server";
import { isAdminAvailable } from "@/lib/firebase-admin";

/**
 * GET /api/health
 * Returns server status. Used by the client to detect whether the
 * server-side Firebase Admin SDK is properly configured.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    serverTime: new Date().toISOString(),
    adminConfigured: isAdminAvailable(),
  });
}
