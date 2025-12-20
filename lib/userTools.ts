import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/drizzle/db";
import { invoice } from "@/drizzle/schema/invoice-schema";
import { auth } from "./auth";

// S3 bucket base URL for invoice PDFs
const INVOICE_PDF_BUCKET_URL =
    "https://ainoc-chatbot-files-bucket.s3.us-east-2.amazonaws.com";

type DateInput = string | Date;

function normalizeDate(
    value: DateInput | null | undefined,
): string | undefined {
    if (!value) return undefined;

    const asDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(asDate.getTime())) return undefined;

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
// Auth Helper
// =========

export type AuthenticatedUser = {
    id: string;
    name: string;
    email: string;
    billToPartyCode: string; // User's name is used as billToPartyCode
};

export type AuthResult =
    | { authenticated: true; user: AuthenticatedUser }
    | { authenticated: false; error: string };

/**
 * Get the authenticated user from the request headers.
 * The user's name is used as the billToPartyCode to scope queries.
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({
            headers: headersList,
        });

        if (!session || !session.user) {
            return {
                authenticated: false,
                error:
                    "You must be logged in to use this feature. Please sign in first.",
            };
        }

        const user = session.user;

        return {
            authenticated: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                billToPartyCode: user.name, // User's name maps to billToPartyCode
            },
        };
    } catch {
        return {
            authenticated: false,
            error: "Authentication failed. Please sign in again.",
        };
    }
}

// =========
// User Tools - Scoped to authenticated user's billToPartyCode
// =========

/**
 * Get the user's invoice history with optional date filters.
 * Automatically scoped to the authenticated user's billToPartyCode.
 */
export async function getMyInvoiceHistory(
    params: {
        fromDate?: DateInput | null;
        toDate?: DateInput | null;
    } & Pagination,
) {
    const authResult = await getAuthenticatedUser();

    if (!authResult.authenticated) {
        console.log("not authenticated");

        return { success: false, error: authResult.error, data: null };
    }

    const { user } = authResult;
    const { limit, offset } = getSafePagination(params);
    const filters = [];

    // Always filter by the authenticated user's billToPartyCode
    filters.push(eq(invoice.billToPartyCode, user.billToPartyCode));

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = and(...filters);

    const rows = await db
        .select()
        .from(invoice)
        .where(where)
        .orderBy(desc(invoice.invoiceDate))
        .limit(limit)
        .offset(offset);

    return {
        success: true,
        user: {
            name: user.name,
            billToPartyCode: user.name,
        },
        invoiceCount: rows.length,
        data: rows,
    };
}

/**
 * Get the user's invoice summary (totals, counts, etc.).
 * Automatically scoped to the authenticated user's billToPartyCode.
 */
export async function getMyInvoiceSummary(params: {
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
}) {
    const authResult = await getAuthenticatedUser();

    if (!authResult.authenticated) {
        return { success: false, error: authResult.error, data: null };
    }

    const { user } = authResult;
    const filters = [];

    // Always filter by the authenticated user's billToPartyCode
    filters.push(eq(invoice.billToPartyCode, user.billToPartyCode));

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = and(...filters);

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

    return {
        success: true,
        user: {
            name: user.name,
            billToPartyCode: user.billToPartyCode,
        },
        data: row,
    };
}

/**
 * Get a specific invoice PDF link for the authenticated user.
 * Verifies the invoice belongs to the user before returning the link.
 */
export async function getMyInvoicePdf(params: {
    billingDocument: string;
}) {
    const authResult = await getAuthenticatedUser();

    if (!authResult.authenticated) {
        return { success: false, error: authResult.error, pdfUrl: null };
    }

    const { user } = authResult;
    const { billingDocument } = params;

    if (!billingDocument || billingDocument.trim() === "") {
        return {
            success: false,
            error: "Billing document ID is required.",
            pdfUrl: null,
        };
    }

    // Verify the invoice exists AND belongs to this user (comparing billToPartyCode)
    const [invoiceRecord] = await db
        .select({
            billingDocument: invoice.billingDocument,
            billToPartyCode: invoice.billToPartyCode,
            invoiceDate: invoice.invoiceDate,
            netAmountInr: invoice.netAmountInr,
        })
        .from(invoice)
        .where(
            and(
                eq(invoice.billingDocument, billingDocument.trim()),
                eq(invoice.billToPartyCode, user.billToPartyCode),
            ),
        )
        .limit(1);

    if (!invoiceRecord) {
        return {
            success: false,
            error:
                `No invoice found with billing document ID: ${billingDocument} for your account.`,
            pdfUrl: null,
        };
    }

    const pdfUrl = `${INVOICE_PDF_BUCKET_URL}/${billingDocument.trim()}.pdf`;

    return {
        success: true,
        billingDocument: invoiceRecord.billingDocument,
        billToPartyCode: invoiceRecord.billToPartyCode,
        invoiceDate: invoiceRecord.invoiceDate,
        netAmountInr: invoiceRecord.netAmountInr,
        pdfUrl,
        message:
            `PDF available for your invoice ${billingDocument}. Click the link to download.`,
    };
}

/**
 * Get details of a specific invoice for the authenticated user.
 * Verifies the invoice belongs to the user.
 */
export async function getMyInvoiceDetails(params: {
    billingDocument: string;
    item?: number;
}) {
    const authResult = await getAuthenticatedUser();

    if (!authResult.authenticated) {
        return { success: false, error: authResult.error, data: null };
    }

    const { user } = authResult;
    const { billingDocument, item } = params;

    if (!billingDocument || billingDocument.trim() === "") {
        return {
            success: false,
            error: "Billing document ID is required.",
            data: null,
        };
    }

    const filters = [
        eq(invoice.billingDocument, billingDocument.trim()),
        eq(invoice.billToPartyCode, user.billToPartyCode),
    ];

    if (item !== undefined) {
        filters.push(eq(invoice.item, item));
    }

    const rows = await db
        .select()
        .from(invoice)
        .where(and(...filters))
        .orderBy(invoice.item);

    if (rows.length === 0) {
        return {
            success: false,
            error:
                `No invoice found with billing document ID: ${billingDocument} for your account.`,
            data: null,
        };
    }

    return {
        success: true,
        user: {
            name: user.name,
            billToPartyCode: user.billToPartyCode,
        },
        data: rows.length === 1 ? rows[0] : rows,
    };
}

/**
 * Get the user's recent invoices (last N invoices).
 * Automatically scoped to the authenticated user's billToPartyCode.
 */
export async function getMyRecentInvoices(params: {
    limit?: number;
}) {
    const authResult = await getAuthenticatedUser();

    if (!authResult.authenticated) {
        return { success: false, error: authResult.error, data: null };
    }

    const { user } = authResult;
    const limit = params.limit && params.limit > 0
        ? Math.min(params.limit, 50)
        : 10;

    const rows = await db
        .select()
        .from(invoice)
        .where(eq(invoice.billToPartyCode, user.billToPartyCode))
        .orderBy(desc(invoice.invoiceDate))
        .limit(limit);

    return {
        success: true,
        user: {
            name: user.name,
            billToPartyCode: user.billToPartyCode,
        },
        invoiceCount: rows.length,
        data: rows,
    };
}

/**
 * Get the user's purchase analysis by material/product.
 * Shows what materials the user has purchased and how much.
 */
export async function getMyPurchasesByMaterial(params: {
    fromDate?: DateInput | null;
    toDate?: DateInput | null;
    limit?: number;
}) {
    const authResult = await getAuthenticatedUser();

    if (!authResult.authenticated) {
        return { success: false, error: authResult.error, data: null };
    }

    const { user } = authResult;
    const filters = [];
    const limit = params.limit && params.limit > 0
        ? Math.min(params.limit, 100)
        : 20;

    // Always filter by the authenticated user's billToPartyCode
    filters.push(eq(invoice.billToPartyCode, user.billToPartyCode));

    const fromDate = normalizeDate(params.fromDate ?? undefined);
    const toDate = normalizeDate(params.toDate ?? undefined);

    if (fromDate) {
        filters.push(gte(invoice.invoiceDate, fromDate));
    }

    if (toDate) {
        filters.push(lte(invoice.invoiceDate, toDate));
    }

    const where = and(...filters);

    const rows = await db
        .select({
            material: invoice.material,
            ainocularDesign: invoice.ainocularDesign,
            ainocularDesignDescription: invoice.ainocularDesignDescription,
            fabricType: invoice.fabricType,
            totalQuantity: sql<
                number
            >`coalesce(sum(${invoice.billedQuantity}), 0)`,
            totalNetAmount: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            purchaseCount: sql<number>`count(*)`,
        })
        .from(invoice)
        .where(where)
        .groupBy(
            invoice.material,
            invoice.ainocularDesign,
            invoice.ainocularDesignDescription,
            invoice.fabricType,
        )
        .orderBy(desc(sql`coalesce(sum(${invoice.netAmountInr}), 0)`))
        .limit(limit);

    return {
        success: true,
        user: {
            name: user.name,
            billToPartyCode: user.billToPartyCode,
        },
        data: rows,
    };
}

/**
 * Get the user's monthly purchase trends.
 * Shows purchase patterns over time.
 */
export async function getMyMonthlyPurchaseTrend(params: {
    months?: number;
}) {
    const authResult = await getAuthenticatedUser();

    if (!authResult.authenticated) {
        return { success: false, error: authResult.error, data: null };
    }

    const { user } = authResult;
    const monthsBack = params.months && params.months > 0
        ? Math.min(params.months, 24)
        : 12;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    const fromDate = normalizeDate(startDate);

    const rows = await db
        .select({
            month: sql<
                string
            >`to_char(${invoice.invoiceDate}::date, 'YYYY-MM')`,
            totalNetAmount: sql<
                number
            >`coalesce(sum(${invoice.netAmountInr}), 0)`,
            totalQuantity: sql<
                number
            >`coalesce(sum(${invoice.billedQuantity}), 0)`,
            invoiceCount: sql<number>`count(*)`,
        })
        .from(invoice)
        .where(
            and(
                eq(invoice.billToPartyCode, user.billToPartyCode),
                gte(invoice.invoiceDate, fromDate!),
            ),
        )
        .groupBy(sql`to_char(${invoice.invoiceDate}::date, 'YYYY-MM')`)
        .orderBy(sql`to_char(${invoice.invoiceDate}::date, 'YYYY-MM')`);

    return {
        success: true,
        user: {
            name: user.name,
            billToPartyCode: user.billToPartyCode,
        },
        monthsAnalyzed: monthsBack,
        data: rows,
    };
}

/**
 * Check if the current user is authenticated and get their profile.
 * Useful for verifying auth status.
 */
export async function getMyProfile() {
    const authResult = await getAuthenticatedUser();

    if (!authResult.authenticated) {
        return { success: false, error: authResult.error, data: null };
    }

    const { user } = authResult;

    // Get some stats about the user's invoices (using billToPartyCode)
    const [stats] = await db
        .select({
            totalInvoices: sql<number>`count(*)`,
            totalSpent: sql<number>`coalesce(sum(${invoice.netAmountInr}), 0)`,
            firstInvoiceDate: sql<string>`min(${invoice.invoiceDate})`,
            lastInvoiceDate: sql<string>`max(${invoice.invoiceDate})`,
        })
        .from(invoice)
        .where(eq(invoice.billToPartyCode, user.billToPartyCode));

    return {
        success: true,
        data: {
            id: user.id,
            name: user.name,
            email: user.email,
            billToPartyCode: user.billToPartyCode,
            stats: {
                totalInvoices: stats.totalInvoices,
                totalSpent: stats.totalSpent,
                firstInvoiceDate: stats.firstInvoiceDate,
                lastInvoiceDate: stats.lastInvoiceDate,
            },
        },
    };
}
