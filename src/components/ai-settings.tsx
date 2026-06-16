"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { AppSettings } from "@/lib/types";
import { toast } from "sonner";

interface AISettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export default function AISettings({ settings, onSettingsChange }: AISettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; quotaExceeded?: boolean; keyValid?: boolean } | null>(null);

  // Local form state
  const [apiKey, setApiKey] = useState(settings.aiApiKey || "");
  const [provider, setProvider] = useState<string>(settings.aiProvider || "free");
  const [modelName, setModelName] = useState(settings.aiModelName || "z-ai-built-in");
  const [customEndpoint, setCustomEndpoint] = useState(settings.aiCustomEndpoint || "");

  // Sync with parent settings
  useEffect(() => {
    setApiKey(settings.aiApiKey || "");
    setProvider(settings.aiProvider || "free");
    setModelName(settings.aiModelName || "z-ai-built-in");
    setCustomEndpoint(settings.aiCustomEndpoint || "");
  }, [settings]);

  const isConfigured =
    settings.aiProvider === "free" ||
    !!(settings.aiApiKey && settings.aiApiKey.length > 0);

  const testConnection = useCallback(async () => {
    if (!apiKey) {
      toast.error("Please enter an API key first");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          provider,
          modelName,
          customEndpoint,
        }),
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch {
      const msg = "Connection test failed. Check your settings.";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  }, [apiKey, provider, modelName, customEndpoint]);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiApiKey: apiKey,
          aiProvider: provider,
          aiModelName: modelName,
          aiCustomEndpoint: customEndpoint,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      const updatedSettings: AppSettings = {
        id: "main",
        aiApiKey: apiKey,
        aiProvider: provider as AppSettings["aiProvider"],
        aiModelName: modelName,
        aiCustomEndpoint: customEndpoint,
        updatedAt: new Date(),
      };

      onSettingsChange(updatedSettings);
      toast.success("AI settings saved successfully! 💛");
    } catch {
      toast.error("Failed to save settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, provider, modelName, customEndpoint, onSettingsChange]);

  const handleProviderChange = (value: string) => {
    setProvider(value);
    if (value === "gemini") {
      setModelName("gemini-2.0-flash");
    } else if (value === "openai") {
      setModelName("gpt-4o-mini");
    } else if (value === "free") {
      // Free AI - uses built-in z-ai-web-dev-sdk, no key needed
      setApiKey("");
      setModelName("z-ai-built-in");
    }
    setTestResult(null);
  };

  return (
    <Card className="bg-[#111111] border-gold/20">
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1A1A1A] transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <Settings size={18} className="text-gold" />
          <span className="text-white font-semibold text-sm">AI Settings</span>
          <div className="flex items-center gap-1.5 ml-2">
            {isConfigured ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 size={14} className="text-success" />
                <span className="text-success text-xs font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <XCircle size={14} className="text-danger" />
                <span className="text-danger text-xs font-medium">Not Configured</span>
              </div>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp size={18} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={18} className="text-muted-foreground" />
        )}
      </button>

      {/* Collapsible content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-4 space-y-4">
              {/* Provider */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Provider</Label>
                <Select value={provider} onValueChange={handleProviderChange}>
                  <SelectTrigger className="bg-[#0A0A0A] border-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-gold/20">
                    <SelectItem value="free" className="text-white focus:text-white focus:bg-gold/10">
                      Free AI (No Key Needed) 💛
                    </SelectItem>
                    <SelectItem value="gemini" className="text-white focus:text-white focus:bg-gold/10">
                      Google Gemini
                    </SelectItem>
                    <SelectItem value="openai" className="text-white focus:text-white focus:bg-gold/10">
                      OpenAI
                    </SelectItem>
                    <SelectItem value="custom" className="text-white focus:text-white focus:bg-gold/10">
                      Custom Endpoint
                    </SelectItem>
                  </SelectContent>
                </Select>
                {provider === "free" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-gold/10 border border-gold/30">
                    <Zap size={14} className="text-gold mt-0.5 flex-shrink-0" />
                    <span className="text-gold">
                      Free AI use ho raha hai. Koi API key zaroori nahi, unlimited messages, built-in backup. Save Settings click karein.
                    </span>
                  </div>
                )}
              </div>

              {/* API Key */}
              {provider !== "free" && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">API Key</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="Enter your AI API key..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    className="bg-[#0A0A0A] border-gold/20 text-white pr-10 placeholder:text-muted-foreground/50"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              )}

              {/* Model Name */}
              {provider !== "free" && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Model Name</Label>
                <Input
                  placeholder="e.g. gemini-2.0-flash"
                  value={modelName}
                  onChange={(e) => {
                    setModelName(e.target.value);
                    setTestResult(null);
                  }}
                  className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
                />
              </div>
              )}

              {/* Custom Endpoint (only for custom provider) */}
              {provider === "custom" && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Custom Endpoint URL</Label>
                  <Input
                    placeholder="https://your-api-endpoint.com/v1/chat/completions"
                    value={customEndpoint}
                    onChange={(e) => {
                      setCustomEndpoint(e.target.value);
                      setTestResult(null);
                    }}
                    className="bg-[#0A0A0A] border-gold/20 text-white placeholder:text-muted-foreground/50"
                  />
                </div>
              )}

              {/* Test result */}
              {testResult && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                    testResult.success
                      ? "bg-success/10 border border-success/30"
                      : testResult.quotaExceeded
                        ? "bg-gold/10 border border-gold/30"
                        : "bg-danger/10 border border-danger/30"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 size={14} className="text-success mt-0.5 flex-shrink-0" />
                  ) : testResult.quotaExceeded ? (
                    <Zap size={14} className="text-gold mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-danger mt-0.5 flex-shrink-0" />
                  )}
                  <span className={testResult.success ? "text-success" : testResult.quotaExceeded ? "text-gold" : "text-danger"}>
                    {testResult.message}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                {provider !== "free" && (
                <Button
                  onClick={testConnection}
                  disabled={isTesting || !apiKey}
                  variant="outline"
                  className="flex-1 border-gold/30 text-gold hover:bg-gold/10 gap-2"
                >
                  {isTesting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Zap size={14} />
                  )}
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
                )}
                <Button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex-1 bg-gold hover:bg-gold-dark text-black font-semibold gap-2"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
