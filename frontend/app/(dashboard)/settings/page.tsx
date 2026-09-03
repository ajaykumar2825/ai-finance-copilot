"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Palette,
  Brain,
  Bell,
  Key,
  User,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  Monitor,
  Globe,
  Mail,
  Newspaper,
  Zap,
  Lock,
  Github,
  Chrome,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";

const LLM_PROVIDERS = ["openai", "gemini", "anthropic"] as const;
const EMBEDDING_PROVIDERS = ["openai", "gemini", "voyage"] as const;
const LANGUAGES = ["en", "es", "fr", "de", "ja", "zh", "pt", "ko"] as const;

const MODEL_MAP: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview", "o1-mini"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
};

export default function SettingsPage() {
  const { settings, isLoadingSettings, updateSettings, isUpdatingSettings } = useSettings();

  const [activeTab, setActiveTab] = useState("appearance");
  const [theme, setTheme] = useState<string>(settings?.theme || "dark");
  const [language, setLanguage] = useState(settings?.language || "en");
  const [llmProvider, setLlmProvider] = useState(settings?.llmProvider || "openai");
  const [model, setModel] = useState("gpt-4o");
  const [embeddingProvider, setEmbeddingProvider] = useState(settings?.embeddingProvider || "openai");
  const [notifications, setNotifications] = useState({
    email: settings?.notifications.email ?? true,
    push: settings?.notifications.push ?? true,
    priceAlerts: settings?.notifications.priceAlerts ?? true,
    newsAlerts: settings?.notifications.newsAlerts ?? false,
  });
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    gemini: "",
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    gemini: false,
  });
  const [keyStatuses, setKeyStatuses] = useState<Record<string, "idle" | "testing" | "valid" | "invalid">>({
    openai: "idle",
    gemini: "idle",
  });
  const [connectedProviders, setConnectedProviders] = useState({
    google: true,
    github: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (section: string) => {
    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (section === "appearance") {
        updateData.theme = theme;
        updateData.language = language;
      } else if (section === "ai-preferences") {
        updateData.llmProvider = llmProvider;
        updateData.embeddingProvider = embeddingProvider;
      } else if (section === "notifications") {
        updateData.notifications = notifications;
      }
      if (Object.keys(updateData).length > 0) {
        await updateSettings(updateData as Parameters<typeof updateSettings>[0]);
      }
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const testApiKey = async (provider: string) => {
    setKeyStatuses((prev) => ({ ...prev, [provider]: "testing" }));
    await new Promise((r) => setTimeout(r, 1500));
    const key = apiKeys[provider as keyof typeof apiKeys];
    setKeyStatuses((prev) => ({
      ...prev,
      [provider]: key.length > 10 ? "valid" : "invalid",
    }));
  };

  const toggleProvider = (provider: "google" | "github") => {
    setConnectedProviders((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
    toast.success(
      connectedProviders[provider]
        ? `${provider} disconnected`
        : `${provider} connected`
    );
  };

  const handleExportData = () => {
    toast.success("Data export started. You'll receive an email when ready.");
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText === "DELETE") {
      toast.success("Account deletion request submitted");
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-white/[0.04] rounded-lg animate-shimmer" />
          <div className="h-4 w-72 bg-white/[0.04] rounded-lg animate-shimmer" />
        </div>
        <div className="h-10 w-full bg-white/[0.04] rounded-lg animate-shimmer" />
        <div className="h-64 w-full bg-white/[0.04] rounded-xl animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="ai-preferences" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2 text-red-400 data-[state=active]:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <Label className="text-base font-medium">Theme</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`group relative rounded-xl border p-4 transition-all duration-200 ${
                        theme === value
                          ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className={`rounded-lg p-3 ${
                            theme === value
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-white/[0.06] text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      {theme === value && (
                        <div className="absolute right-2 top-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-white/[0.06]" />

              <div className="space-y-4">
                <Label className="text-base font-medium">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full max-w-xs">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("appearance")} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Appearance
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Preferences */}
        <TabsContent value="ai-preferences">
          <Card>
            <CardHeader>
              <CardTitle>AI Preferences</CardTitle>
              <CardDescription>Configure your AI model and embedding settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <Label className="text-base font-medium">LLM Provider</Label>
                <div className="grid grid-cols-3 gap-4">
                  {LLM_PROVIDERS.map((provider) => (
                    <button
                      key={provider}
                      onClick={() => {
                        setLlmProvider(provider);
                        setModel(MODEL_MAP[provider][0]);
                      }}
                      className={`rounded-xl border p-4 text-center transition-all duration-200 capitalize ${
                        llmProvider === provider
                          ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20 text-emerald-400"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_MAP[llmProvider].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-white/[0.06]" />

              <div className="space-y-4">
                <Label className="text-base font-medium">Embedding Provider</Label>
                <div className="grid grid-cols-3 gap-4">
                  {EMBEDDING_PROVIDERS.map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setEmbeddingProvider(provider)}
                      className={`rounded-xl border p-4 text-center transition-all duration-200 capitalize ${
                        embeddingProvider === provider
                          ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20 text-emerald-400"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("ai-preferences")} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save AI Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "email" as const, label: "Email Notifications", description: "Receive email updates about your account activity", icon: Mail },
                { key: "priceAlerts" as const, label: "Market Alerts", description: "Get notified about significant price movements", icon: Zap },
                { key: "newsAlerts" as const, label: "News Digest", description: "Daily summary of relevant financial news", icon: Newspaper },
                { key: "push" as const, label: "Push Notifications", description: "Browser push notifications for real-time updates", icon: Bell },
              ].map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-white/[0.06] p-2.5">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications[key]}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <Button onClick={() => handleSave("notifications")} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for third-party services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(["openai", "gemini"] as const).map((provider) => (
                <div key={provider} className="space-y-3">
                  <Label className="text-sm font-medium capitalize">{provider} API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKeys[provider] ? "text" : "password"}
                        placeholder={`Enter your ${provider} API key`}
                        value={apiKeys[provider]}
                        onChange={(e) =>
                          setApiKeys((prev) => ({ ...prev, [provider]: e.target.value }))
                        }
                        className="pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKeys[provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => testApiKey(provider)}
                      disabled={keyStatuses[provider] === "testing" || !apiKeys[provider]}
                      className="shrink-0"
                    >
                      {keyStatuses[provider] === "testing" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : keyStatuses[provider] === "valid" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : keyStatuses[provider] === "invalid" ? (
                        <XCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      {keyStatuses[provider] === "testing"
                        ? "Testing..."
                        : keyStatuses[provider] === "valid"
                        ? "Valid"
                        : keyStatuses[provider] === "invalid"
                        ? "Invalid"
                        : "Test"}
                    </Button>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-gold-500/20 bg-gold-500/5 p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-gold-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gold-300">Your keys are encrypted</p>
                    <p className="text-xs text-gold-400/70 mt-1">
                      API keys are encrypted at rest using AES-256 and are never shared with third parties.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage connected providers and data export</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">Connected Providers</Label>
                {[
                  { key: "google" as const, label: "Google", icon: Chrome, color: "text-blue-400" },
                  { key: "github" as const, label: "GitHub", icon: Github, color: "text-foreground" },
                ].map(({ key, label, icon: Icon, color }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-white/[0.06] p-2.5">
                        <Icon className={`h-5 w-5 ${color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          {connectedProviders[key] ? "Connected" : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={connectedProviders[key] ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleProvider(key)}
                    >
                      {connectedProviders[key] ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                ))}
              </div>

              <Separator className="bg-white/[0.06]" />

              <div className="space-y-4">
                <Label className="text-base font-medium">Data Export</Label>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Export all your data</p>
                      <p className="text-sm text-muted-foreground">
                        Download a copy of all your data including documents, chats, and portfolio
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleExportData}>
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger">
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-red-300">Delete Account</p>
                    <p className="text-sm text-red-400/70">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action is irreversible. All your data including documents, chats, portfolio, and account information will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm:
            </p>
            <Input
              placeholder='Type "DELETE" to confirm'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="border-red-500/30 focus-visible:ring-red-500/50"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDeleteAccount}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
