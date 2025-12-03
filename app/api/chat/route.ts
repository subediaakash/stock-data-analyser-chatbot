import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
    getAgentPerformance,
    getCustomerAmountSummary,
    getFabricPerformanceByEndUse,
    getInvoiceByBillingDocumentAndItem,
    getInvoiceById,
    getInvoiceKpis,
    getPatternPerformance,
    getRevenueByRegion,
    getTopCustomersByRevenue,
    listAdminDistinctValues,
    listCustomerDistinctValues,
    listCustomerInvoices,
    listMaterialInvoices,
} from "@/lib/invoiceTools";

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = await streamText({
        model: openai("gpt-5-nano"),
        system:
            "You are an invoice analytics assistant. Always answer the user in clear, short natural language, " +
            "backed by factual data from the invoice tools. When you call tools, you must also follow up " +
            "with a human-readable explanation of the results.",
        messages: convertToModelMessages(messages),
        // Allow multiple LLM steps so the model can call tools and then answer.
        stopWhen: stepCountIs(7),
        tools: {
            getInvoiceById: {
                description:
                    "Fetch a single invoice by its numeric primary key ID.",
                inputSchema: z.object({
                    id: z
                        .number()
                        .int()
                        .describe("The numeric primary key ID of the invoice."),
                }),
                async execute({ id }) {
                    return getInvoiceById(id);
                },
            },
            getInvoiceByBillingDocumentAndItem: {
                description:
                    "Fetch one invoice line using the billing document number and item number.",
                inputSchema: z.object({
                    billingDocument: z
                        .string()
                        .min(1)
                        .describe(
                            "Billing document number, e.g. the invoice number shown to the customer.",
                        ),
                    item: z
                        .number()
                        .int()
                        .describe(
                            "Item number within the billing document (line item).",
                        ),
                }),
                async execute({ billingDocument, item }) {
                    return getInvoiceByBillingDocumentAndItem({
                        billingDocument,
                        item,
                    });
                },
            },
            listCustomerInvoices: {
                description:
                    "List invoices for a specific customer and optional date range, newest first.",
                inputSchema: z.object({
                    billToPartyCode: z
                        .string()
                        .optional()
                        .describe(
                            "Customer code / bill-to party code. Use this when available for precise lookup.",
                        ),
                    billToParty: z
                        .string()
                        .optional()
                        .describe(
                            "Customer name / bill-to party name. Use when code is not known.",
                        ),
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    limit: z
                        .number()
                        .int()
                        .optional()
                        .describe(
                            "Maximum number of invoices to return (defaults to 50, max 200).",
                        ),
                    offset: z
                        .number()
                        .int()
                        .optional()
                        .describe(
                            "Number of invoices to skip for pagination (defaults to 0).",
                        ),
                }),
                async execute(input) {
                    return listCustomerInvoices(input);
                },
            },
            listMaterialInvoices: {
                description:
                    "List invoices for a given material or Ainocular design/shade, with optional region and date filters.",
                inputSchema: z.object({
                    material: z
                        .string()
                        .optional()
                        .describe("Material code to filter by."),
                    ainocularDesign: z
                        .string()
                        .optional()
                        .describe("Ainocular design to filter by."),
                    ainocularShade: z
                        .string()
                        .optional()
                        .describe("Ainocular shade to filter by."),
                    regionZone: z
                        .string()
                        .optional()
                        .describe("Region zone to filter by."),
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    limit: z
                        .number()
                        .int()
                        .optional()
                        .describe(
                            "Maximum number of invoices to return (defaults to 50, max 200).",
                        ),
                    offset: z
                        .number()
                        .int()
                        .optional()
                        .describe(
                            "Number of invoices to skip for pagination (defaults to 0).",
                        ),
                }),
                async execute(input) {
                    return listMaterialInvoices(input);
                },
            },
            getCustomerAmountSummary: {
                description:
                    "Summarize invoice amounts for a customer over an optional date range (net, gross, tax, discount, counts).",
                inputSchema: z.object({
                    billToPartyCode: z
                        .string()
                        .optional()
                        .describe("Bill-to party code of the customer."),
                    billToParty: z
                        .string()
                        .optional()
                        .describe("Bill-to party name of the customer."),
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                }),
                async execute(input) {
                    return getCustomerAmountSummary(input);
                },
            },
            getInvoiceKpis: {
                description:
                    "High-level KPI summary across all invoices in an optional date range (totals, averages).",
                inputSchema: z.object({
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                }),
                async execute(input) {
                    return getInvoiceKpis(input);
                },
            },
            getTopCustomersByRevenue: {
                description:
                    "Find top customers by revenue (net and gross amount) in an optional date range.",
                inputSchema: z.object({
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    limit: z
                        .number()
                        .int()
                        .optional()
                        .describe(
                            "Maximum number of customers to return (defaults to 20, max 100).",
                        ),
                }),
                async execute(input) {
                    return getTopCustomersByRevenue(input);
                },
            },
            getRevenueByRegion: {
                description:
                    "Aggregate revenue and invoice counts per region/zone in an optional date range.",
                inputSchema: z.object({
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                }),
                async execute(input) {
                    return getRevenueByRegion(input);
                },
            },
            getAgentPerformance: {
                description:
                    "Compute sales performance metrics per agent (revenue and invoice count) for an optional date range.",
                inputSchema: z.object({
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                }),
                async execute(input) {
                    return getAgentPerformance(input);
                },
            },
            getFabricPerformanceByEndUse: {
                description:
                    "Aggregate revenue and counts per fabric type / style / end use in an optional date range.",
                inputSchema: z.object({
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                }),
                async execute(input) {
                    return getFabricPerformanceByEndUse(input);
                },
            },
            getPatternPerformance: {
                description:
                    "Aggregate revenue and counts per Ainocular design/shade and pattern in an optional date range.",
                inputSchema: z.object({
                    fromDate: z
                        .string()
                        .optional()
                        .describe(
                            "Start of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                    toDate: z
                        .string()
                        .optional()
                        .describe(
                            "End of invoice date range (YYYY-MM-DD). Optional.",
                        ),
                }),
                async execute(input) {
                    return getPatternPerformance(input);
                },
            },
            listCustomerDistinctValues: {
                description:
                    "List distinct bill-to customers (code + name) and bill-to cities to help the model choose valid values.",
                inputSchema: z.object({}),
                async execute() {
                    return listCustomerDistinctValues();
                },
            },
            listAdminDistinctValues: {
                description:
                    "List distinct regions, agents, end uses, and Ainocular designs to help the model choose valid filters.",
                inputSchema: z.object({}),
                async execute() {
                    return listAdminDistinctValues();
                },
            },
        },
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
}
