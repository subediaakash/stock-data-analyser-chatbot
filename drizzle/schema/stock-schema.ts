import { date, integer, numeric, pgTable, text } from "drizzle-orm/pg-core";

export const stock = pgTable("stock", {
    material: text("material").primaryKey(),

    stockInMeters: numeric("stock_in_meters"),
    replenishmentDate: date("replenishment_date"),
    leadTimeDays: integer("lead_time_days"),
    basicPrice: numeric("basic_price"),
    description2ForTheMaterialGroup: text(
        "description_2_for_the_material_group",
    ),

    stockType: text("stock_type"),
    loomType: text("loom_type"),
    dyedType: text("dyed_type"),
    width: numeric("width"),

    quality: text("quality"),
    design: text("design"),
    shadeNo: text("shade_no"),
    fabricType: text("fabric_type"),

    bookName: text("book_name"),
    bookReferenceNo: text("book_reference_no"),

    ainocularShade: text("ainocular_shade"),
    ainocularShadeDescription: text("ainocular_shade_description"),
    ainocularDesign: text("ainocular_design"),
    ainocularDesignDescription: text("ainocular_design_description"),

    colourFamily: text("colour_family"),
    colourMaster: text("colour_master"),

    patternScale: text("pattern_scale"),
    patternName: text("pattern_name"),

    endUse: text("end_use"),
    fabricTypeDescription: text("fabric_type_description"),
    style: text("style"),

    // GSM values in the sheet contain decimals (e.g. 262.85), so we store them as numeric
    gsm: numeric("gsm"),
    verticalRepeat: numeric("vertical_repeat"),
    horizontalRepeat: numeric("horizontal_repeat"),
    repeat: text("repeat"),

    composition: text("composition"),
});
