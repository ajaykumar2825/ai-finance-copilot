"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Camera,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  Zap,
  Crown,
  Loader2,
  Save,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";

const TIER_CONFIG = {
  free: { label: "Free", color: "bg-white/10 text-white" },
  pro: { label: "Pro", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  enterprise: { label: "Enterprise", color: "bg-gold-500/10 text-gold-400 border-gold-500/20" },
} as const;

export default function ProfilePage() {
  const { user, isLoadingProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const usageStats = [
    { label: "Documents Uploaded", value: 24, icon: FileText, color: "text-emerald-400" },
    { label: "Chats Created", value: 156, icon: MessageSquare, color: "text-blue-400" },
    { label: "API Calls", value: 2847, icon: Zap, color: "text-gold-400" },
  ];

  if (isLoadingProfile) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-white/[0.04] rounded-lg animate-shimmer" />
          <div className="h-4 w-64 bg-white/[0.04] rounded-lg animate-shimmer" />
        </div>
        <div className="h-48 w-full bg-white/[0.04] rounded-xl animate-shimmer" />
        <div className="h-32 w-full bg-white/[0.04] rounded-xl animate-shimmer" />
      </div>
    );
  }

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const tier = TIER_CONFIG[user?.subscriptionTier || "free"];

  const handleStartEdit = () => {
    setDisplayName(user?.fullName || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
    setIsEditing(false);
    toast.success("Profile updated successfully");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        toast.success("Avatar updated");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your profile information</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-white/[0.1]">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt={user?.fullName} />
                ) : user?.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                ) : null}
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-foreground">{user?.fullName}</h2>
                    <Badge variant="outline" className={tier.color}>
                      <Crown className="h-3 w-3 mr-1" />
                      {tier.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      Joined {user?.createdAt ? formatDate(user.createdAt) : "N/A"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isEditing ? handleSave : handleStartEdit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEditing ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                  {isEditing ? "Save" : "Edit"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>Your activity across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {usageStats.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center space-y-3"
              >
                <div className="flex justify-center">
                  <div className="rounded-lg bg-white/[0.06] p-2.5">
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
