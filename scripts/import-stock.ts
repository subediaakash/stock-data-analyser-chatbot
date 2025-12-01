import "dotenv/config";
import path from "node:path";
import * as XLSX from "xlsx";

import { db } from "../drizzle/db";
import { stock } from "../drizzle/schema/stock-schema";

type StockRow = {
    material: string;
    stock_in_meters?: number | string | null;
    replenishment_date?: string | Date | null;
    lead_time_days?: number | string | null;
    basic_price?: number | string | null;
    description_2_for_the_material_group?: string | null;

    stock_type?: string | null;
    loom_type?: string | null;
    dyed_type?: string | null;
    width?: number | string | null;

    quality?: string | null;
    design?: string | null;
    shade_no?: string | null;
    fabric_type?: string | null;

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
    fabric_typ_des?: string | null;
    style?: string | null;

    gsm?: number | string | null;
    vertical_repeat?: number | string | null;
    horizontal_repeat?: number | string | null;
    repeat?: string | null;

    composition?: string | null;
};

function toNumeric(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isNaN(n) ? null : n;
}

function toString(value: unknown) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s === "" ? null : s;
}

async function main() {
    const workbookPath = path.resolve(
        __dirname,
        "../data/Sample_Data_for_Model_updated1(3).xlsx",
    );

    const workbook = XLSX.readFile(workbookPath);

    // Prefer a sheet whose name looks like "stock table" / "stock_table" (case-insensitive)
    const targetSheetName = workbook.SheetNames.find((name) => {
        const normalized = name.toLowerCase().replace(/[\s_]+/g, "");
        return normalized === "stocktable";
    }) ?? workbook.SheetNames[0];

    console.log("Using sheet:", targetSheetName);

    const sheet = workbook.Sheets[targetSheetName];

    if (!sheet) {
        throw new Error("Could not find a valid sheet in workbook");
    }

    const rawRows = XLSX.utils.sheet_to_json<StockRow>(sheet, {
        defval: null,
    });

    if (rawRows.length > 0) {
        console.log(
            "First row keys:",
            Object.keys(rawRows[0] as Record<string, unknown>),
        );
    }

    console.log(`Found ${rawRows.length} rows in stock table sheet`);

    const batchSize = 500;

    for (let i = 0; i < rawRows.length; i += batchSize) {
        const batch = rawRows.slice(i, i + batchSize);

        const values = batch
            .map((row) => {
                const material = toString(row.material);
                if (!material) {
                    return null;
                }

                return {
                    material,
                    stockInMeters: toNumeric(row.stock_in_meters),
                    replenishmentDate: row.replenishment_date
                        ? new Date(row.replenishment_date as string)
                        : null,
                    leadTimeDays: toNumeric(row.lead_time_days),
                    basicPrice: toNumeric(row.basic_price),
                    description2ForTheMaterialGroup: toString(
                        row.description_2_for_the_material_group,
                    ),

                    stockType: toString(row.stock_type),
                    loomType: toString(row.loom_type),
                    dyedType: toString(row.dyed_type),
                    width: toNumeric(row.width),

                    quality: toString(row.quality),
                    design: toString(row.design),
                    shadeNo: toString(row.shade_no),
                    fabricType: toString(row.fabric_type),

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
                    fabricTypeDescription: toString(row.fabric_type_des) ??
                        toString(row.fabric_typ_des),
                    style: toString(row.style),

                    gsm: toNumeric(row.gsm),
                    verticalRepeat: toNumeric(row.vertical_repeat),
                    horizontalRepeat: toNumeric(row.horizontal_repeat),
                    repeat: toString(row.repeat),

                    composition: toString(row.composition),
                };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);

        if (values.length === 0) continue;

        console.log(
            `Inserting rows ${i + 1}-${i + values.length} of ${rawRows.length}`,
        );

        await db.insert(stock).values(values);
    }

    console.log("Import completed successfully");
}

main().catch((err) => {
    console.error("Error importing stock data:", err);
    process.exit(1);
});
