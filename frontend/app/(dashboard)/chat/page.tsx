"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChats, useChat } from "@/hooks/use-chats";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { formatRelativeDate } from "@/lib/utils";
import type { Chat } from "@/types";

export default function ChatPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const { chats, isLoadingChats, createChat, isCreatingChat, deleteChat } =
    useChats();
  const { chat: selectedChat } = useChat(selectedChatId);

  const filteredChats = useMemo(() => {
    if (!debouncedSearch) return chats;
    return chats.filter(
      (chat: Chat) =>
        chat.title.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [chats, debouncedSearch]);

  const pinnedChats = filteredChats.filter((c: Chat) => c.pinned);
  const unpinnedChats = filteredChats.filter((c: Chat) => !c.pinned);

  const handleCreateChat = () => {
    createChat(
      { title: "New Chat", modelUsed: "gpt-4" },
      {
        onSuccess: (response: { data: Chat }) => {
          if (response?.data) {
            router.push(`/chat/${response.data.id}`);
          }
        },
      }
    );
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    if (isMobile) {
      router.push(`/chat/${chatId}`);
    }
  };

  const renderChatItem = (chat: Chat) => (
    <button
      key={chat.id}
      onClick={() => handleSelectChat(chat.id)}
      className={`group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all duration-200 hover:bg-white/[0.05] ${
        selectedChatId === chat.id
          ? "bg-white/[0.08] border border-emerald-500/20"
          : "border border-transparent"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
        <MessageSquare className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {chat.title}
          </span>
          {chat.pinned && (
            <Pin className="h-3 w-3 shrink-0 text-gold-400 fill-gold-400" />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {chat.title}
        </p>
        <span className="mt-1 block text-[11px] text-muted-foreground/60">
          {formatRelativeDate(chat.updatedAt)}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-foreground group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {chat.pinned ? (
              <>
                <PinOff className="h-4 w-4" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="h-4 w-4" />
                Pin
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteChat(chat.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  );

  const renderSkeletons = () => (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full gap-0 -m-6">
      <div
        className={`flex flex-col border-r border-white/[0.08] bg-surface/30 ${
          isMobile ? "w-full" : "w-80"
        } ${
          isMobile && selectedChatId ? "hidden" : ""
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
          <h2 className="text-lg font-semibold text-foreground">Chats</h2>
          <Button
            size="sm"
            onClick={handleCreateChat}
            disabled={isCreatingChat}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
        <div className="p-3">
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="h-9"
          />
        </div>
        <ScrollArea className="flex-1">
          {isLoadingChats ? (
            renderSkeletons()
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
                <MessageSquare className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? "No matches found" : "No conversations yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Start a new chat to begin"}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {pinnedChats.length > 0 && (
                <div className="mb-2">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </span>
                  {pinnedChats.map(renderChatItem)}
                </div>
              )}
              {unpinnedChats.length > 0 && (
                <div>
                  {pinnedChats.length > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Recent
                    </span>
                  )}
                  {unpinnedChats.map(renderChatItem)}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <div
        className={`flex-1 flex items-center justify-center ${
          !isMobile && selectedChatId ? "hidden" : ""
        }`}
      >
        {selectedChatId && !isMobile ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border-glow-emerald">
                <Sparkles className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Chat selected
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click a chat to view it, or{" "}
                <button
                  onClick={() => router.push(`/chat/${selectedChatId}`)}
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                >
                  open in full view
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 text-center">
            <div className="relative mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 animate-float">
                <MessageSquare className="h-10 w-10 text-emerald-400/70" />
              </div>
              <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gold-500/20 border border-gold-500/30">
                <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              AI Finance Copilot
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              Select a conversation or start a new one. Ask questions about
              markets, portfolio analysis, or financial planning.
            </p>
            <Button
              onClick={handleCreateChat}
              disabled={isCreatingChat}
              className="mt-6 gap-2"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              Start New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
