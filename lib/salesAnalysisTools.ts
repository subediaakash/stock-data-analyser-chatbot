import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { invoice } from "@/drizzle/schema/invoice-schema";
import { stock } from "@/drizzle/schema/stock-schema";

// 1. Quarterly Revenue for Regions (US, UK, EU)
export async function getQuarterlyRevenue(params: {
    regions?: string[]; // e.g. ["US", "UK", "EU"]
    years?: number; // e.g. 2
}) {
    const years = params.years || 2;
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

    const conditions = [
        gte(invoice.invoiceDate, cutoffDate.toISOString().slice(0, 10)),
    ];
    if (params.regions && params.regions.length > 0) {
        // Assuming regionZone matches or we need a mapping.
        // The user query said "US, UK, EU", checking invoice data might be needed to see exact values.
        // For now, we use inArray if provided.
        conditions.push(inArray(invoice.regionZone, params.regions));
    }

    const rows = await db
        .select({
            year: sql<number>`EXTRACT(YEAR FROM ${invoice.invoiceDate})`,
            quarter: sql<number>`EXTRACT(QUARTER FROM ${invoice.invoiceDate})`,
            region: invoice.regionZone,
            revenue: sql<number>`sum(${invoice.netAmountInr})`,
        })
        .from(invoice)
        .where(and(...conditions))
        .groupBy(
            sql`EXTRACT(YEAR FROM ${invoice.invoiceDate})`,
            sql`EXTRACT(QUARTER FROM ${invoice.invoiceDate})`,
            invoice.regionZone,
        )
        .orderBy(
            sql`EXTRACT(YEAR FROM ${invoice.invoiceDate}) DESC`,
            sql`EXTRACT(QUARTER FROM ${invoice.invoiceDate}) DESC`,
        );

    return rows;
}

// 2. Region Growth (Year over Year)
export async function getRegionGrowth() {
    // Compare last 12 months vs previous 12 months
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    const currentPeriod = await db
        .select({
            region: invoice.regionZone,
            revenue: sql<number>`coalesce(sum(${invoice.netAmountInr}), 0)`,
        })
        .from(invoice)
        .where(and(
            gte(invoice.invoiceDate, oneYearAgo.toISOString().slice(0, 10)),
            lte(invoice.invoiceDate, today.toISOString().slice(0, 10)),
        ))
        .groupBy(invoice.regionZone);

    const previousPeriod = await db
        .select({
            region: invoice.regionZone,
            revenue: sql<number>`coalesce(sum(${invoice.netAmountInr}), 0)`,
        })
        .from(invoice)
        .where(and(
            gte(invoice.invoiceDate, twoYearsAgo.toISOString().slice(0, 10)),
            lte(invoice.invoiceDate, oneYearAgo.toISOString().slice(0, 10)),
        ))
        .groupBy(invoice.regionZone);

    // Calculate growth
    const growthData = currentPeriod.map((curr) => {
        const prev = previousPeriod.find((p) => p.region === curr.region);
        const prevRev = prev ? Number(prev.revenue) : 0;
        const currRev = Number(curr.revenue);
        const growth = prevRev === 0
            ? (currRev > 0 ? 100 : 0)
            : ((currRev - prevRev) / prevRev) * 100;
        return {
            region: curr.region,
            currentRevenue: currRev,
            previousRevenue: prevRev,
            growthPercentage: growth.toFixed(2),
        };
    });

    return growthData.sort((a, b) =>
        parseFloat(b.growthPercentage) - parseFloat(a.growthPercentage)
    );
}

// 3. Customer Growth
export async function getCustomerGrowth(params: { limit?: number }) {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    const currentPeriod = await db
        .select({
            customerCode: invoice.billToPartyCode,
            customerName: invoice.billToParty,
            revenue: sql<number>`coalesce(sum(${invoice.netAmountInr}), 0)`,
        })
        .from(invoice)
        .where(and(
            gte(invoice.invoiceDate, oneYearAgo.toISOString().slice(0, 10)),
            lte(invoice.invoiceDate, today.toISOString().slice(0, 10)),
        ))
        .groupBy(invoice.billToPartyCode, invoice.billToParty);

    const previousPeriod = await db
        .select({
            customerCode: invoice.billToPartyCode,
            revenue: sql<number>`coalesce(sum(${invoice.netAmountInr}), 0)`,
        })
        .from(invoice)
        .where(and(
            gte(invoice.invoiceDate, twoYearsAgo.toISOString().slice(0, 10)),
            lte(invoice.invoiceDate, oneYearAgo.toISOString().slice(0, 10)),
        ))
        .groupBy(invoice.billToPartyCode);

    const growthData = currentPeriod.map((curr) => {
        const prev = previousPeriod.find((p) =>
            p.customerCode === curr.customerCode
        );
        const prevRev = prev ? Number(prev.revenue) : 0;
        const currRev = Number(curr.revenue);
        const growth = prevRev === 0
            ? (currRev > 0 ? 100 : 0)
            : ((currRev - prevRev) / prevRev) * 100;
        return {
            customer: curr.customerName,
            currentRevenue: currRev,
            previousRevenue: prevRev,
            growthPercentage: parseFloat(growth.toFixed(2)),
            absoluteGrowth: currRev - prevRev,
        };
    });

    return growthData.sort((a, b) => b.absoluteGrowth - a.absoluteGrowth).slice(
        0,
        params.limit || 20,
    );
}

// 4. City Analysis (Top customers, products, avg selling rate)
export async function getCityAnalysis(
    params: {
        city: string;
        type:
            | "top_customers"
            | "top_products"
            | "avg_selling_rate"
            | "top_shades";
    },
) {
    const cityFilter = eq(
        sql`lower(${invoice.billToPartyCity})`,
        params.city.toLowerCase(),
    );

    if (params.type === "top_customers") {
        return await db.select({
            customer: invoice.billToParty,
            revenue: sql<number>`sum(${invoice.netAmountInr})`,
        })
            .from(invoice)
            .where(cityFilter)
            .groupBy(invoice.billToParty)
            .orderBy(desc(sql`sum(${invoice.netAmountInr})`))
            .limit(10);
    }

    if (params.type === "top_products") {
        return await db.select({
            product: invoice.material,
            design: invoice.ainocularDesign,
            quantity: sql<number>`sum(${invoice.billedQuantity})`,
        })
            .from(invoice)
            .where(cityFilter)
            .groupBy(invoice.material, invoice.ainocularDesign)
            .orderBy(desc(sql`sum(${invoice.billedQuantity})`))
            .limit(5);
    }

    if (params.type === "top_shades") {
        return await db.select({
            shade: invoice.ainocularShade,
            quantity: sql<number>`sum(${invoice.billedQuantity})`,
        })
            .from(invoice)
            .where(cityFilter)
            .groupBy(invoice.ainocularShade)
            .orderBy(desc(sql`sum(${invoice.billedQuantity})`))
            .limit(5);
    }

    if (params.type === "avg_selling_rate") {
        return await db.select({
            city: invoice.billToPartyCity,
            avgRate: sql<number>`avg(${invoice.basicPrice})`,
        })
            .from(invoice)
            .groupBy(invoice.billToPartyCity)
            .orderBy(desc(sql`avg(${invoice.basicPrice})`)); // Returns for all cities if city param is ignored, but here we might just want for specific city if passed
        // Actually the prompt asked "List down average selling rate by cities", so we might want to ignore the city filter if looking for all.
    }
}

// 5. End Use Share
export async function getEndUseShare() {
    const total = await db.select({
        total: sql<number>`sum(${invoice.netAmountInr})`,
    }).from(invoice);
    const totalRevenue = Number(total[0]?.total || 1);

    const rows = await db.select({
        endUse: invoice.endUse,
        revenue: sql<number>`sum(${invoice.netAmountInr})`,
    })
        .from(invoice)
        .groupBy(invoice.endUse)
        .orderBy(desc(sql`sum(${invoice.netAmountInr})`));

    return rows.map((r) => ({
        ...r,
        sharePercentage: ((Number(r.revenue) / totalRevenue) * 100).toFixed(2),
    }));
}

// 6. Agent Growth
export async function getAgentGrowth() {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    const currentPeriod = await db
        .select({
            agentCode: invoice.agentCode,
            agentName: invoice.agentName,
            revenue: sql<number>`coalesce(sum(${invoice.netAmountInr}), 0)`,
        })
        .from(invoice)
        .where(and(
            gte(invoice.invoiceDate, oneYearAgo.toISOString().slice(0, 10)),
            lte(invoice.invoiceDate, today.toISOString().slice(0, 10)),
        ))
        .groupBy(invoice.agentCode, invoice.agentName);

    const previousPeriod = await db
        .select({
            agentCode: invoice.agentCode,
            revenue: sql<number>`coalesce(sum(${invoice.netAmountInr}), 0)`,
        })
        .from(invoice)
        .where(and(
            gte(invoice.invoiceDate, twoYearsAgo.toISOString().slice(0, 10)),
            lte(invoice.invoiceDate, oneYearAgo.toISOString().slice(0, 10)),
        ))
        .groupBy(invoice.agentCode);

    const growthData = currentPeriod.map((curr) => {
        const prev = previousPeriod.find((p) => p.agentCode === curr.agentCode);
        const prevRev = prev ? Number(prev.revenue) : 0;
        const currRev = Number(curr.revenue);
        return {
            agent: curr.agentName,
            growth: currRev - prevRev,
        };
    });

    return growthData.sort((a, b) => b.growth - a.growth);
}

// 7. Inactive Customers (Retention)
export async function getInactiveCustomers(params: { monthsInactive: number }) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - params.monthsInactive);

    // Find customers who ordered before cutoff but NOT after cutoff
    // This is a "set difference" problem.

    // 1. Customers active AFTER cutoff
    const activeRecent = await db.selectDistinct({
        code: invoice.billToPartyCode,
    })
        .from(invoice)
        .where(gte(invoice.invoiceDate, cutoffDate.toISOString().slice(0, 10)));

    const activeCodes = activeRecent.map((r) => r.code).filter(
        Boolean,
    ) as string[];

    // 2. Customers active BEFORE cutoff (regularly?) - let's say they ordered in the year prior to cutoff
    const priorDate = new Date(cutoffDate);
    priorDate.setFullYear(priorDate.getFullYear() - 1);

    const previouslyActive = await db.select({
        code: invoice.billToPartyCode,
        name: invoice.billToParty,
        lastOrderDate: sql<string>`max(${invoice.invoiceDate})`,
        totalOrders: sql<number>`count(*)`,
    })
        .from(invoice)
        .where(and(
            gte(invoice.invoiceDate, priorDate.toISOString().slice(0, 10)),
            lte(invoice.invoiceDate, cutoffDate.toISOString().slice(0, 10)),
        ))
        .groupBy(invoice.billToPartyCode, invoice.billToParty);

    // Filter out those who are in activeCodes
    return previouslyActive.filter((c) =>
        c.code && !activeCodes.includes(c.code)
    );
}

// 8. Stock vs Sales Analysis
export async function getStockSalesAnalysis(
    params: {
        type:
            | "high_sales_zero_stock"
            | "out_of_stock"
            | "likely_stock_out"
            | "low_stock"
            | "excess_stock";
    },
) {
    // We need to join invoice aggregation with stock.
    // Since Drizzle doesn't support complex cross-table aggregation easily in one fluent query without defining relations,
    // we might do this in two steps or raw SQL. Two steps is safer/easier for now.

    // Get Stock Data
    const stockItems = await db.select().from(stock);
    const stockMap = new Map(stockItems.map((s) => [s.material, s]));

    // Get Sales Data (Last 3-6 months for velocity)
    const velocityDate = new Date();
    velocityDate.setMonth(velocityDate.getMonth() - 3);

    const salesVelocity = await db.select({
        material: invoice.material,
        totalSold: sql<number>`sum(${invoice.billedQuantity})`,
    })
        .from(invoice)
        .where(
            gte(invoice.invoiceDate, velocityDate.toISOString().slice(0, 10)),
        )
        .groupBy(invoice.material);

    const results = [];

    for (const sale of salesVelocity) {
        if (!sale.material) continue;
        const stockItem = stockMap.get(sale.material);
        if (!stockItem) continue;

        const currentStock = Number(stockItem.stockInMeters || 0);
        const soldLast3Months = Number(sale.totalSold || 0);
        const monthlyVelocity = soldLast3Months / 3;

        if (params.type === "high_sales_zero_stock") {
            if (currentStock <= 0 && soldLast3Months > 0) {
                results.push({
                    material: sale.material,
                    stock: currentStock,
                    soldLast3Months,
                });
            }
        } else if (params.type === "out_of_stock") {
            if (currentStock <= 0) {
                results.push({ material: sale.material, stock: currentStock });
            }
        } else if (params.type === "likely_stock_out") {
            // If stock covers less than 1 month of sales
            if (currentStock > 0 && currentStock < monthlyVelocity) {
                results.push({
                    material: sale.material,
                    stock: currentStock,
                    monthlyVelocity,
                    coverageMonths: currentStock / monthlyVelocity,
                });
            }
        } else if (params.type === "low_stock") {
            // Arbitrary threshold or based on reorder level if exists
            if (currentStock > 0 && currentStock < 100) { // Example threshold
                results.push({ material: sale.material, stock: currentStock });
            }
        }
    }

    // Sort by relevance
    if (params.type === "high_sales_zero_stock") {
        results.sort((a, b) =>
            (b.soldLast3Months || 0) - (a.soldLast3Months || 0)
        );
    } else if (params.type === "likely_stock_out") {
        results.sort((a, b) =>
            (a.coverageMonths || 0) - (b.coverageMonths || 0)
        );
    }

    return results.slice(0, 20);
}

// 9. General Stock Info
export async function getStockInfo(
    params: { sku?: string; minQuantity?: number },
) {
    const conditions = [];
    if (params.sku) {
        conditions.push(eq(stock.material, params.sku));
    }
    if (params.minQuantity) {
        conditions.push(sql`${stock.stockInMeters} >= ${params.minQuantity}`);
    }

    const rows = await db.select().from(stock).where(and(...conditions)).limit(
        20,
    );
    return rows;
}

export async function getTotalStockValue() {
    const rows = await db.select({
        totalStockValue: sql<
            number
        >`sum(${stock.stockInMeters} * ${stock.basicPrice})`,
    }).from(stock);
    return rows[0];
}

// 10. Stock Turn Ratio (Approximate: Annualized Sales / Current Stock)
export async function getStockTurnRatio() {
    // Get total sales quantity in last 12 months
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const sales = await db.select({
        totalQuantity: sql<number>`sum(${invoice.billedQuantity})`,
    })
        .from(invoice)
        .where(gte(invoice.invoiceDate, oneYearAgo.toISOString().slice(0, 10)));

    const totalSalesQty = Number(sales[0]?.totalQuantity || 0);

    // Get total current stock quantity
    const stockData = await db.select({
        totalStock: sql<number>`sum(${stock.stockInMeters})`,
    }).from(stock);

    const totalStockQty = Number(stockData[0]?.totalStock || 0);

    if (totalStockQty === 0) {
        return {
            stockTurnRatio: 0,
            explanation: "No stock available to calculate ratio.",
        };
    }

    const ratio = totalSalesQty / totalStockQty;
    return {
        stockTurnRatio: ratio.toFixed(2),
        totalSalesQtyLastYear: totalSalesQty,
        currentTotalStockQty: totalStockQty,
        explanation:
            "Calculated as (Total Sales Qty Last 12 Months) / (Current Total Stock Qty). This is an approximation assuming current stock represents average stock.",
    };
}

// 11. Top Selling Products (Global)
export async function getTopProducts(params: { limit?: number }) {
    const limit = params.limit || 10;
    return await db.select({
        material: invoice.material,
        design: invoice.ainocularDesign,
        shade: invoice.ainocularShade,
        totalRevenue: sql<number>`sum(${invoice.netAmountInr})`,
        totalQuantity: sql<number>`sum(${invoice.billedQuantity})`,
    })
        .from(invoice)
        .groupBy(
            invoice.material,
            invoice.ainocularDesign,
            invoice.ainocularShade,
        )
        .orderBy(desc(sql`sum(${invoice.netAmountInr})`))
        .limit(limit);
}
