import "dotenv/config";
import path from "node:path";
import * as XLSX from "xlsx";

import { db } from "../drizzle/db";
import { invoice } from "../drizzle/schema/invoice-schema";

type InvoiceRow = {
    sales_organization?: string | null;
    billing_document?: string | null;
    item?: number | string | null;
    Invoice_Date?: string | Date | null;
    billing_type?: string | null;
    plant?: string | null;
    reference?: string | null;
    bill_doc_desc?: string | null;
    document_currency?: string | null;
    bill_to_party?: string | null;
    bill_to_party_code?: string | null;
    bill_to_party_city?: string | null;
    material?: string | null;
    basic_price?: number | string | null;
    billed_quantity?: number | string | null;
    base_unit_of_measure?: string | null;
    net_amount_inr?: number | string | null;
    discount_amount?: number | string | null;
    taxable_amt?: number | string | null;
    total_gst_amt?: number | string | null;
    gross_amt_fc?: number | string | null;
    tcs_amt?: number | string | null;
    gross_amount?: number | string | null;
    document_number?: string | null;
    fiscal_year?: number | string | null;
    document_type?: string | null;
    no_of_pack?: number | string | null;
    description_2_for_the_material_group?: string | null;
    cust_group_desc?: string | null;
    profit_center?: string | null;
    ship_to_party_city?: string | null;
    commission?: number | string | null;
    air_freight?: number | string | null;
    billing_qty_in_sku?: number | string | null;
    agent_code?: string | null;
    agent_name?: string | null;
    agent_state?: string | null;
    broker_code?: string | null;
    broker_name?: string | null;
    stock_type?: string | null;
    loom_type?: string | null;
    dyed_type?: string | null;
    width?: number | string | null;
    quality?: string | null;
    design?: string | null;
    shade_no?: string | null;
    fabric_type?: string | null;
    shade_name?: string | null;
    region_zone?: string | null;
    book_name?: string | null;
    book_reference_no?: string | null;
    Ainocular_shade?: string | null;
    Ainocular_shade_description?: string | null;
    Ainocular_design?: string | null;
    Ainocular_design_description?: string | null;
    colour_family?: string | null;
    colour_master?: string | null;
    pattern_scale?: string | null;
    pattern_name?: string | null;
    end_use?: string | null;
    fabric_type_des?: string | null;
    style?: string | null;
    gsm?: number | string | null;
    vertical_repeat?: number | string | null;
    horizontal_repeat?: number | string | null;
    composition?: string | null;
};

function toNumeric(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isNaN(n) ? null : n;
}

function toInt(value: number | string | null | undefined) {
    const n = toNumeric(value);
    return n === null ? null : Math.trunc(n);
}

function toString(value: unknown) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s === "" ? null : s;
}

function toDate(value: string | Date | number | null | undefined) {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) return value;
    // XLSX may give dates as Excel serials or ISO-like strings
    if (typeof value === "number") {
        const date = XLSX.SSF.parse_date_code(value);
        if (!date) return null;
        return new Date(
            Date.UTC(
                date.y,
                (date.m || 1) - 1,
                date.d || 1,
                date.H || 0,
                date.M || 0,
                date.S || 0,
            ),
        );
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
    const workbookPath = path.resolve(
        __dirname,
        "../data/Sample_Data_for_Model_updated1(3).xlsx",
    );

    const workbook = XLSX.readFile(workbookPath);

    // Target sheet: "Sample_Data_for_Model_updated1" (case-insensitive)
    const targetSheetName = workbook.SheetNames.find((name) => {
        const normalized = name.toLowerCase().replace(/[\s_]+/g, "");
        return normalized === "sampledataformodelupdated1";
    }) ?? workbook.SheetNames[0];

    console.log("Using sheet:", targetSheetName);

    const sheet = workbook.Sheets[targetSheetName];

    if (!sheet) {
        throw new Error(
            "Could not find 'Sample_Data_for_Model_updated1' sheet",
        );
    }

    const rawRows = XLSX.utils.sheet_to_json<InvoiceRow>(sheet, {
        defval: null,
    });

    if (rawRows.length > 0) {
        console.log(
            "First row keys:",
            Object.keys(rawRows[0] as Record<string, unknown>),
        );
    }

    console.log(`Found ${rawRows.length} rows in invoice sheet`);

    const batchSize = 500;

    for (let i = 0; i < rawRows.length; i += batchSize) {
        const batch = rawRows.slice(i, i + batchSize);

        const values = batch
            .map((row) => {
                const billingDocument = toString(row.billing_document);
                const item = toInt(row.item);

                // Require at least a billing document + item to consider it a valid row
                if (!billingDocument || item === null) {
                    return null;
                }

                return {
                    salesOrganization: toString(row.sales_organization),
                    billingDocument,
                    item,
                    invoiceDate: toDate(row.Invoice_Date ?? null),
                    billingType: toString(row.billing_type),
                    plant: toString(row.plant),
                    reference: toString(row.reference),
                    billDocDesc: toString(row.bill_doc_desc),
                    documentCurrency: toString(row.document_currency),

                    billToParty: toString(row.bill_to_party),
                    billToPartyCode: toString(row.bill_to_party_code),
                    billToPartyCity: toString(row.bill_to_party_city),

                    material: toString(row.material),
                    basicPrice: toNumeric(row.basic_price),
                    billedQuantity: toNumeric(row.billed_quantity),
                    baseUnitOfMeasure: toString(row.base_unit_of_measure),

                    netAmountInr: toNumeric(row.net_amount_inr),
                    discountAmount: toNumeric(row.discount_amount),
                    taxableAmount: toNumeric(row.taxable_amt),
                    totalGstAmount: toNumeric(row.total_gst_amt),
                    grossAmountFc: toNumeric(row.gross_amt_fc),
                    tcsAmount: toNumeric(row.tcs_amt),
                    grossAmount: toNumeric(row.gross_amount),

                    documentNumber: toString(row.document_number),
                    fiscalYear: toInt(row.fiscal_year),
                    documentType: toString(row.document_type),
                    numberOfPack: toInt(row.no_of_pack),

                    description2ForTheMaterialGroup: toString(
                        row.description_2_for_the_material_group,
                    ),
                    customerGroupDesc: toString(row.cust_group_desc),
                    profitCenter: toString(row.profit_center),

                    shipToPartyCity: toString(row.ship_to_party_city),
                    commission: toNumeric(row.commission),
                    airFreight: toNumeric(row.air_freight),
                    billingQtyInSku: toNumeric(row.billing_qty_in_sku),

                    agentCode: toString(row.agent_code),
                    agentName: toString(row.agent_name),
                    agentState: toString(row.agent_state),
                    brokerCode: toString(row.broker_code),
                    brokerName: toString(row.broker_name),

                    stockType: toString(row.stock_type),
                    loomType: toString(row.loom_type),
                    dyedType: toString(row.dyed_type),
                    width: toNumeric(row.width),
                    quality: toString(row.quality),
                    design: toString(row.design),
                    shadeNo: toString(row.shade_no),
                    fabricType: toString(row.fabric_type),
                    shadeName: toString(row.shade_name),
                    regionZone: toString(row.region_zone),
                    bookName: toString(row.book_name),
                    bookReferenceNo: toString(row.book_reference_no),

                    ainocularShade: toString(row.Ainocular_shade),
                    ainocularShadeDescription: toString(
                        row.Ainocular_shade_description,
                    ),
                    ainocularDesign: toString(row.Ainocular_design),
                    ainocularDesignDescription: toString(
                        row.Ainocular_design_description,
                    ),

                    colourFamily: toString(row.colour_family),
                    colourMaster: toString(row.colour_master),
                    patternScale: toString(row.pattern_scale),
                    patternName: toString(row.pattern_name),

                    endUse: toString(row.end_use),
                    fabricTypeDescription: toString(row.fabric_type_des),
                    style: toString(row.style),

                    gsm: toNumeric(row.gsm),
                    verticalRepeat: toNumeric(row.vertical_repeat),
                    horizontalRepeat: toNumeric(row.horizontal_repeat),

                    composition: toString(row.composition),
                };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);

        if (values.length === 0) continue;

        console.log(
            `Inserting rows ${i + 1}-${i + values.length} of ${rawRows.length}`,
        );

        // Cast to unknown first to avoid relying directly on `any` while still
        // bypassing the strict type inference issues for this bulk insert.
        await db.insert(invoice).values(
            values as unknown as typeof invoice.$inferInsert[],
        );
    }

    console.log("Invoice import completed successfully");
}

main().catch((err) => {
    console.error("Error importing invoice data:", err);
    process.exit(1);
});
