import {
    date,
    integer,
    numeric,
    pgTable,
    serial,
    text,
} from "drizzle-orm/pg-core";

export const invoice = pgTable("invoice", {
    id: serial("id").primaryKey(),

    // Basic invoice identifiers
    salesOrganization: text("sales_organization"),
    billingDocument: text("billing_document"),
    item: integer("item"),
    invoiceDate: date("invoice_date"),
    billingType: text("billing_type"),
    plant: text("plant"),
    reference: text("reference"),
    billDocDesc: text("bill_doc_desc"),
    documentCurrency: text("document_currency"),

    // Customer / bill-to details
    billToParty: text("bill_to_party"),
    billToPartyCode: text("bill_to_party_code"),
    billToPartyCity: text("bill_to_party_city"),

    // Material and pricing
    material: text("material"),
    basicPrice: numeric("basic_price"),
    billedQuantity: numeric("billed_quantity"),
    baseUnitOfMeasure: text("base_unit_of_measure"),

    // Amounts (currency and tax)
    netAmountInr: numeric("net_amount_inr"),
    discountAmount: numeric("discount_amount"),
    taxableAmount: numeric("taxable_amt"),
    totalGstAmount: numeric("total_gst_amt"),
    grossAmountFc: numeric("gross_amt_fc"),
    tcsAmount: numeric("tcs_amt"),
    grossAmount: numeric("gross_amount"),
    accNetAmountInr: numeric("acc_net_amount_inr"),

    // Document meta
    documentNumber: text("document_number"),
    fiscalYear: integer("fiscal_year"),
    documentType: text("document_type"),
    numberOfPack: integer("no_of_pack"),

    // Material group / customer group / profit center
    description2ForTheMaterialGroup: text(
        "description_2_for_the_material_group",
    ),
    customerGroupDesc: text("cust_group_desc"),
    profitCenter: text("profit_center"),

    // Shipping / logistics
    shipToPartyCity: text("ship_to_party_city"),
    commission: numeric("commission"),
    airFreight: numeric("air_freight"),
    billingQtyInSku: numeric("billing_qty_in_sku"),

    // Agent / broker info
    agentCode: text("agent_code"),
    agentName: text("agent_name"),
    agentState: text("agent_state"),
    brokerCode: text("broker_code"),
    brokerName: text("broker_name"),

    // Stock / fabric attributes
    stockType: text("stock_type"),
    loomType: text("loom_type"),
    dyedType: text("dyed_type"),
    width: numeric("width"),
    quality: text("quality"),
    design: text("design"),
    shadeNo: text("shade_no"),
    fabricType: text("fabric_type"),
    shadeName: text("shade_name"),
    regionZone: text("region_zone"),
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
    fabricTypeDescription: text("fabric_type_des"),
    style: text("style"),

    gsm: numeric("gsm"),
    verticalRepeat: numeric("vertical_repeat"),
    horizontalRepeat: numeric("horizontal_repeat"),

    composition: text("composition"),
});
