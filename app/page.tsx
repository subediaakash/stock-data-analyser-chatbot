'use client';

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useState } from "react";

type ChatMetadata = {
    totalTokens: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    cachedInputTokens: number | null;
};

type ChatMessage = UIMessage<ChatMetadata>;

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
                                            {part.text}
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
                                Tokens used:{" "}
                                {message.metadata.totalTokens ?? "unknown"}{" "}
                                {message.metadata.inputTokens !== null &&
                                    message.metadata.outputTokens !== null && (
                                        <span>
                                            (input:{" "}
                                            {message.metadata.inputTokens},{" "}
                                            output:{" "}
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