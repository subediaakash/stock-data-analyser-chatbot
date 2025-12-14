import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { invoice } from "@/drizzle/schema/invoice-schema";

// S3 bucket base URL for invoice PDFs
const INVOICE_PDF_BUCKET_URL =
    "https://ainoc-chatbot-files-bucket.s3.us-east-2.amazonaws.com";

type DateInput = string | Date;

// `invoiceDate` is stored as a DATE column which Drizzle maps to `string`.
// We normalize all inputs to a simple `YYYY-MM-DD` string so comparisons are type-safe.
function normalizeDate(
    value: DateInput | null | undefined,
): string | undefined {
    if (!value) return undefined;

    const asDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(asDate.getTime())) return undefined;

    // Convert to date-only ISO (no time) to match typical DATE semantics.
    return asDate.toISOString().slice(0, 10);
}

type Pagination = {
    limit?: number;
    offset?: number;
};

function getSafePagination(pagination?: Pagination) {
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 200;

    const limit = pagination?.limit && pagination.limit > 0
        ? Math.min(pagination.limit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const offset = pagination?.offset && pagination.offset > 0
        ? pagination.offset
        : 0;

    return { limit, offset };
}

// =========
// User tools
// =========

export async function getInvoiceById(id: number) {
    const rows = await db
        .select()
        .from(invoice)
        .where(eq(invoice.id, id))
        .limit(1);

    return rows[0] ?? null;
}

export async function getInvoiceByBillingDocumentAndItem(params: {
    billingDocument: string;
    item: number;
}) {
    const rows = await db
        .select()
        .from(invoice)
        .where(and(
            eq(invoice.billingDocument, params.billingDocument),
            eq(invoice.item, params.item),
        ))
        .limit(1);

    return rows[0] ?? null;
}

export async function listCustomerInvoices(
    params: {
        billToPartyCode?: string;
        billToParty?: string;
        fromDate?: DateInput | null;
        toDate?: DateInput | null;
    } & Pagination,
) {
    const { limit, offset } = getSafePagination(params);
    const filters = [];

    if (params.billToPartyCode) {
        filters.push(eq(invoice.billToPartyCode, params.billToPartyCode));
    }

    if (params.billToParty) {
        filters.push(eq(invoice.billToParty, params.billToParty));
    }

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const rows = await db
        .select()
        .from(invoice)
        .where(where)
        .orderBy(desc(invoice.invoiceDate))
        .limit(limit)
        .offset(offset);

    return rows;
}

export async function listMaterialInvoices(
    params: {
        material?: string;
        ainocularDesign?: string;
        ainocularShade?: string;
        regionZone?: string;
        fromDate?: DateInput | null;
        toDate?: DateInput | null;
    } & Pagination,
) {
    const { limit, offset } = getSafePagination(params);
    const filters = [];

    if (params.material) {
        filters.push(eq(invoice.material, params.material));
    }

    if (params.ainocularDesign) {
        filters.push(eq(invoice.ainocularDesign, params.ainocularDesign));
    }

    if (params.ainocularShade) {
        filters.push(eq(invoice.ainocularShade, params.ainocularShade));
    }

    if (params.regionZone) {
        filters.push(eq(invoice.regionZone, params.regionZone));
    }

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const rows = await db
        .select()
        .from(invoice)
        .where(where)
        .orderBy(desc(invoice.invoiceDate))
        .limit(limit)
        .offset(offset);

    return rows;
}

export async function getCustomerAmountSummary(params: {
    billToPartyCode?: string;
    billToParty?: string;
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
}) {
    const filters = [];

    if (params.billToPartyCode) {
        filters.push(eq(invoice.billToPartyCode, params.billToPartyCode));
    }

    if (params.billToParty) {
        filters.push(eq(invoice.billToParty, params.billToParty));
    }

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const [row] = await db
        .select({
            totalNetAmountInr: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            totalGrossAmount: sql<
                number
            >`coalesce(sum(${invoice.grossAmount}), 0)`,
            totalDiscountAmount: sql<
                number
            >`coalesce(sum(${invoice.discountAmount}), 0)`,
            totalTaxableAmount: sql<
                number
            >`coalesce(sum(${invoice.taxableAmount}), 0)`,
            totalGstAmount: sql<
                number
            >`coalesce(sum(${invoice.totalGstAmount}), 0)`,
            totalTcsAmount: sql<number>`coalesce(sum(${invoice.tcsAmount}), 0)`,
            invoiceCount: sql<number>`count(*)`,
        })
        .from(invoice)
        .where(where);

    return row;
}

export async function getInvoiceShippingDetails(params: {
    billingDocument: string;
    item: number;
}) {
    const row = await getInvoiceByBillingDocumentAndItem(params);

    if (!row) return null;

    return {
        billingDocument: row.billingDocument,
        item: row.item,
        invoiceDate: row.invoiceDate,
        billToParty: row.billToParty,
        billToPartyCode: row.billToPartyCode,
        billToPartyCity: row.billToPartyCity,
        shipToPartyCity: row.shipToPartyCity,
        plant: row.plant,
        regionZone: row.regionZone,
        agentCode: row.agentCode,
        agentName: row.agentName,
        brokerCode: row.brokerCode,
        brokerName: row.brokerName,
    };
}

export async function listCustomerDistinctValues() {
    const [customers, cities] = await Promise.all([
        db
            .selectDistinct({
                billToPartyCode: invoice.billToPartyCode,
                billToParty: invoice.billToParty,
            })
            .from(invoice),
        db
            .selectDistinct({
                city: invoice.billToPartyCity,
            })
            .from(invoice),
    ]);

    return {
        customers,
        cities,
    };
}

// =========
// Admin tools
// =========

export async function getInvoiceKpis(params: {
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
}) {
    const filters = [];

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const [row] = await db
        .select({
            totalInvoices: sql<number>`count(*)`,
            totalNetAmountInr: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            totalGrossAmount: sql<
                number
            >`coalesce(sum(${invoice.grossAmount}), 0)`,
            totalDiscountAmount: sql<
                number
            >`coalesce(sum(${invoice.discountAmount}), 0)`,
            totalTaxableAmount: sql<
                number
            >`coalesce(sum(${invoice.taxableAmount}), 0)`,
            totalGstAmount: sql<
                number
            >`coalesce(sum(${invoice.totalGstAmount}), 0)`,
            totalTcsAmount: sql<number>`coalesce(sum(${invoice.tcsAmount}), 0)`,
            avgInvoiceNetAmount: sql<
                number
            >`coalesce(avg(${invoice.netAmountInr}), 0)`,
        })
        .from(invoice)
        .where(where);

    return row;
}

export async function getTopCustomersByRevenue(params: {
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
    limit?: number;
}) {
    const filters = [];

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const limit = params.limit && params.limit > 0
        ? Math.min(params.limit, 100)
        : 20;

    const rows = await db
        .select({
            billToPartyCode: invoice.billToPartyCode,
            billToParty: invoice.billToParty,
            totalNetAmountInr: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            totalGrossAmount: sql<
                number
            >`coalesce(sum(${invoice.grossAmount}), 0)`,
            invoiceCount: sql<number>`count(*)`,
        })
        .from(invoice)
        .where(where)
        .groupBy(invoice.billToPartyCode, invoice.billToParty)
        .orderBy(desc(sql`coalesce(sum(${invoice.netAmountInr}), 0)`))
        .limit(limit);

    return rows;
}

export async function getRevenueByRegion(params: {
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
}) {
    const filters = [];

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const rows = await db
        .select({
            regionZone: invoice.regionZone,
            totalNetAmountInr: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            totalGrossAmount: sql<
                number
            >`coalesce(sum(${invoice.grossAmount}), 0)`,
            invoiceCount: sql<number>`count(*)`,
        })
        .from(invoice)
        .where(where)
        .groupBy(invoice.regionZone)
        .orderBy(desc(sql`coalesce(sum(${invoice.netAmountInr}), 0)`));

    return rows;
}

export async function getAgentPerformance(params: {
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
}) {
    const filters = [];

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const rows = await db
        .select({
            agentCode: invoice.agentCode,
            agentName: invoice.agentName,
            regionZone: invoice.regionZone,
            totalNetAmountInr: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            totalGrossAmount: sql<
                number
            >`coalesce(sum(${invoice.grossAmount}), 0)`,
            invoiceCount: sql<number>`count(*)`,
        })
        .from(invoice)
        .where(where)
        .groupBy(invoice.agentCode, invoice.agentName, invoice.regionZone)
        .orderBy(desc(sql`coalesce(sum(${invoice.netAmountInr}), 0)`));

    return rows;
}

export async function getFabricPerformanceByEndUse(params: {
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
}) {
    const filters = [];

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const rows = await db
        .select({
            endUse: invoice.endUse,
            fabricType: invoice.fabricType,
            fabricTypeDescription: invoice.fabricTypeDescription,
            style: invoice.style,
            totalNetAmountInr: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            totalGrossAmount: sql<
                number
            >`coalesce(sum(${invoice.grossAmount}), 0)`,
            invoiceCount: sql<number>`count(*)`,
        })
        .from(invoice)
        .where(where)
        .groupBy(
            invoice.endUse,
            invoice.fabricType,
            invoice.fabricTypeDescription,
            invoice.style,
        )
        .orderBy(desc(sql`coalesce(sum(${invoice.netAmountInr}), 0)`));

    return rows;
}

export async function getPatternPerformance(params: {
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
}) {
    const filters = [];

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = filters.length === 0 ? undefined : and(...filters);

    const rows = await db
        .select({
            ainocularDesign: invoice.ainocularDesign,
            ainocularDesignDescription: invoice.ainocularDesignDescription,
            ainocularShade: invoice.ainocularShade,
            ainocularShadeDescription: invoice.ainocularShadeDescription,
            patternName: invoice.patternName,
            colourFamily: invoice.colourFamily,
            totalNetAmountInr: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            totalGrossAmount: sql<
                number
            >`coalesce(sum(${invoice.grossAmount}), 0)`,
            invoiceCount: sql<number>`count(*)`,
        })
        .from(invoice)
        .where(where)
        .groupBy(
            invoice.ainocularDesign,
            invoice.ainocularDesignDescription,
            invoice.ainocularShade,
            invoice.ainocularShadeDescription,
            invoice.patternName,
            invoice.colourFamily,
        )
        .orderBy(desc(sql`coalesce(sum(${invoice.netAmountInr}), 0)`));

    return rows;
}

export async function listAdminDistinctValues() {
    const [regions, agents, endUses, ainocularDesigns] = await Promise.all([
        db
            .selectDistinct({
                regionZone: invoice.regionZone,
            })
            .from(invoice),
        db
            .selectDistinct({
                agentCode: invoice.agentCode,
                agentName: invoice.agentName,
            })
            .from(invoice),
        db
            .selectDistinct({
                endUse: invoice.endUse,
            })
            .from(invoice),
        db
            .selectDistinct({
                ainocularDesign: invoice.ainocularDesign,
                ainocularDesignDescription: invoice.ainocularDesignDescription,
            })
            .from(invoice),
    ]);

    return {
        regions,
        agents,
        endUses,
        ainocularDesigns,
    };
}

// =========
// Invoice PDF Tool
// =========

/**
 * Get the PDF download link for an invoice by billing document ID.
 * The PDF files are stored in an S3 bucket with the naming convention: {billingDocument}.pdf
 */
export async function getInvoicePdfLink(params: {
    billingDocument: string;
}) {
    const { billingDocument } = params;

    if (!billingDocument || billingDocument.trim() === "") {
        return {
            success: false,
            error: "Billing document ID is required.",
            pdfUrl: null,
        };
    }

    // Verify the invoice exists in the database
    const [invoiceRecord] = await db
        .select({
            billingDocument: invoice.billingDocument,
            billToParty: invoice.billToParty,
            invoiceDate: invoice.invoiceDate,
            netAmountInr: invoice.netAmountInr,
        })
        .from(invoice)
        .where(eq(invoice.billingDocument, billingDocument.trim()))
        .limit(1);

    if (!invoiceRecord) {
        return {
            success: false,
            error:
                `No invoice found with billing document ID: ${billingDocument}`,
            pdfUrl: null,
        };
    }

    const pdfUrl = `${INVOICE_PDF_BUCKET_URL}/${billingDocument.trim()}.pdf`;

    return {
        success: true,
        billingDocument: invoiceRecord.billingDocument,
        billToParty: invoiceRecord.billToParty,
        invoiceDate: invoiceRecord.invoiceDate,
        netAmountInr: invoiceRecord.netAmountInr,
        pdfUrl,
        message:
            `PDF available for invoice ${billingDocument}. Click the link to download.`,
    };
}
