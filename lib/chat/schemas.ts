import { z } from "zod";

// ========================
// Reusable Schema Fragments
// ========================

export const dateRangeSchema = {
    fromDate: z
        .string()
        .optional()
        .describe("Start of invoice date range (YYYY-MM-DD). Optional."),
    toDate: z
        .string()
        .optional()
        .describe("End of invoice date range (YYYY-MM-DD). Optional."),
};

export const paginationSchema = {
    limit: z
        .number()
        .int()
        .optional()
        .describe("Maximum number of results to return."),
    offset: z
        .number()
        .int()
        .optional()
        .describe("Number of results to skip for pagination."),
};

export const billingDocumentSchema = {
    billingDocument: z
        .string()
        .min(1)
        .describe("The billing document ID/number of the invoice."),
};

// ========================
// Invoice Tool Schemas
// ========================

export const getInvoiceByIdSchema = z.object({
    id: z.number().int().describe("The numeric primary key ID of the invoice."),
});

export const getInvoiceByBillingDocumentAndItemSchema = z.object({
    billingDocument: z
        .string()
        .min(1)
        .describe(
            "Billing document number, e.g. the invoice number shown to the customer.",
        ),
    item: z
        .number()
        .int()
        .describe("Item number within the billing document (line item)."),
});

export const listCustomerInvoicesSchema = z.object({
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
    ...dateRangeSchema,
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
        .describe("Number of invoices to skip for pagination (defaults to 0)."),
});

export const listMaterialInvoicesSchema = z.object({
    material: z.string().optional().describe("Material code to filter by."),
    ainocularDesign: z.string().optional().describe(
        "Ainocular design to filter by.",
    ),
    ainocularShade: z.string().optional().describe(
        "Ainocular shade to filter by.",
    ),
    regionZone: z.string().optional().describe("Region zone to filter by."),
    ...dateRangeSchema,
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
        .describe("Number of invoices to skip for pagination (defaults to 0)."),
});

export const customerAmountSummarySchema = z.object({
    billToPartyCode: z.string().optional().describe(
        "Bill-to party code of the customer.",
    ),
    billToParty: z.string().optional().describe(
        "Bill-to party name of the customer.",
    ),
    ...dateRangeSchema,
});

export const invoiceKpisSchema = z.object({
    ...dateRangeSchema,
});

export const topCustomersByRevenueSchema = z.object({
    ...dateRangeSchema,
    limit: z
        .number()
        .int()
        .optional()
        .describe(
            "Maximum number of customers to return (defaults to 20, max 100).",
        ),
});

export const revenueByRegionSchema = z.object({
    ...dateRangeSchema,
});

export const agentPerformanceSchema = z.object({
    ...dateRangeSchema,
});

export const fabricPerformanceSchema = z.object({
    ...dateRangeSchema,
});

export const patternPerformanceSchema = z.object({
    ...dateRangeSchema,
});

export const invoicePdfLinkSchema = z.object({
    ...billingDocumentSchema,
});

// ========================
// User Tool Schemas
// ========================

export const myInvoiceHistorySchema = z.object({
    ...dateRangeSchema,
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
        .describe("Number of invoices to skip for pagination (defaults to 0)."),
});

export const myRecentInvoicesSchema = z.object({
    limit: z
        .number()
        .int()
        .optional()
        .describe(
            "Number of recent invoices to return (defaults to 10, max 50).",
        ),
});

export const myInvoiceSummarySchema = z.object({
    ...dateRangeSchema,
});

export const myInvoiceDetailsSchema = z.object({
    ...billingDocumentSchema,
    item: z.number().int().optional().describe(
        "Optional item number to get a specific line item.",
    ),
});

export const myInvoicePdfSchema = z.object({
    ...billingDocumentSchema,
});

export const myPurchasesByMaterialSchema = z.object({
    ...dateRangeSchema,
    limit: z
        .number()
        .int()
        .optional()
        .describe(
            "Maximum number of materials to return (defaults to 20, max 100).",
        ),
});

export const myMonthlyPurchaseTrendSchema = z.object({
    months: z
        .number()
        .int()
        .optional()
        .describe("Number of months to look back (defaults to 12, max 24)."),
});

// ========================
// Sales Analysis Schemas
// ========================

export const quarterlyRevenueSchema = z.object({
    regions: z.array(z.string()).optional().describe(
        "List of regions to filter by.",
    ),
    years: z.number().optional().describe(
        "Number of years to look back (default 2).",
    ),
});

export const customerGrowthSchema = z.object({
    limit: z.number().optional().describe(
        "Limit number of customers returned.",
    ),
});

export const cityAnalysisSchema = z.object({
    city: z.string().describe("City name to analyze."),
    type: z
        .enum([
            "top_customers",
            "top_products",
            "avg_selling_rate",
            "top_shades",
        ])
        .describe("Type of analysis."),
});

export const inactiveCustomersSchema = z.object({
    monthsInactive: z.number().describe("Months of inactivity."),
});

export const stockSalesAnalysisSchema = z.object({
    type: z
        .enum([
            "high_sales_zero_stock",
            "out_of_stock",
            "likely_stock_out",
            "low_stock",
            "excess_stock",
        ])
        .describe("Type of analysis."),
});

export const stockInfoSchema = z.object({
    sku: z.string().optional().describe("SKU / Material code."),
    minQuantity: z.number().optional().describe(
        "Minimum stock quantity to filter.",
    ),
});

export const topProductsSchema = z.object({
    limit: z.number().optional().describe("Limit results (default 10)."),
});

// ========================
// Stock Tool Schemas
// ========================

export const stockByCategorySchema = z.object({
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
});

export const replenishmentReportSchema = z.object({
    daysAhead: z
        .number()
        .optional()
        .describe(
            "Number of days to look ahead for replenishment (default 30).",
        ),
});

export const stockLeadTimeAnalysisSchema = z.object({
    minLeadTimeDays: z.number().optional().describe(
        "Minimum lead time in days to filter.",
    ),
    sortOrder: z
        .enum(["asc", "desc"])
        .optional()
        .describe("Sort order for lead time (default desc - longest first)."),
    limit: z.number().optional().describe("Limit results (default 20)."),
});

export const searchStockSchema = z.object({
    material: z.string().optional().describe("Material code or partial match."),
    colourFamily: z.string().optional().describe("Colour family to filter by."),
    patternName: z.string().optional().describe("Pattern name to filter by."),
    fabricType: z.string().optional().describe("Fabric type to filter by."),
    loomType: z.string().optional().describe("Loom type to filter by."),
    dyedType: z.string().optional().describe("Dyed type to filter by."),
    endUse: z.string().optional().describe("End use category to filter by."),
    design: z.string().optional().describe("Ainocular design to filter by."),
    minStock: z.number().optional().describe("Minimum stock quantity."),
    maxStock: z.number().optional().describe("Maximum stock quantity."),
    minPrice: z.number().optional().describe("Minimum basic price."),
    maxPrice: z.number().optional().describe("Maximum basic price."),
    limit: z.number().optional().describe("Limit results (default 50)."),
});

export const stockValueByDesignSchema = z.object({
    groupBy: z
        .enum(["design", "shade", "colour_master"])
        .optional()
        .describe("Group by design, shade, or colour_master (default design)."),
    limit: z.number().optional().describe("Limit results (default 20)."),
});

export const stockAgingReportSchema = z.object({
    limit: z.number().optional().describe("Limit results (default 30)."),
});

export const excessStockReportSchema = z.object({
    coverageMonthsThreshold: z
        .number()
        .optional()
        .describe(
            "Items with stock covering more than N months are flagged as excess (default 6).",
        ),
    limit: z.number().optional().describe("Limit results (default 20)."),
});

// Empty schema for tools with no parameters
export const emptySchema = z.object({});
