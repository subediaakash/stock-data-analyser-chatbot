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

// ========================
// Admin Stock Tools
// ========================

// 12. Stock Summary KPIs
export async function getStockSummaryKpis() {
    const [summary] = await db.select({
        totalMaterials: sql<number>`count(*)`,
        totalStockQuantity: sql<
            number
        >`coalesce(sum(${stock.stockInMeters}), 0)`,
        totalStockValue: sql<
            number
        >`coalesce(sum(${stock.stockInMeters} * ${stock.basicPrice}), 0)`,
        avgBasicPrice: sql<number>`coalesce(avg(${stock.basicPrice}), 0)`,
        avgLeadTimeDays: sql<number>`coalesce(avg(${stock.leadTimeDays}), 0)`,
        materialsWithZeroStock: sql<
            number
        >`count(case when ${stock.stockInMeters} <= 0 or ${stock.stockInMeters} is null then 1 end)`,
        materialsWithStock: sql<
            number
        >`count(case when ${stock.stockInMeters} > 0 then 1 end)`,
    }).from(stock);

    return summary;
}

// 13. Stock by Category (group by various attributes)
export async function getStockByCategory(params: {
    groupBy:
        | "fabric_type"
        | "loom_type"
        | "dyed_type"
        | "stock_type"
        | "colour_family"
        | "end_use"
        | "pattern_name";
}) {
    const groupColumn = {
        fabric_type: stock.fabricType,
        loom_type: stock.loomType,
        dyed_type: stock.dyedType,
        stock_type: stock.stockType,
        colour_family: stock.colourFamily,
        end_use: stock.endUse,
        pattern_name: stock.patternName,
    }[params.groupBy];

    const rows = await db.select({
        category: groupColumn,
        materialCount: sql<number>`count(*)`,
        totalStockQuantity: sql<
            number
        >`coalesce(sum(${stock.stockInMeters}), 0)`,
        totalStockValue: sql<
            number
        >`coalesce(sum(${stock.stockInMeters} * ${stock.basicPrice}), 0)`,
        avgBasicPrice: sql<number>`coalesce(avg(${stock.basicPrice}), 0)`,
    })
        .from(stock)
        .groupBy(groupColumn)
        .orderBy(
            desc(
                sql`coalesce(sum(${stock.stockInMeters} * ${stock.basicPrice}), 0)`,
            ),
        );

    return rows;
}

// 14. Replenishment Report (items needing replenishment soon)
export async function getReplenishmentReport(params: {
    daysAhead?: number; // Check for items with replenishment date within N days
}) {
    const daysAhead = params.daysAhead || 30;
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const rows = await db.select()
        .from(stock)
        .where(and(
            lte(stock.replenishmentDate, futureDate.toISOString().slice(0, 10)),
            gte(stock.replenishmentDate, today.toISOString().slice(0, 10)),
        ))
        .orderBy(stock.replenishmentDate);

    return {
        daysAhead,
        itemsNeedingReplenishment: rows.length,
        items: rows,
    };
}

// 15. Stock Lead Time Analysis
export async function getStockLeadTimeAnalysis(params: {
    minLeadTimeDays?: number;
    sortOrder?: "asc" | "desc";
    limit?: number;
}) {
    const conditions = [];
    if (params.minLeadTimeDays) {
        conditions.push(gte(stock.leadTimeDays, params.minLeadTimeDays));
    }

    const orderFn = params.sortOrder === "asc"
        ? sql`${stock.leadTimeDays} asc nulls last`
        : sql`${stock.leadTimeDays} desc nulls last`;

    const rows = await db.select({
        material: stock.material,
        description: stock.description2ForTheMaterialGroup,
        leadTimeDays: stock.leadTimeDays,
        stockInMeters: stock.stockInMeters,
        replenishmentDate: stock.replenishmentDate,
        basicPrice: stock.basicPrice,
    })
        .from(stock)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderFn)
        .limit(params.limit || 20);

    return rows;
}

// 16. Advanced Stock Search with multiple filters
export async function searchStock(params: {
    material?: string;
    colourFamily?: string;
    patternName?: string;
    fabricType?: string;
    loomType?: string;
    dyedType?: string;
    endUse?: string;
    design?: string;
    minStock?: number;
    maxStock?: number;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
}) {
    const conditions = [];

    if (params.material) {
        conditions.push(
            sql`lower(${stock.material}) like ${
                "%" + params.material.toLowerCase() + "%"
            }`,
        );
    }
    if (params.colourFamily) {
        conditions.push(eq(stock.colourFamily, params.colourFamily));
    }
    if (params.patternName) {
        conditions.push(eq(stock.patternName, params.patternName));
    }
    if (params.fabricType) {
        conditions.push(eq(stock.fabricType, params.fabricType));
    }
    if (params.loomType) {
        conditions.push(eq(stock.loomType, params.loomType));
    }
    if (params.dyedType) {
        conditions.push(eq(stock.dyedType, params.dyedType));
    }
    if (params.endUse) {
        conditions.push(eq(stock.endUse, params.endUse));
    }
    if (params.design) {
        conditions.push(eq(stock.ainocularDesign, params.design));
    }
    if (params.minStock !== undefined) {
        conditions.push(sql`${stock.stockInMeters} >= ${params.minStock}`);
    }
    if (params.maxStock !== undefined) {
        conditions.push(sql`${stock.stockInMeters} <= ${params.maxStock}`);
    }
    if (params.minPrice !== undefined) {
        conditions.push(sql`${stock.basicPrice} >= ${params.minPrice}`);
    }
    if (params.maxPrice !== undefined) {
        conditions.push(sql`${stock.basicPrice} <= ${params.maxPrice}`);
    }

    const rows = await db.select()
        .from(stock)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(stock.stockInMeters))
        .limit(params.limit || 50);

    return rows;
}

// 17. List Stock Distinct Values (for filter discovery)
export async function listStockDistinctValues() {
    const [
        fabricTypes,
        loomTypes,
        dyedTypes,
        stockTypes,
        colourFamilies,
        endUses,
        patternNames,
        designs,
    ] = await Promise.all([
        db.selectDistinct({ fabricType: stock.fabricType }).from(stock),
        db.selectDistinct({ loomType: stock.loomType }).from(stock),
        db.selectDistinct({ dyedType: stock.dyedType }).from(stock),
        db.selectDistinct({ stockType: stock.stockType }).from(stock),
        db.selectDistinct({ colourFamily: stock.colourFamily }).from(stock),
        db.selectDistinct({ endUse: stock.endUse }).from(stock),
        db.selectDistinct({ patternName: stock.patternName }).from(stock),
        db.selectDistinct({
            ainocularDesign: stock.ainocularDesign,
            ainocularDesignDescription: stock.ainocularDesignDescription,
        }).from(stock),
    ]);

    return {
        fabricTypes: fabricTypes.map((r) => r.fabricType).filter(Boolean),
        loomTypes: loomTypes.map((r) => r.loomType).filter(Boolean),
        dyedTypes: dyedTypes.map((r) => r.dyedType).filter(Boolean),
        stockTypes: stockTypes.map((r) => r.stockType).filter(Boolean),
        colourFamilies: colourFamilies.map((r) => r.colourFamily).filter(
            Boolean,
        ),
        endUses: endUses.map((r) => r.endUse).filter(Boolean),
        patternNames: patternNames.map((r) => r.patternName).filter(Boolean),
        designs,
    };
}

// 18. Stock Value by Design/Shade (Ainocular categories)
export async function getStockValueByDesign(params: {
    groupBy?: "design" | "shade" | "colour_master";
    limit?: number;
}) {
    const groupBy = params.groupBy || "design";

    const groupColumn = {
        design: stock.ainocularDesign,
        shade: stock.ainocularShade,
        colour_master: stock.colourMaster,
    }[groupBy];

    const rows = await db.select({
        category: groupColumn,
        materialCount: sql<number>`count(*)`,
        totalStockQuantity: sql<
            number
        >`coalesce(sum(${stock.stockInMeters}), 0)`,
        totalStockValue: sql<
            number
        >`coalesce(sum(${stock.stockInMeters} * ${stock.basicPrice}), 0)`,
        avgGsm: sql<number>`coalesce(avg(${stock.gsm}), 0)`,
    })
        .from(stock)
        .groupBy(groupColumn)
        .orderBy(
            desc(
                sql`coalesce(sum(${stock.stockInMeters} * ${stock.basicPrice}), 0)`,
            ),
        )
        .limit(params.limit || 20);

    return rows;
}

// 19. Stock Aging / Urgency Report (based on replenishment date)
export async function getStockAgingReport(params: { limit?: number }) {
    const today = new Date().toISOString().slice(0, 10);

    const rows = await db.select({
        material: stock.material,
        description: stock.description2ForTheMaterialGroup,
        stockInMeters: stock.stockInMeters,
        basicPrice: stock.basicPrice,
        stockValue: sql<number>`${stock.stockInMeters} * ${stock.basicPrice}`,
        replenishmentDate: stock.replenishmentDate,
        leadTimeDays: stock.leadTimeDays,
        daysUntilReplenishment: sql<
            number
        >`${stock.replenishmentDate}::date - ${today}::date`,
        fabricType: stock.fabricType,
        endUse: stock.endUse,
    })
        .from(stock)
        .where(sql`${stock.replenishmentDate} is not null`)
        .orderBy(sql`${stock.replenishmentDate}::date - ${today}::date`)
        .limit(params.limit || 30);

    return rows;
}

// 20. Excess Stock Report (high stock items with low sales velocity)
export async function getExcessStockReport(params: {
    coverageMonthsThreshold?: number; // Items with stock covering more than N months
    limit?: number;
}) {
    const coverageThreshold = params.coverageMonthsThreshold || 6;

    // Get sales velocity over last 6 months
    const velocityDate = new Date();
    velocityDate.setMonth(velocityDate.getMonth() - 6);

    const salesVelocity = await db.select({
        material: invoice.material,
        totalSold: sql<number>`sum(${invoice.billedQuantity})`,
    })
        .from(invoice)
        .where(
            gte(invoice.invoiceDate, velocityDate.toISOString().slice(0, 10)),
        )
        .groupBy(invoice.material);

    const velocityMap = new Map(
        salesVelocity.map((s) => [s.material, Number(s.totalSold || 0)]),
    );

    // Get all stock items
    const stockItems = await db.select().from(stock);

    const excessItems = stockItems
        .map((item) => {
            const currentStock = Number(item.stockInMeters || 0);
            const soldLast6Months = velocityMap.get(item.material) || 0;
            const monthlyVelocity = soldLast6Months / 6;
            const coverageMonths = monthlyVelocity > 0
                ? currentStock / monthlyVelocity
                : (currentStock > 0 ? Infinity : 0);

            return {
                material: item.material,
                description: item.description2ForTheMaterialGroup,
                currentStock,
                stockValue: currentStock * Number(item.basicPrice || 0),
                soldLast6Months,
                monthlyVelocity: monthlyVelocity.toFixed(2),
                coverageMonths: coverageMonths === Infinity
                    ? "No sales"
                    : coverageMonths.toFixed(1),
                fabricType: item.fabricType,
                endUse: item.endUse,
            };
        })
        .filter((item) => {
            const coverage = parseFloat(item.coverageMonths);
            return item.currentStock > 0 &&
                (isNaN(coverage) || coverage >= coverageThreshold);
        })
        .sort((a, b) => b.stockValue - a.stockValue)
        .slice(0, params.limit || 20);

    return {
        coverageThreshold: coverageThreshold,
        excessItems,
    };
}
