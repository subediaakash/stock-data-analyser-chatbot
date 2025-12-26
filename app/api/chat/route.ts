import { NextResponse } from "next/server";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { chatTools, SYSTEM_PROMPT } from "@/lib/chat";

// ========================
// Request Validation
// ========================

const chatRequestSchema = z.object({
    messages: z.array(z.any()).min(1, "Messages array cannot be empty"),
});

// ========================
// Configuration
// ========================

const CONFIG = {
    model: "gpt-5-nano",
    maxSteps: 7,
} as const;

// ========================
// Route Handler
// ========================

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate request body
        const parseResult = chatRequestSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid request",
                    details: parseResult.error.flatten(),
                },
                { status: 400 },
            );
        }

        const { messages }: { messages: UIMessage[] } = parseResult.data;

        const result = await streamText({
            model: openai(CONFIG.model),
            system: SYSTEM_PROMPT,
            messages: convertToModelMessages(messages),
            stopWhen: stepCountIs(CONFIG.maxSteps),
            tools: chatTools,
        });

        return result.toUIMessageStreamResponse({
            originalMessages: messages,
            messageMetadata: ({ part }) => {
                if (part.type !== "finish") return undefined;

                const usage = part.totalUsage;
                return {
                    totalTokens: usage.totalTokens ?? null,
                    inputTokens: usage.inputTokens ?? null,
                    outputTokens: usage.outputTokens ?? null,
                    reasoningTokens: usage.reasoningTokens ?? null,
                    cachedInputTokens: usage.cachedInputTokens ?? null,
                };
            },
        });
    } catch (error) {
        console.error("[Chat API Error]:", error);

        // Handle JSON parse errors
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 },
            );
        }

        // Handle other errors
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
