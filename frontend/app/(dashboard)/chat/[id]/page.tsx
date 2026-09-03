"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  Send,
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Share2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Bot,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useChat,
  useMessages,
  useSendMessage,
} from "@/hooks/use-chats";
import { useChatStore } from "@/stores/chat.store";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatRelativeDate } from "@/lib/utils";
import type { Message, Citation } from "@/types";

const AVAILABLE_MODELS = [
  { value: "gpt-4", label: "GPT-4o" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "claude-3", label: "Claude 3" },
  { value: "claude-3-opus", label: "Claude 3 Opus" },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function CitationBlock({ citations }: { citations: Citation[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.03] transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-gold-400" />
          {citations.length} source{citations.length !== 1 ? "s" : ""} referenced
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      {expanded && (
        <div className="space-y-1.5 border-t border-white/[0.06] p-3">
          {citations.map((citation) => (
            <div
              key={citation.id}
              className="rounded-md bg-white/[0.03] px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] py-0">
                  {citation.source}
                </Badge>
                {citation.page && (
                  <span className="text-muted-foreground/60">
                    p. {citation.page}
                  </span>
                )}
                <span className="ml-auto text-emerald-400/60">
                  {(citation.relevance * 100).toFixed(0)}% relevant
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {citation.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageActions({
  content,
  onRegenerate,
}: {
  content: string;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
        title="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
          title="Regenerate"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        onClick={() => setFeedback(feedback === "up" ? null : "up")}
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          feedback === "up"
            ? "text-emerald-400 bg-emerald-500/10"
            : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        }`}
        title="Helpful"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setFeedback(feedback === "down" ? null : "down")}
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          feedback === "down"
            ? "text-destructive bg-destructive/10"
            : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        }`}
        title="Not helpful"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`group flex gap-3 px-4 py-3 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-white/[0.06] text-muted-foreground"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={`flex max-w-[75%] flex-col ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white"
              : "glass-card text-foreground"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-pre:my-3 prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/[0.08] prose-code:text-emerald-400 prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-a:text-emerald-400 hover:prose-a:text-emerald-300 prose-th:text-foreground prose-th:border-white/[0.08] prose-td:border-white/[0.08]">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {isStreaming && isUser === false && (
            <div className="mt-2 flex items-center gap-2">
              <TypingIndicator />
            </div>
          )}
        </div>
        {!isUser && (
          <>
            <CitationBlock citations={message.citations} />
            <MessageActions
              content={message.content}
              onRegenerate={undefined}
            />
          </>
        )}
        <span className="mt-1 text-[11px] text-muted-foreground/50 px-1">
          {formatRelativeDate(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="group flex gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex max-w-[75%] flex-col items-start">
        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed glass-card text-foreground">
          {content ? (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:my-3 prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/[0.08] prose-code:text-emerald-400 prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-a:text-emerald-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <TypingIndicator />
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className={`flex flex-col gap-2 ${i % 2 === 0 ? "items-start" : "items-end"}`}>
            <Skeleton className={`h-20 ${i % 2 === 0 ? "w-96" : "w-64"} rounded-2xl`} />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground">
        Failed to load conversation
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Something went wrong. Please try again.
      </p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 gap-2">
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const chatId = params.id as string;

  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { chat, isLoadingChat } = useChat(chatId);
  const { messages, isLoadingMessages } = useMessages(chatId);
  const { sendMessage } = useSendMessage();
  const { isStreaming, streamingMessage, setCurrentChatId } = useChatStore();

  useEffect(() => {
    setCurrentChatId(chatId);
    return () => setCurrentChatId(null);
  }, [chatId, setCurrentChatId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(chatId, trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = isLoadingChat || isLoadingMessages;
  const hasError = !isLoading && !chat;

  return (
    <div className="flex h-full -m-6">
      {showSidebar && !isMobile && (
        <div className="w-72 shrink-0 border-r border-white/[0.08] bg-surface/30">
          <div className="flex items-center gap-2 border-b border-white/[0.08] p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/chat")}
              className="shrink-0 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-medium text-foreground truncate">
              Conversations
            </h3>
          </div>
          <ScrollArea className="h-[calc(100%-57px)]">
            {messages.slice().reverse().map((msg) => (
              <div
                key={msg.id}
                className="px-4 py-2 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <p className="text-xs text-muted-foreground truncate">
                  {msg.role === "user" ? "You" : "AI"}: {msg.content.slice(0, 60)}
                </p>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/chat")}
                className="h-8 w-8 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="h-8 w-8 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
                {chat?.title || "Chat"}
              </h1>
              {chat && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground/60">
                    {messages.length} messages
                  </span>
                  <span className="text-[11px] text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground/60">
                    {chat.modelUsed}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <LoadingSkeleton />
          ) : hasError ? (
            <ErrorState onRetry={() => window.location.reload()} />
          ) : messages.length === 0 && !streamingMessage ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20">
                <Sparkles className="h-8 w-8 text-emerald-400/70" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Start the conversation
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Ask about market trends, portfolio performance, stock analysis,
                or any financial topic.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm">
                {[
                  "Analyze my portfolio risk",
                  "Compare AAPL vs MSFT",
                  "Explain P/E ratios",
                  "Summarize recent earnings",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left text-xs text-muted-foreground hover:border-emerald-500/30 hover:text-foreground transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isStreaming && (
                <StreamingMessage content={streamingMessage} />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-white/[0.08] bg-surface/30 p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 focus-within:border-emerald-500/30 transition-colors">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about finance..."
                rows={1}
                className="flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none max-h-40 min-h-[36px]"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="h-9 w-9 shrink-0 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground/40">
              AI can make mistakes. Verify important financial information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
