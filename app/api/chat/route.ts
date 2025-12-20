import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
    getAgentGrowth,
    getCityAnalysis,
    getCustomerGrowth,
    getEndUseShare,
    getExcessStockReport,
    getInactiveCustomers,
    getQuarterlyRevenue,
    getRegionGrowth,
    getReplenishmentReport,
    getStockAgingReport,
    getStockByCategory,
    getStockInfo,
    getStockLeadTimeAnalysis,
    getStockSalesAnalysis,
    getStockSummaryKpis,
    getStockTurnRatio,
    getStockValueByDesign,
    getTopProducts,
    getTotalStockValue,
    listStockDistinctValues,
    searchStock,
} from "@/lib/salesAnalysisTools";

import {
    getAgentPerformance,
    getCustomerAmountSummary,
    getFabricPerformanceByEndUse,
    getInvoiceByBillingDocumentAndItem,
    getInvoiceById,
    getInvoiceKpis,
    getInvoicePdfLink,
    getPatternPerformance,
    getRevenueByRegion,
    getTopCustomersByRevenue,
    listAdminDistinctValues,
    listCustomerDistinctValues,
    listCustomerInvoices,
    listMaterialInvoices,
} from "@/lib/invoiceTools";

import {
    getMyInvoiceDetails,
    getMyInvoiceHistory,
    getMyInvoicePdf,
    getMyInvoiceSummary,
    getMyMonthlyPurchaseTrend,
    getMyProfile,
    getMyPurchasesByMaterial,
    getMyRecentInvoices,
} from "@/lib/userTools";

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = await streamText({
        model: openai("gpt-5-nano"),
        system:
            "You are an invoice and stock analytics assistant. Always answer the user in clear, short natural language, " +
            "backed by factual data from the available tools. You can analyze invoices, sales trends, customer behavior, " +
            "and stock/inventory data including stock levels, replenishment needs, excess stock, and stock value by category. " +
            "When you call tools, you must also follow up with a human-readable explanation of the results.\n\n" +
            "IMPORTANT: When users ask about 'my invoices', 'my history', 'my purchases', or anything personal to them, " +
            "use the user-specific tools (getMyProfile, getMyInvoiceHistory, getMyRecentInvoices, getMyInvoiceSummary, " +
            "getMyInvoiceDetails, getMyInvoicePdf, getMyPurchasesByMaterial, getMyMonthlyPurchaseTrend). These tools " +
            "require authentication and will automatically scope queries to the logged-in user's account. If authentication " +
            "fails, inform the user they need to sign in first.",
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
            getInvoicePdfLink: {
                description:
                    "Get the PDF download link for an invoice by its billing document ID. Returns a public S3 URL to download the invoice PDF.",
                inputSchema: z.object({
                    billingDocument: z
                        .string()
                        .min(1)
                        .describe(
                            "The billing document ID/number of the invoice to get the PDF for.",
                        ),
                }),
                async execute({ billingDocument }) {
                    return getInvoicePdfLink({ billingDocument });
                },
            },

            // ========================
            // User Tools (Auth Required) - Scoped to authenticated user's account
            // ========================

            getMyProfile: {
                description:
                    "Get the authenticated user's profile and invoice statistics. Requires authentication. Returns user info and summary stats like total invoices, total spent, first/last invoice dates.",
                inputSchema: z.object({}),
                async execute() {
                    return getMyProfile();
                },
            },
            getMyInvoiceHistory: {
                description:
                    "Get the authenticated user's invoice history with optional date filters. Requires authentication. Only returns invoices belonging to the logged-in user.",
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
                    return getMyInvoiceHistory(input);
                },
            },
            getMyRecentInvoices: {
                description:
                    "Get the authenticated user's most recent invoices. Requires authentication. Quick way to see latest purchases.",
                inputSchema: z.object({
                    limit: z
                        .number()
                        .int()
                        .optional()
                        .describe(
                            "Number of recent invoices to return (defaults to 10, max 50).",
                        ),
                }),
                async execute(input) {
                    return getMyRecentInvoices(input);
                },
            },
            getMyInvoiceSummary: {
                description:
                    "Get a summary of the authenticated user's invoices (totals for net amount, gross amount, discounts, taxes, etc.). Requires authentication.",
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
                    return getMyInvoiceSummary(input);
                },
            },
            getMyInvoiceDetails: {
                description:
                    "Get details of a specific invoice for the authenticated user. Requires authentication. Verifies the invoice belongs to the user before returning details.",
                inputSchema: z.object({
                    billingDocument: z
                        .string()
                        .min(1)
                        .describe(
                            "The billing document ID/number of the invoice.",
                        ),
                    item: z
                        .number()
                        .int()
                        .optional()
                        .describe(
                            "Optional item number to get a specific line item.",
                        ),
                }),
                async execute(input) {
                    return getMyInvoiceDetails(input);
                },
            },
            getMyInvoicePdf: {
                description:
                    "Get the PDF download link for the authenticated user's invoice. Requires authentication. Only returns PDF link if the invoice belongs to the logged-in user.",
                inputSchema: z.object({
                    billingDocument: z
                        .string()
                        .min(1)
                        .describe(
                            "The billing document ID/number of the invoice to get the PDF for.",
                        ),
                }),
                async execute(input) {
                    return getMyInvoicePdf(input);
                },
            },
            getMyPurchasesByMaterial: {
                description:
                    "Get the authenticated user's purchase analysis by material/product. Shows what materials the user has purchased and how much. Requires authentication.",
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
                            "Maximum number of materials to return (defaults to 20, max 100).",
                        ),
                }),
                async execute(input) {
                    return getMyPurchasesByMaterial(input);
                },
            },
            getMyMonthlyPurchaseTrend: {
                description:
                    "Get the authenticated user's monthly purchase trends over time. Shows purchase patterns month by month. Requires authentication.",
                inputSchema: z.object({
                    months: z
                        .number()
                        .int()
                        .optional()
                        .describe(
                            "Number of months to look back (defaults to 12, max 24).",
                        ),
                }),
                async execute(input) {
                    return getMyMonthlyPurchaseTrend(input);
                },
            },

            getQuarterlyRevenue: {
                description:
                    "Get quarterly revenue for regions (e.g. US, UK, EU) for the last N years.",
                inputSchema: z.object({
                    regions: z.array(z.string()).optional().describe(
                        "List of regions to filter by.",
                    ),
                    years: z.number().optional().describe(
                        "Number of years to look back (default 2).",
                    ),
                }),
                async execute(input) {
                    return getQuarterlyRevenue(input);
                },
            },
            getRegionGrowth: {
                description: "Get region growth percentage (year over year).",
                inputSchema: z.object({}),
                async execute() {
                    return getRegionGrowth();
                },
            },
            getCustomerGrowth: {
                description:
                    "Get customer growth percentage and absolute growth (year over year).",
                inputSchema: z.object({
                    limit: z.number().optional().describe(
                        "Limit number of customers returned.",
                    ),
                }),
                async execute(input) {
                    return getCustomerGrowth(input);
                },
            },
            getCityAnalysis: {
                description:
                    "Analyze city performance: top customers, top products, top shades, or average selling rate.",
                inputSchema: z.object({
                    city: z.string().describe("City name to analyze."),
                    type: z.enum([
                        "top_customers",
                        "top_products",
                        "avg_selling_rate",
                        "top_shades",
                    ]).describe("Type of analysis."),
                }),
                async execute(input) {
                    return getCityAnalysis(input);
                },
            },
            getEndUseShare: {
                description:
                    "Get revenue share by end use (e.g. Curtains, Upholstery).",
                inputSchema: z.object({}),
                async execute() {
                    return getEndUseShare();
                },
            },
            getAgentGrowth: {
                description: "Get agent growth in revenue (year over year).",
                inputSchema: z.object({}),
                async execute() {
                    return getAgentGrowth();
                },
            },
            getInactiveCustomers: {
                description:
                    "Get customers who were active but haven't ordered in the last N months.",
                inputSchema: z.object({
                    monthsInactive: z.number().describe(
                        "Months of inactivity.",
                    ),
                }),
                async execute(input) {
                    return getInactiveCustomers(input);
                },
            },
            getStockSalesAnalysis: {
                description:
                    "Analyze stock vs sales: find high sales with zero stock, out of stock items, likely to stock out, or low stock.",
                inputSchema: z.object({
                    type: z.enum([
                        "high_sales_zero_stock",
                        "out_of_stock",
                        "likely_stock_out",
                        "low_stock",
                        "excess_stock",
                    ]).describe("Type of analysis."),
                }),
                async execute(input) {
                    return getStockSalesAnalysis(input);
                },
            },
            getStockInfo: {
                description:
                    "Check stock availability for a SKU or list stock items.",
                inputSchema: z.object({
                    sku: z.string().optional().describe("SKU / Material code."),
                    minQuantity: z.number().optional().describe(
                        "Minimum stock quantity to filter.",
                    ),
                }),
                async execute(input) {
                    return getStockInfo(input);
                },
            },
            getTotalStockValue: {
                description: "Get total value of current stock.",
                inputSchema: z.object({}),
                async execute() {
                    return getTotalStockValue();
                },
            },
            getStockTurnRatio: {
                description:
                    "Calculate stock turn ratio (Total Sales / Current Stock).",
                inputSchema: z.object({}),
                async execute() {
                    return getStockTurnRatio();
                },
            },
            getTopProducts: {
                description: "Get top selling products by revenue.",
                inputSchema: z.object({
                    limit: z.number().optional().describe(
                        "Limit results (default 10).",
                    ),
                }),
                async execute(input) {
                    return getTopProducts(input);
                },
            },

            // ========================
            // Admin Stock Tools
            // ========================

            getStockSummaryKpis: {
                description:
                    "Get high-level stock KPIs: total materials, total quantity, total value, average price, items with/without stock.",
                inputSchema: z.object({}),
                async execute() {
                    return getStockSummaryKpis();
                },
            },
            getStockByCategory: {
                description:
                    "Group stock by category (fabric type, loom type, dyed type, stock type, colour family, end use, or pattern name) with quantity and value totals.",
                inputSchema: z.object({
                    groupBy: z
                        .enum([
                            "fabric_type",
                            "loom_type",
                            "dyed_type",
                            "stock_type",
                            "colour_family",
                            "end_use",
                            "pattern_name",
                        ])
                        .describe("The attribute to group stock by."),
                }),
                async execute(input) {
                    return getStockByCategory(input);
                },
            },
            getReplenishmentReport: {
                description:
                    "Get items that need replenishment within the next N days based on replenishment date.",
                inputSchema: z.object({
                    daysAhead: z
                        .number()
                        .optional()
                        .describe(
                            "Number of days to look ahead for replenishment (default 30).",
                        ),
                }),
                async execute(input) {
                    return getReplenishmentReport(input);
                },
            },
            getStockLeadTimeAnalysis: {
                description:
                    "Analyze stock items by lead time - find items with long or short lead times.",
                inputSchema: z.object({
                    minLeadTimeDays: z
                        .number()
                        .optional()
                        .describe("Minimum lead time in days to filter."),
                    sortOrder: z
                        .enum(["asc", "desc"])
                        .optional()
                        .describe(
                            "Sort order for lead time (default desc - longest first).",
                        ),
                    limit: z
                        .number()
                        .optional()
                        .describe("Limit results (default 20)."),
                }),
                async execute(input) {
                    return getStockLeadTimeAnalysis(input);
                },
            },
            searchStock: {
                description:
                    "Advanced stock search with multiple filters: material, colour, pattern, fabric type, price range, stock range, etc.",
                inputSchema: z.object({
                    material: z
                        .string()
                        .optional()
                        .describe("Material code or partial match."),
                    colourFamily: z
                        .string()
                        .optional()
                        .describe("Colour family to filter by."),
                    patternName: z
                        .string()
                        .optional()
                        .describe("Pattern name to filter by."),
                    fabricType: z
                        .string()
                        .optional()
                        .describe("Fabric type to filter by."),
                    loomType: z
                        .string()
                        .optional()
                        .describe("Loom type to filter by."),
                    dyedType: z
                        .string()
                        .optional()
                        .describe("Dyed type to filter by."),
                    endUse: z
                        .string()
                        .optional()
                        .describe("End use category to filter by."),
                    design: z
                        .string()
                        .optional()
                        .describe("Ainocular design to filter by."),
                    minStock: z
                        .number()
                        .optional()
                        .describe("Minimum stock quantity."),
                    maxStock: z
                        .number()
                        .optional()
                        .describe("Maximum stock quantity."),
                    minPrice: z
                        .number()
                        .optional()
                        .describe("Minimum basic price."),
                    maxPrice: z
                        .number()
                        .optional()
                        .describe("Maximum basic price."),
                    limit: z
                        .number()
                        .optional()
                        .describe("Limit results (default 50)."),
                }),
                async execute(input) {
                    return searchStock(input);
                },
            },
            listStockDistinctValues: {
                description:
                    "List all distinct values for stock attributes (fabric types, loom types, colours, patterns, etc.) to help discover valid filter values.",
                inputSchema: z.object({}),
                async execute() {
                    return listStockDistinctValues();
                },
            },
            getStockValueByDesign: {
                description:
                    "Get stock value breakdown by Ainocular design, shade, or colour master.",
                inputSchema: z.object({
                    groupBy: z
                        .enum(["design", "shade", "colour_master"])
                        .optional()
                        .describe(
                            "Group by design, shade, or colour_master (default design).",
                        ),
                    limit: z
                        .number()
                        .optional()
                        .describe("Limit results (default 20)."),
                }),
                async execute(input) {
                    return getStockValueByDesign(input);
                },
            },
            getStockAgingReport: {
                description:
                    "Get stock aging report showing items sorted by days until replenishment (urgency).",
                inputSchema: z.object({
                    limit: z
                        .number()
                        .optional()
                        .describe("Limit results (default 30)."),
                }),
                async execute(input) {
                    return getStockAgingReport(input);
                },
            },
            getExcessStockReport: {
                description:
                    "Find excess stock items with high inventory but low sales velocity - items that may be overstocked.",
                inputSchema: z.object({
                    coverageMonthsThreshold: z
                        .number()
                        .optional()
                        .describe(
                            "Items with stock covering more than N months are flagged as excess (default 6).",
                        ),
                    limit: z
                        .number()
                        .optional()
                        .describe("Limit results (default 20)."),
                }),
                async execute(input) {
                    return getExcessStockReport(input);
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
