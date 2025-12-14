"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ChatMetadata = {
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  cachedInputTokens: number | null;
};

type ChatMessage = UIMessage<ChatMetadata>;

// Component to render text with PDF download buttons
function TextWithPdfButtons({ text }: { text: string }) {
  // Create regex inside function to avoid React linting issues
  const pdfUrlRegex =
    /(https:\/\/ainoc-chatbot-files-bucket\.s3\.us-east-2\.amazonaws\.com\/([^.\s]+)\.pdf)/g;

  const parts: (string | { type: "pdf"; url: string; documentId: string })[] =
    [];
  let lastIndex = 0;
  let match;

  while ((match = pdfUrlRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the PDF button data
    parts.push({
      type: "pdf",
      url: match[1],
      documentId: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no PDF URLs found, just return the text
  if (parts.length === 1 && typeof parts[0] === "string") {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === "string") {
          return <span key={index}>{part}</span>;
        }
        return (
          <Button
            key={index}
            variant="default"
            size="sm"
            className="mx-1 my-1 inline-flex"
            asChild
          >
            <a
              href={part.url}
              download={`invoice-${part.documentId}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadIcon className="size-4 mr-1" />
              Download Invoice {part.documentId}
            </a>
          </Button>
        );
      })}
    </>
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

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat<ChatMessage>();

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((message) => (
        <div key={message.id} className="mb-4 whitespace-pre-wrap">
          <div>
            {message.role === "user" ? "User: " : "AI: "}
            {message.parts.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <div key={`${message.id}-${i}`}>
                      <TextWithPdfButtons text={part.text} />
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>

          {message.role === "assistant" &&
            message.metadata &&
            message.metadata.totalTokens !== null && (
              <div className="mt-1 text-xs text-zinc-500">
                Tokens used: {message.metadata.totalTokens ?? "unknown"}{" "}
                {message.metadata.inputTokens !== null &&
                  message.metadata.outputTokens !== null && (
                    <span>
                      (input: {message.metadata.inputTokens}, output:{" "}
                      {message.metadata.outputTokens})
                    </span>
                  )}
              </div>
            )}
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
          value={input}
          placeholder="Ask about your invoices, customers, regions..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
