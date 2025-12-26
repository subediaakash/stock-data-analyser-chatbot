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

import * as schemas from "./schemas";

// ========================
// Invoice Tools
// ========================

const invoiceTools = {
    getInvoiceById: {
        description: "Fetch a single invoice by its numeric primary key ID.",
        inputSchema: schemas.getInvoiceByIdSchema,
        execute: async ({ id }: z.infer<typeof schemas.getInvoiceByIdSchema>) =>
            getInvoiceById(id),
    },

    getInvoiceByBillingDocumentAndItem: {
        description:
            "Fetch one invoice line using the billing document number and item number.",
        inputSchema: schemas.getInvoiceByBillingDocumentAndItemSchema,
        execute: async (
            input: z.infer<
                typeof schemas.getInvoiceByBillingDocumentAndItemSchema
            >,
        ) => getInvoiceByBillingDocumentAndItem(input),
    },

    listCustomerInvoices: {
        description:
            "List invoices for a specific customer and optional date range, newest first.",
        inputSchema: schemas.listCustomerInvoicesSchema,
        execute: async (
            input: z.infer<typeof schemas.listCustomerInvoicesSchema>,
        ) => listCustomerInvoices(input),
    },

    listMaterialInvoices: {
        description:
            "List invoices for a given material or Ainocular design/shade, with optional region and date filters.",
        inputSchema: schemas.listMaterialInvoicesSchema,
        execute: async (
            input: z.infer<typeof schemas.listMaterialInvoicesSchema>,
        ) => listMaterialInvoices(input),
    },

    getCustomerAmountSummary: {
        description:
            "Summarize invoice amounts for a customer over an optional date range (net, gross, tax, discount, counts).",
        inputSchema: schemas.customerAmountSummarySchema,
        execute: async (
            input: z.infer<typeof schemas.customerAmountSummarySchema>,
        ) => getCustomerAmountSummary(input),
    },

    getInvoiceKpis: {
        description:
            "High-level KPI summary across all invoices in an optional date range (totals, averages).",
        inputSchema: schemas.invoiceKpisSchema,
        execute: async (input: z.infer<typeof schemas.invoiceKpisSchema>) =>
            getInvoiceKpis(input),
    },

    getTopCustomersByRevenue: {
        description:
            "Find top customers by revenue (net and gross amount) in an optional date range.",
        inputSchema: schemas.topCustomersByRevenueSchema,
        execute: async (
            input: z.infer<typeof schemas.topCustomersByRevenueSchema>,
        ) => getTopCustomersByRevenue(input),
    },

    getRevenueByRegion: {
        description:
            "Aggregate revenue and invoice counts per region/zone in an optional date range.",
        inputSchema: schemas.revenueByRegionSchema,
        execute: async (input: z.infer<typeof schemas.revenueByRegionSchema>) =>
            getRevenueByRegion(input),
    },

    getAgentPerformance: {
        description:
            "Compute sales performance metrics per agent (revenue and invoice count) for an optional date range.",
        inputSchema: schemas.agentPerformanceSchema,
        execute: async (
            input: z.infer<typeof schemas.agentPerformanceSchema>,
        ) => getAgentPerformance(input),
    },

    getFabricPerformanceByEndUse: {
        description:
            "Aggregate revenue and counts per fabric type / style / end use in an optional date range.",
        inputSchema: schemas.fabricPerformanceSchema,
        execute: async (
            input: z.infer<typeof schemas.fabricPerformanceSchema>,
        ) => getFabricPerformanceByEndUse(input),
    },

    getPatternPerformance: {
        description:
            "Aggregate revenue and counts per Ainocular design/shade and pattern in an optional date range.",
        inputSchema: schemas.patternPerformanceSchema,
        execute: async (
            input: z.infer<typeof schemas.patternPerformanceSchema>,
        ) => getPatternPerformance(input),
    },

    listCustomerDistinctValues: {
        description:
            "List distinct bill-to customers (code + name) and bill-to cities to help the model choose valid values.",
        inputSchema: schemas.emptySchema,
        execute: async () => listCustomerDistinctValues(),
    },

    listAdminDistinctValues: {
        description:
            "List distinct regions, agents, end uses, and Ainocular designs to help the model choose valid filters.",
        inputSchema: schemas.emptySchema,
        execute: async () => listAdminDistinctValues(),
    },

    getInvoicePdfLink: {
        description:
            "Get the PDF download link for an invoice by its billing document ID. Returns a public S3 URL to download the invoice PDF.",
        inputSchema: schemas.invoicePdfLinkSchema,
        execute: async ({
            billingDocument,
        }: z.infer<typeof schemas.invoicePdfLinkSchema>) =>
            getInvoicePdfLink({ billingDocument }),
    },
};

// ========================
// User Tools (Auth Required)
// ========================

const userTools = {
    getMyProfile: {
        description:
            "Get the authenticated user's profile and invoice statistics. Requires authentication. Returns user info and summary stats like total invoices, total spent, first/last invoice dates.",
        inputSchema: schemas.emptySchema,
        execute: async () => getMyProfile(),
    },

    getMyInvoiceHistory: {
        description:
            "Get the authenticated user's invoice history with optional date filters. Requires authentication. Only returns invoices belonging to the logged-in user.",
        inputSchema: schemas.myInvoiceHistorySchema,
        execute: async (
            input: z.infer<typeof schemas.myInvoiceHistorySchema>,
        ) => getMyInvoiceHistory(input),
    },

    getMyRecentInvoices: {
        description:
            "Get the authenticated user's most recent invoices. Requires authentication. Quick way to see latest purchases.",
        inputSchema: schemas.myRecentInvoicesSchema,
        execute: async (
            input: z.infer<typeof schemas.myRecentInvoicesSchema>,
        ) => getMyRecentInvoices(input),
    },

    getMyInvoiceSummary: {
        description:
            "Get a summary of the authenticated user's invoices (totals for net amount, gross amount, discounts, taxes, etc.). Requires authentication.",
        inputSchema: schemas.myInvoiceSummarySchema,
        execute: async (
            input: z.infer<typeof schemas.myInvoiceSummarySchema>,
        ) => getMyInvoiceSummary(input),
    },

    getMyInvoiceDetails: {
        description:
            "Get details of a specific invoice for the authenticated user. Requires authentication. Verifies the invoice belongs to the user before returning details.",
        inputSchema: schemas.myInvoiceDetailsSchema,
        execute: async (
            input: z.infer<typeof schemas.myInvoiceDetailsSchema>,
        ) => getMyInvoiceDetails(input),
    },

    getMyInvoicePdf: {
        description:
            "Get the PDF download link for the authenticated user's invoice. Requires authentication. Only returns PDF link if the invoice belongs to the logged-in user.",
        inputSchema: schemas.myInvoicePdfSchema,
        execute: async (input: z.infer<typeof schemas.myInvoicePdfSchema>) =>
            getMyInvoicePdf(input),
    },

    getMyPurchasesByMaterial: {
        description:
            "Get the authenticated user's purchase analysis by material/product. Shows what materials the user has purchased and how much. Requires authentication.",
        inputSchema: schemas.myPurchasesByMaterialSchema,
        execute: async (
            input: z.infer<typeof schemas.myPurchasesByMaterialSchema>,
        ) => getMyPurchasesByMaterial(input),
    },

    getMyMonthlyPurchaseTrend: {
        description:
            "Get the authenticated user's monthly purchase trends over time. Shows purchase patterns month by month. Requires authentication.",
        inputSchema: schemas.myMonthlyPurchaseTrendSchema,
        execute: async (
            input: z.infer<typeof schemas.myMonthlyPurchaseTrendSchema>,
        ) => getMyMonthlyPurchaseTrend(input),
    },
};

// ========================
// Sales Analysis Tools
// ========================

const salesAnalysisTools = {
    getQuarterlyRevenue: {
        description:
            "Get quarterly revenue for regions (e.g. US, UK, EU) for the last N years.",
        inputSchema: schemas.quarterlyRevenueSchema,
        execute: async (
            input: z.infer<typeof schemas.quarterlyRevenueSchema>,
        ) => getQuarterlyRevenue(input),
    },

    getRegionGrowth: {
        description: "Get region growth percentage (year over year).",
        inputSchema: schemas.emptySchema,
        execute: async () => getRegionGrowth(),
    },

    getCustomerGrowth: {
        description:
            "Get customer growth percentage and absolute growth (year over year).",
        inputSchema: schemas.customerGrowthSchema,
        execute: async (input: z.infer<typeof schemas.customerGrowthSchema>) =>
            getCustomerGrowth(input),
    },

    getCityAnalysis: {
        description:
            "Analyze city performance: top customers, top products, top shades, or average selling rate.",
        inputSchema: schemas.cityAnalysisSchema,
        execute: async (input: z.infer<typeof schemas.cityAnalysisSchema>) =>
            getCityAnalysis(input),
    },

    getEndUseShare: {
        description:
            "Get revenue share by end use (e.g. Curtains, Upholstery).",
        inputSchema: schemas.emptySchema,
        execute: async () => getEndUseShare(),
    },

    getAgentGrowth: {
        description: "Get agent growth in revenue (year over year).",
        inputSchema: schemas.emptySchema,
        execute: async () => getAgentGrowth(),
    },

    getInactiveCustomers: {
        description:
            "Get customers who were active but haven't ordered in the last N months.",
        inputSchema: schemas.inactiveCustomersSchema,
        execute: async (
            input: z.infer<typeof schemas.inactiveCustomersSchema>,
        ) => getInactiveCustomers(input),
    },

    getStockSalesAnalysis: {
        description:
            "Analyze stock vs sales: find high sales with zero stock, out of stock items, likely to stock out, or low stock.",
        inputSchema: schemas.stockSalesAnalysisSchema,
        execute: async (
            input: z.infer<typeof schemas.stockSalesAnalysisSchema>,
        ) => getStockSalesAnalysis(input),
    },

    getStockInfo: {
        description: "Check stock availability for a SKU or list stock items.",
        inputSchema: schemas.stockInfoSchema,
        execute: async (input: z.infer<typeof schemas.stockInfoSchema>) =>
            getStockInfo(input),
    },

    getTotalStockValue: {
        description: "Get total value of current stock.",
        inputSchema: schemas.emptySchema,
        execute: async () => getTotalStockValue(),
    },

    getStockTurnRatio: {
        description:
            "Calculate stock turn ratio (Total Sales / Current Stock).",
        inputSchema: schemas.emptySchema,
        execute: async () => getStockTurnRatio(),
    },

    getTopProducts: {
        description: "Get top selling products by revenue.",
        inputSchema: schemas.topProductsSchema,
        execute: async (input: z.infer<typeof schemas.topProductsSchema>) =>
            getTopProducts(input),
    },
};

// ========================
// Admin Stock Tools
// ========================

const stockTools = {
    getStockSummaryKpis: {
        description:
            "Get high-level stock KPIs: total materials, total quantity, total value, average price, items with/without stock.",
        inputSchema: schemas.emptySchema,
        execute: async () => getStockSummaryKpis(),
    },

    getStockByCategory: {
        description:
            "Group stock by category (fabric type, loom type, dyed type, stock type, colour family, end use, or pattern name) with quantity and value totals.",
        inputSchema: schemas.stockByCategorySchema,
        execute: async (input: z.infer<typeof schemas.stockByCategorySchema>) =>
            getStockByCategory(input),
    },

    getReplenishmentReport: {
        description:
            "Get items that need replenishment within the next N days based on replenishment date.",
        inputSchema: schemas.replenishmentReportSchema,
        execute: async (
            input: z.infer<typeof schemas.replenishmentReportSchema>,
        ) => getReplenishmentReport(input),
    },

    getStockLeadTimeAnalysis: {
        description:
            "Analyze stock items by lead time - find items with long or short lead times.",
        inputSchema: schemas.stockLeadTimeAnalysisSchema,
        execute: async (
            input: z.infer<typeof schemas.stockLeadTimeAnalysisSchema>,
        ) => getStockLeadTimeAnalysis(input),
    },

    searchStock: {
        description:
            "Advanced stock search with multiple filters: material, colour, pattern, fabric type, price range, stock range, etc.",
        inputSchema: schemas.searchStockSchema,
        execute: async (input: z.infer<typeof schemas.searchStockSchema>) =>
            searchStock(input),
    },

    listStockDistinctValues: {
        description:
            "List all distinct values for stock attributes (fabric types, loom types, colours, patterns, etc.) to help discover valid filter values.",
        inputSchema: schemas.emptySchema,
        execute: async () => listStockDistinctValues(),
    },

    getStockValueByDesign: {
        description:
            "Get stock value breakdown by Ainocular design, shade, or colour master.",
        inputSchema: schemas.stockValueByDesignSchema,
        execute: async (
            input: z.infer<typeof schemas.stockValueByDesignSchema>,
        ) => getStockValueByDesign(input),
    },

    getStockAgingReport: {
        description:
            "Get stock aging report showing items sorted by days until replenishment (urgency).",
        inputSchema: schemas.stockAgingReportSchema,
        execute: async (
            input: z.infer<typeof schemas.stockAgingReportSchema>,
        ) => getStockAgingReport(input),
    },

    getExcessStockReport: {
        description:
            "Find excess stock items with high inventory but low sales velocity - items that may be overstocked.",
        inputSchema: schemas.excessStockReportSchema,
        execute: async (
            input: z.infer<typeof schemas.excessStockReportSchema>,
        ) => getExcessStockReport(input),
    },
};

// ========================
// Export All Tools
// ========================

export const chatTools = {
    ...invoiceTools,
    ...userTools,
    ...salesAnalysisTools,
    ...stockTools,
};

export type ChatToolName = keyof typeof chatTools;
