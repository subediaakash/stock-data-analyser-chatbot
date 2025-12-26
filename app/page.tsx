"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// ========================
// Configuration
// ========================

const ERROR_CONFIG = {
  maxConsecutiveErrors: 2,
  fallbackMessage:
    "I'm having trouble responding right now. Please try again in a moment.",
  resetMessage:
    "Multiple errors occurred. The chat has been reset. Please try your question again.",
} as const;

// ========================
// Types
// ========================

type ChatMetadata = {
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  cachedInputTokens: number | null;
};

type ChatMessage = UIMessage<ChatMetadata>;

// ========================
// Icons
// ========================

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

// ========================
// Components
// ========================

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="typing-dot size-2 rounded-full bg-primary/60" />
      <div className="typing-dot size-2 rounded-full bg-primary/60" />
      <div className="typing-dot size-2 rounded-full bg-primary/60" />
    </div>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const handleCopy = useCallback(() => {
    if (codeRef.current) {
      navigator.clipboard.writeText(codeRef.current.textContent || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 dark:bg-zinc-950 p-4 text-sm">
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Copy code"
      >
        {copied ? (
          <CheckIcon className="size-4" />
        ) : (
          <CopyIcon className="size-4" />
        )}
      </button>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const components: Components = useMemo(
    () => ({
      // Headings
      h1: ({ children }) => (
        <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-lg font-semibold mt-4 mb-2 first:mt-0">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">
          {children}
        </h3>
      ),

      // Paragraphs
      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,

      // Lists
      ul: ({ children }) => (
        <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
      ),
      li: ({ children }) => <li className="leading-relaxed">{children}</li>,

      // Code
      code: ({ className, children, ...props }) => {
        const isInline = !className;
        if (isInline) {
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        }
        return <CodeBlock className={className}>{children}</CodeBlock>;
      },
      pre: ({ children }) => <>{children}</>,

      // Tables
      table: ({ children }) => (
        <div className="overflow-x-auto mb-3">
          <table className="min-w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-muted/50">{children}</thead>
      ),
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => (
        <tr className="border-b border-border">{children}</tr>
      ),
      th: ({ children }) => (
        <th className="px-3 py-2 text-left font-semibold">{children}</th>
      ),
      td: ({ children }) => <td className="px-3 py-2">{children}</td>,

      // Links
      a: ({ href, children }) => {
        // Check if it's a PDF link
        const pdfMatch = href?.match(
          /https:\/\/ainoc-chatbot-files-bucket\.s3\.us-east-2\.amazonaws\.com\/([^.\s]+)\.pdf/
        );
        if (pdfMatch) {
          return (
            <Button
              variant="secondary"
              size="sm"
              className="mx-1 my-1 inline-flex gap-1.5 rounded-full text-xs font-medium"
              asChild
            >
              <a
                href={href}
                download={`invoice-${pdfMatch[1]}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadIcon className="size-3.5" />
                Invoice {pdfMatch[1]}
              </a>
            </Button>
          );
        }
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {children}
          </a>
        );
      },

      // Blockquotes
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground mb-3">
          {children}
        </blockquote>
      ),

      // Horizontal rule
      hr: () => <hr className="my-4 border-border" />,

      // Strong/Bold
      strong: ({ children }) => (
        <strong className="font-semibold">{children}</strong>
      ),

      // Emphasis/Italic
      em: ({ children }) => <em className="italic">{children}</em>,
    }),
    []
  );

  // Pre-process content to handle PDF URLs that aren't in markdown link format
  const processedContent = useMemo(() => {
    const pdfUrlRegex =
      /(https:\/\/ainoc-chatbot-files-bucket\.s3\.us-east-2\.amazonaws\.com\/([^.\s]+)\.pdf)/g;
    return content.replace(pdfUrlRegex, "[$2]($1)");
  }, [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
}

function MessageBubble({
  message,
  isUser,
}: {
  message: ChatMessage;
  isUser: boolean;
}) {
  return (
    <div
      className={`message-animate flex gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 size-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
        }`}
      >
        {isUser ? (
          <UserIcon className="size-4" />
        ) : (
          <SparklesIcon className="size-4" />
        )}
      </div>

      {/* Message content */}
      <div
        className={`flex flex-col gap-1 max-w-[85%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-2xl leading-relaxed ${
            isUser
              ? "px-4 py-2.5 bg-primary text-primary-foreground rounded-br-md"
              : "px-4 py-3 bg-card border border-border shadow-sm rounded-bl-md prose-container"
          }`}
        >
          {message.parts.map((part, i) => {
            switch (part.type) {
              case "text":
                return (
                  <div key={`${message.id}-${i}`}>
                    {isUser ? (
                      <span className="whitespace-pre-wrap">{part.text}</span>
                    ) : (
                      <MarkdownContent content={part.text} />
                    )}
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>

        {/* Token info for AI messages */}
        {!isUser &&
          message.metadata &&
          message.metadata.totalTokens !== null && (
            <div className="text-[10px] text-muted-foreground px-1">
              {message.metadata.totalTokens} tokens
            </div>
          )}
      </div>
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
  onReset,
  showReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
  showReset: boolean;
}) {
  return (
    <div className="message-animate mx-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="shrink-0 size-8 rounded-full bg-destructive/20 flex items-center justify-center">
          <svg
            className="size-4 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground font-medium mb-1">
            Something went wrong
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="rounded-full"
            >
              <RefreshIcon className="size-3.5 mr-1.5" />
              Retry
            </Button>
            {showReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="rounded-full text-muted-foreground"
              >
                Reset Chat
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
        <SparklesIcon className="size-8 text-white" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Stock Analytics Assistant
      </h2>
      <p className="text-muted-foreground max-w-sm mb-8">
        Ask me about invoices, sales trends, customer analytics, and stock
        inventory data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
        {[
          "Show my recent invoices",
          "Top customers by revenue",
          "Stock replenishment report",
          "Sales by region this quarter",
        ].map((suggestion) => (
          <button
            key={suggestion}
            className="text-left px-4 py-3 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all text-sm text-muted-foreground hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========================
// Main Chat Component
// ========================

export default function Chat() {
  const [input, setInput] = useState("");
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [showResetNotice, setShowResetNotice] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, error, status, setMessages } =
    useChat<ChatMessage>({
      onError: (err) => {
        console.error("[Chat Error]:", err);
        setConsecutiveErrors((prev) => {
          const newCount = prev + 1;
          if (newCount > ERROR_CONFIG.maxConsecutiveErrors) {
            setMessages([]);
            setShowResetNotice(true);
            return 0;
          }
          return newCount;
        });
      },
      onFinish: () => {
        setConsecutiveErrors(0);
        setShowResetNotice(false);
        setLastUserMessage(null);
      },
    });

  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Auth redirect
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
    }
  }, [isPending, session, router]);

  const handleRetry = useCallback(() => {
    if (lastUserMessage) {
      sendMessage({ text: lastUserMessage });
    }
  }, [lastUserMessage, sendMessage]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setConsecutiveErrors(0);
    setShowResetNotice(false);
    setLastUserMessage(null);
  }, [setMessages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      setShowResetNotice(false);
      setLastUserMessage(input.trim());
      sendMessage({ text: input });
      setInput("");
    },
    [input, sendMessage]
  );

  const handleLogout = useCallback(async () => {
    await authClient.signOut();
    router.push("/sign-in");
  }, [router]);

  // Loading state for auth
  if (isPending) {
    return (
      <div className="gradient-mesh min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
            <SparklesIcon className="size-6 text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isLoading = status === "streaming" || status === "submitted";
  const hasError = error && status !== "streaming";

  return (
    <div className="gradient-mesh min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <SparklesIcon className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Stock Assistant</h1>
              <p className="text-xs text-muted-foreground">Powered by AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
              <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="size-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground max-w-[120px] truncate">
                {session.user?.name || session.user?.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <LogOutIcon className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Reset notice */}
          {showResetNotice && (
            <div className="message-animate mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {ERROR_CONFIG.resetMessage}
              </p>
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !isLoading && <EmptyState />}

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isUser={message.role === "user"}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="message-animate flex gap-3">
                <div className="shrink-0 size-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <SparklesIcon className="size-4 text-white" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md shadow-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}

            {/* Error banner */}
            {hasError && (
              <ErrorBanner
                message={ERROR_CONFIG.fallbackMessage}
                onRetry={handleRetry}
                onReset={handleReset}
                showReset={consecutiveErrors >= 1}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input area */}
      <footer className="sticky bottom-0 backdrop-blur-xl bg-background/80 border-t border-border/50 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about invoices, customers, or stock..."
            disabled={isLoading}
            className="w-full px-5 py-4 pr-14 rounded-2xl border border-border bg-card shadow-lg shadow-black/5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl size-10 bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <SendIcon className="size-4" />
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-3">
          AI can make mistakes. Verify important information.
        </p>
      </footer>
    </div>
  );
}
