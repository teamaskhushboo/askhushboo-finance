"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import AnimatedLogo from "./animated-logo";

const LS_AUTH_KEY = "askhushboo_auth_v1";

/**
 * App-level password gate.
 * Uses NEXT_PUBLIC_APP_PASSWORD env var (set in Vercel).
 * If env var is not set, defaults to "askhushboo2026" (user should change this).
 * This is an ADDITIONAL layer on top of the locked-down Firestore rules.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // The password is exposed to the client (NEXT_PUBLIC_ prefix).
  // This is intentional: it's a UI gate, NOT a substitute for Firestore security.
  // The real security is the locked-down Firestore rules + server-side Admin SDK.
  const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || "askhushboo2026";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_AUTH_KEY);
      if (saved === "true") {
        setUnlocked(true);
      }
    } catch {}
    setChecking(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      setUnlocked(true);
      try {
        localStorage.setItem(LS_AUTH_KEY, "true");
      } catch {}
      setError("");
    } else {
      setError("Wrong password. Try again.");
      setPassword("");
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(LS_AUTH_KEY);
    } catch {}
    setUnlocked(false);
    setPassword("");
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AnimatedLogo size="lg" className="mx-auto mb-4" />
          <h1 className="as-logo-text text-2xl font-bold mb-2">#AS KHUSHBOO</h1>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <AnimatedLogo size="lg" className="mx-auto mb-4" />
            <h1 className="as-logo-text text-3xl font-bold mb-2">#AS KHUSHBOO</h1>
            <p className="text-muted-foreground text-sm">
              Khushboo That Speaks for YOU
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Finance Management System
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-[#0A0A0A] border border-[rgba(223,173,24,0.2)] rounded-lg p-6 space-y-4"
          >
            <div className="text-center mb-2">
              <Lock className="w-8 h-8 text-gold mx-auto mb-2" />
              <p className="text-white font-medium">Enter Password</p>
              <p className="text-muted-foreground text-xs mt-1">
                Protected area. Authorized access only.
              </p>
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="bg-black border-[rgba(223,173,24,0.3)] text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-gold text-black hover:bg-gold/90 font-semibold"
            >
              Unlock
            </Button>

            <div className="flex items-center gap-2 justify-center pt-2 text-xs text-muted-foreground">
              <ShieldCheck size={12} className="text-gold" />
              <span>Secured by Firebase Admin SDK</span>
            </div>
          </form>

          <p className="text-center text-muted-foreground text-xs mt-6">
            #AS KHUSHBOO &copy; 2026 💛
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {children}
      {/* Floating logout button - bottom right */}
      <button
        onClick={handleLogout}
        className="fixed bottom-4 right-4 z-40 bg-[#0A0A0A] border border-[rgba(223,173,24,0.2)] text-muted-foreground hover:text-gold p-2 rounded-full transition-colors"
        title="Lock app"
        aria-label="Lock app"
      >
        <Lock size={16} />
      </button>
    </div>
  );
}
