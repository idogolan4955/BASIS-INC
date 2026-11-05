// Reference data every BASIS module relies on, and the seeding of it. Shared
// by the emulator seed and the production seed; every step is idempotent, so
// running it again adds what is missing and changes nothing that exists.

import catalog from "../../packages/shared/src/launch-catalog.json" with { type: "json" };
import development from "../../packages/shared/src/development-catalog.json" with { type: "json" };

/** Binds the seed steps to a Data Connect executor. */
export function seeder(dc) {
  async function gql(query, variables) {
    const result = await dc.executeGraphql(query, { variables });
    if (result.errors?.length)
      throw new Error(result.errors.map((e) => e.message).join("; "));
    return result.data;
  }

  /** Creates or refreshes the owner's account, role claim and User row. A password is set only when given. */
  async function seedOwner(auth, owner) {
    const { users } = await gql(
      `query ($email: String!) { users(where: { email: { eq: $email } }, limit: 1) { uid } }`,
      { email: owner.email },
    );
    const storedUid = users[0]?.uid;
    let user = await auth.getUserByEmail(owner.email).catch(() => null);
    if (user && storedUid && user.uid !== storedUid && owner.recreate) {
      await auth.deleteUser(user.uid);
      user = null;
    }
    if (!user) {
      user = await auth.createUser({
        ...(storedUid ? { uid: storedUid } : {}),
        email: owner.email,
        ...(owner.password ? { password: owner.password } : {}),
        displayName: owner.name,
        emailVerified: true,
      });
    }
    await auth.setCustomUserClaims(user.uid, { role: "owner" });
    await gql(
      `mutation SeedOwner($uid: String!, $email: String!, $name: String!) {
        user_upsert(data: { uid: $uid, email: $email, name: $name, role: owner, principalType: staff, status: active })
      }`,
      { uid: user.uid, email: owner.email, name: owner.name },
    );
    return user.uid;
  }

  const COUNTRIES = [
    ["CN", "China", "Asia"],
    ["IL", "Israel", "Middle East"],
    ["US", "United States", "North America"],
    ["GB", "United Kingdom", "Europe"],
    ["NL", "Netherlands", "Europe"],
    ["IT", "Italy", "Europe"],
    ["FR", "France", "Europe"],
    ["ES", "Spain", "Europe"],
    ["DE", "Germany", "Europe"],
    ["AU", "Australia", "Oceania"],
  ];
  const CURRENCIES = [
    ["USD", "US dollar", 2],
    ["EUR", "Euro", 2],
    ["CNY", "Chinese yuan", 2],
    ["GBP", "Pound sterling", 2],
    ["ILS", "Israeli new shekel", 2],
  ];
  const UOMS = [
    ["m", "Metre", "length", "1"],
    ["yd", "Yard", "length", "0.9144"],
    ["kg", "Kilogram", "mass", "1"],
    ["pcs", "Piece", "count", "1"],
    ["roll", "Roll", "count", "1"],
  ];
  const INCOTERMS = ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"].map(
    (code) => [code, code, 2020],
  );
  const INCOTERM_NAMES = {
    EXW: "Ex Works",
    FCA: "Free Carrier",
    FOB: "Free On Board",
    CFR: "Cost and Freight",
    CIF: "Cost, Insurance and Freight",
    DAP: "Delivered at Place",
    DDP: "Delivered Duty Paid",
  };

  async function seedReference() {
    for (const [code, name, region] of COUNTRIES) {
      await gql(
        `mutation ($code: String!, $name: String!, $region: String) { country_upsert(data: { code: $code, name: $name, region: $region }) }`,
        { code, name, region },
      );
    }
    for (const [code, name, minorUnits] of CURRENCIES) {
      await gql(
        `mutation ($code: String!, $name: String!, $minorUnits: Int!) { currency_upsert(data: { code: $code, name: $name, minorUnits: $minorUnits }) }`,
        { code, name, minorUnits },
      );
    }
    for (const [code, name, dimension, toCanonical] of UOMS) {
      await gql(
        `mutation ($code: String!, $name: String!, $dimension: UomDimension!, $toCanonical: String!) { uom_upsert(data: { code: $code, name: $name, dimension: $dimension, toCanonical: $toCanonical }) }`,
        { code, name, dimension, toCanonical },
      );
    }
    for (const [code, , version] of INCOTERMS) {
      await gql(
        `mutation ($code: String!, $name: String!, $version: Int!) { incoterm_upsert(data: { code: $code, name: $name, version: $version }) }`,
        { code, name: INCOTERM_NAMES[code], version },
      );
    }
    const year = new Date().getFullYear();
    // Sequences start at 1 once and are never reset: a re-seed must not hand
    // out a number that is already taken.
    for (const prefix of [
      "PO",
      "RUN",
      "INS",
      "CAR",
      "SHP",
      "QTN",
      "RFQ",
      "QUO",
      "SO",
      "SMP",
      "LOT",
      "CTN",
      "PLT",
      "INQ",
      "RCV",
    ]) {
      const { numberSequence } = await gql(
        `query ($prefix: String!, $year: Int!) { numberSequence(key: { prefix: $prefix, year: $year }) { nextValue } }`,
        { prefix, year },
      );
      if (!numberSequence)
        await gql(
          `mutation ($prefix: String!, $year: Int!) { numberSequence_insert(data: { prefix: $prefix, year: $year, nextValue: 1 }) }`,
          { prefix, year },
        );
    }
  }

  // The launch range from the brand booklet. SKUs are created only when asked
  // (the emulators want them; in production an item's shades are chosen in
  // the platform), and start in development: shade availability is confirmed
  // per production standard, not assumed.
  async function seedCatalog({ withSkus } = {}) {
    for (const putUp of catalog.putUps) {
      await gql(
        `mutation ($code: String!, $name: String!, $rollLengthM: Int!, $widthCm: Int!, $core: String, $wrap: String, $rollsPerCarton: Int) {
      putUp_upsert(data: { code: $code, name: $name, rollLengthM: $rollLengthM, widthCm: $widthCm, core: $core, wrap: $wrap, rollsPerCarton: $rollsPerCarton }) }`,
        putUp,
      );
    }
    for (const collection of catalog.shadeCollections) {
      await gql(
        `mutation ($code: String!, $name: String!, $sort: Int!) { shadeCollection_upsert(data: { code: $code, name: $name, sort: $sort }) }`,
        collection,
      );
    }
    for (const shade of catalog.shades) {
      await gql(
        `mutation ($code: String!, $collectionCode: String, $name: String!, $slug: String!, $hex: String, $sort: Int!) {
      shade_upsert(data: { code: $code, collectionCode: $collectionCode, name: $name, slug: $slug, hex: $hex, sort: $sort, status: active }) }`,
        {
          code: shade.code,
          collectionCode: shade.collection,
          name: shade.name,
          slug: shade.slug,
          hex: shade.hex,
          sort: shade.sort,
        },
      );
    }
    for (const family of catalog.families) {
      await gql(
        `mutation ($code: String!, $name: String!, $slug: String!, $description: String, $specSchema: Any, $sort: Int!) {
      fabricFamily_upsert(data: { code: $code, name: $name, slug: $slug, description: $description, specSchema: $specSchema, sort: $sort }) }`,
        family,
      );
    }
    for (const product of catalog.products) {
      await gql(
        `mutation ($code: String!, $familyCode: String!, $index: Int!, $name: String!, $slug: String!, $tagline: String, $description: String, $specs: Any) {
      product_upsert(data: { code: $code, familyCode: $familyCode, index: $index, name: $name, slug: $slug, tagline: $tagline, description: $description, specs: $specs, status: active, isPublic: true }) }`,
        {
          code: product.code,
          familyCode: product.family,
          index: product.index,
          name: product.name,
          slug: product.slug,
          tagline: product.tagline,
          description: product.description,
          specs: product.specs,
        },
      );
    }
    const variantIds = {};
    for (const variant of catalog.variants) {
      const fullCode = `${variant.product}-${variant.code}`;
      const existing = await gql(
        `query ($fullCode: String!) { productVariants(where: { fullCode: { eq: $fullCode } }, limit: 1) { id } }`,
        { fullCode },
      );
      let id = existing.productVariants[0]?.id;
      if (!id) {
        const inserted = await gql(
          `mutation ($productCode: String!, $fullCode: String!, $code: String!, $name: String!, $widthCm: Int, $gsm: Int) {
        productVariant_insert(data: { productCode: $productCode, fullCode: $fullCode, code: $code, name: $name, widthCm: $widthCm, gsm: $gsm, status: active, sort: 1 }) }`,
          {
            productCode: variant.product,
            fullCode,
            code: variant.code,
            name: variant.name,
            widthCm: variant.widthCm,
            gsm: variant.gsm ?? null,
          },
        );
        id = inserted.productVariant_insert.id;
      }
      variantIds[fullCode] = id;
    }
    let skus = 0;
    if (!withSkus) return skus;
    for (const variant of catalog.variants) {
      for (const shade of catalog.shades) {
        const code = `${variant.product}-${variant.code}-${shade.code}`;
        await gql(
          `mutation ($code: String!, $productCode: String!, $variantId: UUID!, $shadeCode: String!, $putUpCode: String!) {
        sku_upsert(data: { code: $code, productCode: $productCode, variantId: $variantId, shadeCode: $shadeCode, putUpCode: $putUpCode, salesUom: "m", status: development, isPublic: false, rollTracking: true }) }`,
          {
            code,
            productCode: variant.product,
            variantId: variantIds[`${variant.product}-${variant.code}`],
            shadeCode: shade.code,
            putUpCode: catalog.putUps[0].code,
          },
        );
        skus += 1;
      }
    }
    return skus;
  }

  // Production processes per family. Durations are working assumptions until
  // a supplier's real lead times replace them on its own template.
  const TEMPLATES = [
    {
      name: "Warp-knit mesh",
      family: "MSH",
      steps: [
        ["yarn", "Yarn sourcing", "materials", 7, null, "none"],
        ["knit", "Knitting", "production", 10, "yarn", "none"],
        ["labdip", "Lab dip approval", "colour", 3, "yarn", "approval"],
        ["dye", "Dyeing", "production", 7, "knit", "none"],
        ["finish", "Finishing", "production", 4, "dye", "none"],
        ["inspect", "Inspection", "quality", 2, "finish", "inspection"],
        ["pack", "Packing", "logistics", 2, "inspect", "none"],
      ],
    },
    {
      name: "Woven lining",
      family: "LIN",
      steps: [
        ["yarn", "Yarn sourcing", "materials", 5, null, "none"],
        ["weave", "Weaving", "production", 10, "yarn", "none"],
        ["labdip", "Lab dip approval", "colour", 3, "yarn", "approval"],
        ["dye", "Dyeing", "production", 7, "weave", "none"],
        ["finish", "Finishing", "production", 3, "dye", "none"],
        ["inspect", "Inspection", "quality", 2, "finish", "inspection"],
        ["pack", "Packing", "logistics", 2, "inspect", "none"],
      ],
    },
    {
      name: "Bridal tulle",
      family: "TUL",
      steps: [
        ["yarn", "Yarn sourcing", "materials", 5, null, "none"],
        ["knit", "Knitting", "production", 8, "yarn", "none"],
        ["dye", "Dyeing", "production", 6, "knit", "none"],
        ["finish", "Finishing", "production", 4, "dye", "none"],
        ["inspect", "Inspection", "quality", 2, "finish", "inspection"],
        ["pack", "Packing", "logistics", 2, "inspect", "none"],
      ],
    },
  ];

  // Inspection checklists. Thresholds and tolerances are working assumptions
  // until the production standards fix them per fabric.
  const INSPECTION_TEMPLATES = [
    {
      name: "Pre-shipment, mesh and tulle",
      type: "pre_shipment",
      family: null,
      sampling: "10% of rolls, at least 3, full length",
      maxPoints: 20,
      maxDeltaE: 100,
      checks: [
        [
          "shade_std",
          "shade",
          "Shade against the standard",
          "Spectrophotometer, D65, three readings per roll",
          "measurement",
          "dE",
          0,
          0,
          1000,
          true,
        ],
        [
          "shade_lot",
          "shade",
          "Shade within the lot",
          "Roll to roll, D65",
          "pass_fail",
          null,
          null,
          null,
          null,
          false,
        ],
        [
          "width",
          "dimension",
          "Usable width",
          "Measured at three points per roll",
          "measurement",
          "cm",
          158000,
          2000,
          5000,
          true,
        ],
        [
          "gsm",
          "dimension",
          "Weight",
          "Cut and weighed, three samples",
          "measurement",
          "gsm",
          null,
          null,
          null,
          false,
        ],
        [
          "length",
          "quantity",
          "Roll length against the label",
          "Measured on the table",
          "measurement",
          "%",
          100000,
          2000,
          5000,
          false,
        ],
        [
          "stretch",
          "dimension",
          "Stretch and recovery",
          "Against the specification",
          "pass_fail",
          null,
          null,
          null,
          null,
          true,
        ],
        [
          "defects",
          "defect",
          "Defects per roll",
          "4-point system, continuous",
          "count",
          "pts",
          null,
          null,
          null,
          false,
        ],
        [
          "rolls",
          "quantity",
          "Rolls and metres against the packing list",
          "Counted",
          "pass_fail",
          null,
          null,
          null,
          null,
          true,
        ],
        [
          "packaging",
          "packaging",
          "Wrap, core and end-cap labels",
          "Shade, product code, lot, width, length, origin present",
          "pass_fail",
          null,
          null,
          null,
          null,
          false,
        ],
        [
          "cartons",
          "packaging",
          "Cartons and marks",
          "Against the packing list",
          "pass_fail",
          null,
          null,
          null,
          null,
          false,
        ],
      ],
    },
    {
      name: "Lab dip",
      type: "lab_dip",
      family: null,
      sampling: "One dip card per shade",
      maxPoints: null,
      maxDeltaE: 80,
      checks: [
        [
          "shade_std",
          "shade",
          "Shade against the standard",
          "Spectrophotometer, D65",
          "measurement",
          "dE",
          0,
          0,
          800,
          true,
        ],
        [
          "visual",
          "shade",
          "Visual match in daylight",
          "Light box D65, then daylight",
          "pass_fail",
          null,
          null,
          null,
          null,
          true,
        ],
        [
          "hand",
          "dimension",
          "Hand feel after dyeing",
          "Against the approved standard",
          "pass_fail",
          null,
          null,
          null,
          null,
          false,
        ],
      ],
    },
    {
      name: "Receiving",
      type: "receiving",
      family: null,
      sampling: "Every carton opened; 10% of rolls measured",
      maxPoints: null,
      maxDeltaE: null,
      checks: [
        [
          "cartons",
          "packaging",
          "Cartons intact and marks legible",
          "Visual",
          "pass_fail",
          null,
          null,
          null,
          null,
          false,
        ],
        [
          "count",
          "quantity",
          "Rolls against the packing list",
          "Counted",
          "pass_fail",
          null,
          null,
          null,
          null,
          true,
        ],
        [
          "labels",
          "packaging",
          "Roll labels match the lot",
          "Shade, product code, lot",
          "pass_fail",
          null,
          null,
          null,
          null,
          true,
        ],
        [
          "damage",
          "defect",
          "Transit damage",
          "Visual, every roll",
          "count",
          "pts",
          null,
          null,
          null,
          false,
        ],
      ],
    },
  ];

  async function seedInspectionTemplates() {
    for (const template of INSPECTION_TEMPLATES) {
      const existing = await gql(
        `query ($name: String!) { inspectionTemplates(where: { name: { eq: $name } }, limit: 1) { id } }`,
        { name: template.name },
      );
      if (existing.inspectionTemplates[0]) continue;
      const inserted = await gql(
        `mutation ($name: String!, $type: InspectionType!, $sampling: String, $maxPoints: Int, $maxDeltaE: Int) {
      inspectionTemplate_insert(data: { name: $name, type: $type, isDefault: true, samplingRule: $sampling, maxDefectPointsPer100m: $maxPoints, maxDeltaE: $maxDeltaE }) }`,
        {
          name: template.name,
          type: template.type,
          sampling: template.sampling,
          maxPoints: template.maxPoints,
          maxDeltaE: template.maxDeltaE,
        },
      );
      const id = inserted.inspectionTemplate_insert.id;
      let sequence = 1;
      for (const [
        key,
        category,
        parameter,
        method,
        kind,
        unit,
        expected,
        minus,
        plus,
        critical,
      ] of template.checks) {
        await gql(
          `mutation ($id: UUID!, $key: String!, $sequence: Int!, $category: CheckCategory!, $parameter: String!, $method: String, $kind: CheckKind!, $unit: String, $expected: Int64, $minus: Int64, $plus: Int64, $critical: Boolean!) {
        inspectionTemplateCheck_insert(data: { templateId: $id, key: $key, sequence: $sequence, category: $category, parameter: $parameter, method: $method, kind: $kind, unit: $unit, expected: $expected, toleranceMinus: $minus, tolerancePlus: $plus, isCritical: $critical }) }`,
          {
            id,
            key,
            sequence,
            category,
            parameter,
            method,
            kind,
            unit,
            expected: expected === null ? null : String(expected),
            minus: minus === null ? null : String(minus),
            plus: plus === null ? null : String(plus),
            critical,
          },
        );
        sequence += 1;
      }
    }
  }

  async function seedTemplates() {
    for (const template of TEMPLATES) {
      const existing = await gql(
        `query ($name: String!) { processTemplates(where: { name: { eq: $name } }, limit: 1) { id } }`,
        { name: template.name },
      );
      if (existing.processTemplates[0]) continue;
      const inserted = await gql(
        `mutation ($name: String!, $family: String!) { processTemplate_insert(data: { name: $name, familyCode: $family, isDefault: true }) }`,
        { name: template.name, family: template.family },
      );
      const id = inserted.processTemplate_insert.id;
      let sequence = 1;
      for (const [
        key,
        name,
        category,
        durationDays,
        dependsOnKey,
        gate,
      ] of template.steps) {
        await gql(
          `mutation ($id: UUID!, $key: String!, $name: String!, $category: String!, $sequence: Int!, $duration: Int!, $dependsOnKey: String, $gate: MilestoneGate!) {
        processTemplateStep_insert(data: { templateId: $id, key: $key, name: $name, category: $category, sequence: $sequence, durationDays: $duration, dependsOnKey: $dependsOnKey, gate: $gate }) }`,
          {
            id,
            key,
            name,
            category,
            sequence,
            duration: durationDays,
            dependsOnKey,
            gate,
          },
        );
        sequence += 1;
      }
    }
  }

  // Places goods pass through, and what a shipment must carry. Ports and
  // airports carry their UN/LOCODE or IATA code; the warehouse is BASIS's own.
  const PLACES = [
    ["port", "Port of Ningbo", "Ningbo", "CN", "CNNGB", "Asia/Shanghai"],
    ["port", "Port of Shanghai", "Shanghai", "CN", "CNSHA", "Asia/Shanghai"],
    ["airport", "Shanghai Pudong", "Shanghai", "CN", "PVG", "Asia/Shanghai"],
    [
      "consolidation_hub",
      "Ningbo consolidation hub",
      "Ningbo",
      "CN",
      "",
      "Asia/Shanghai",
    ],
    ["port", "Port of Ashdod", "Ashdod", "IL", "ILASH", "Asia/Jerusalem"],
    ["port", "Port of Haifa", "Haifa", "IL", "ILHFA", "Asia/Jerusalem"],
    ["airport", "Ben Gurion", "Tel Aviv", "IL", "TLV", "Asia/Jerusalem"],
    [
      "port",
      "Port of Rotterdam",
      "Rotterdam",
      "NL",
      "NLRTM",
      "Europe/Amsterdam",
    ],
    ["port", "Port of Genoa", "Genoa", "IT", "ITGOA", "Europe/Rome"],
    ["airport", "JFK", "New York", "US", "JFK", "America/New_York"],
    ["warehouse", "BASIS warehouse", "Tel Aviv", "IL", "", "Asia/Jerusalem"],
  ];
  const DOCUMENT_REQUIREMENTS = [
    // mode, flow, destination country, document kind, days before departure
    [null, "inbound", null, "commercial_invoice", 2],
    [null, "inbound", null, "packing_list", 2],
    ["sea", null, null, "bill_of_lading", 0],
    ["air", null, null, "air_waybill", 0],
    [null, null, "IL", "certificate_of_origin", 3],
  ];
  async function seedLogistics() {
    for (const [type, name, city, country, locationCode, timeZone] of PLACES) {
      const existing = await gql(
        `query ($name: String!) { locations(where: { name: { eq: $name }, companyId: { isNull: true } }, limit: 1) { id } }`,
        { name },
      );
      if (existing.locations[0]) continue;
      await gql(
        `mutation ($type: LocationType!, $name: String!, $city: String!, $country: String!, $code: String, $tz: String!) {
      location_insert(data: { type: $type, name: $name, city: $city, countryCode: $country, locationCode: $code, timeZone: $tz }) }`,
        { type, name, city, country, code: locationCode || null, tz: timeZone },
      );
    }
    // The warehouse as a stock location, the default place goods are received into.
    const { stockLocations } = await gql(
      `query { stockLocations(where: { kind: { eq: physical } }, limit: 1) { id } }`,
    );
    if (!stockLocations[0]) {
      const { locations } = await gql(
        `query { locations(where: { name: { eq: "BASIS warehouse" } }, limit: 1) { id } }`,
      );
      await gql(
        `mutation ($placeId: UUID) { stockLocation_insert(data: { name: "BASIS warehouse", kind: physical, placeId: $placeId, isDefault: true }) }`,
        { placeId: locations[0]?.id ?? null },
      );
    }
    const { documentRequirements } = await gql(
      `query { documentRequirements(limit: 200) { documentKind mode flow destinationCountry { code } } }`,
    );
    for (const [
      mode,
      flow,
      country,
      documentKind,
      daysBeforeEtd,
    ] of DOCUMENT_REQUIREMENTS) {
      if (
        documentRequirements.some(
          (rule) =>
            rule.documentKind === documentKind &&
            (rule.mode ?? null) === mode &&
            (rule.flow ?? null) === flow &&
            (rule.destinationCountry?.code ?? null) === country,
        )
      )
        continue;
      await gql(
        `mutation ($mode: TransportMode, $flow: ShipmentFlow, $country: String, $kind: DocumentKind!, $days: Int!) {
      documentRequirement_insert(data: { mode: $mode, flow: $flow, destinationCountryCode: $country, documentKind: $kind, daysBeforeEtd: $days }) }`,
        { mode, flow, country, kind: documentKind, days: daysBeforeEtd },
      );
    }
  }

  // The brand's consumer line from the owner's concept boards (module 18).
  // Categories and collections are added when missing; an existing category
  // only gains the specification fields it lacks. A dossier is opened once,
  // at the idea stage, under the next DEV number: its stage moves through
  // the gate in the platform, never here. Nothing the team changed is
  // overwritten by a second run.
  const slugOf = (name) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  async function nextDevelopmentNumber() {
    const year = new Date().getFullYear();
    const { numberSequence } = await gql(
      `query ($year: Int!) { numberSequence(key: { prefix: "DEV", year: $year }) { nextValue } }`,
      { year },
    );
    const sequence = numberSequence?.nextValue ?? 1;
    await gql(
      `mutation ($year: Int!, $next: Int!) { numberSequence_upsert(data: { prefix: "DEV", year: $year, nextValue: $next }) }`,
      { year, next: sequence + 1 },
    );
    return `DEV-${String(year).slice(-2)}-${String(sequence).padStart(4, "0")}`;
  }

  async function seedDevelopment(ownerUid) {
    const added = { categories: 0, collections: 0, products: 0 };
    for (const category of development.categories) {
      const { productCategory } = await gql(
        `query ($code: String!) { productCategory(key: { code: $code }) { specSchema } }`,
        { code: category.code },
      );
      if (!productCategory) {
        await gql(
          `mutation ($code: String!, $name: String!, $slug: String!, $description: String, $parentCode: String, $specSchema: Any, $sort: Int!) {
        productCategory_insert(data: { code: $code, name: $name, slug: $slug, description: $description, parentCode: $parentCode, specSchema: $specSchema, sort: $sort, status: active }) }`,
          {
            code: category.code,
            name: category.name,
            slug: slugOf(category.name),
            description: category.description || null,
            parentCode: category.parent,
            specSchema: category.specSchema,
            sort: category.sort,
          },
        );
        added.categories += 1;
        continue;
      }
      const current = Array.isArray(productCategory.specSchema)
        ? productCategory.specSchema
        : [];
      const missing = category.specSchema.filter(
        (field) => !current.some((existing) => existing.key === field.key),
      );
      if (missing.length > 0)
        await gql(
          `mutation ($code: String!, $specSchema: Any) { productCategory_update(key: { code: $code }, data: { specSchema: $specSchema }) }`,
          { code: category.code, specSchema: [...current, ...missing] },
        );
    }
    for (const collection of development.collections) {
      const existing = await gql(
        `query ($code: String!) { collection(key: { code: $code }) { code } }`,
        { code: collection.code },
      );
      if (existing.collection) continue;
      await gql(
        `mutation ($code: String!, $name: String!, $season: String, $year: Int, $theme: String, $targetLaunch: Date, $status: CollectionStatus!) {
      collection_insert(data: { code: $code, name: $name, season: $season, year: $year, theme: $theme, targetLaunch: $targetLaunch, status: $status }) }`,
        {
          code: collection.code,
          name: collection.name,
          season: collection.season || null,
          year: collection.year,
          theme: collection.theme || null,
          targetLaunch: collection.targetLaunch,
          status: collection.status,
        },
      );
      added.collections += 1;
    }
    for (const product of development.products) {
      // Known by its seed id, or by its name when it was typed into the
      // platform before the seed ran.
      const known = await gql(
        `query ($id: UUID!, $name: String!, $category: String!) {
      developmentProduct(id: $id) { id }
      developmentProducts(where: { name: { eq: $name }, categoryCode: { eq: $category } }, limit: 1) { id }
    }`,
        { id: product.id, name: product.name, category: product.category },
      );
      if (known.developmentProduct || known.developmentProducts[0]) continue;
      const number = await nextDevelopmentNumber();
      await gql(
        `mutation ($id: UUID!, $number: String!, $categoryCode: String!, $collectionCode: String, $name: String!, $workingTitle: String, $description: String, $intent: String, $priority: Priority!, $specs: Any, $uid: String!) {
      developmentProduct_insert(data: { id: $id, number: $number, categoryCode: $categoryCode, collectionCode: $collectionCode, name: $name, workingTitle: $workingTitle, description: $description, intent: $intent, stage: idea, priority: $priority, ownerUid: $uid, budgetCurrency: "USD", specs: $specs, createdByUid: $uid }) }`,
        {
          id: product.id,
          number,
          categoryCode: product.category,
          collectionCode: product.collection,
          name: product.name,
          workingTitle: product.workingTitle || null,
          description: product.description || null,
          intent: product.intent || null,
          priority: product.priority,
          specs: product.specs,
          uid: ownerUid,
        },
      );
      for (const material of product.materials) {
        await gql(
          `mutation ($productId: UUID!, $role: String!, $name: String!, $specification: String, $notes: String) {
        developmentMaterial_insert(data: { productId: $productId, role: $role, name: $name, specification: $specification, status: proposed, notes: $notes }) }`,
          {
            productId: product.id,
            role: material.role,
            name: material.name,
            specification: material.specification || null,
            notes: material.notes || null,
          },
        );
      }
      let sort = 1;
      for (const variant of product.variants) {
        await gql(
          `mutation ($productId: UUID!, $code: String!, $name: String!, $colourHex: String, $colourName: String, $sizeLabel: String, $dimensions: Any, $sort: Int!) {
        developmentVariant_insert(data: { productId: $productId, code: $code, name: $name, colourHex: $colourHex, colourName: $colourName, sizeLabel: $sizeLabel, dimensions: $dimensions, status: proposed, sort: $sort }) }`,
          {
            productId: product.id,
            code: variant.code,
            name: variant.name,
            colourHex: variant.colourHex,
            colourName: variant.colourName || null,
            sizeLabel: variant.sizeLabel || null,
            dimensions: variant.dimensions,
            sort,
          },
        );
        sort += 1;
      }
      for (const component of product.packaging) {
        await gql(
          `mutation ($productId: UUID!, $component: String!, $specification: String, $material: String, $dimensions: Any) {
        developmentPackaging_insert(data: { productId: $productId, component: $component, specification: $specification, material: $material, dimensions: $dimensions, status: proposed }) }`,
          {
            productId: product.id,
            component: component.component,
            specification: component.specification || null,
            material: component.material || null,
            dimensions: component.dimensions,
          },
        );
      }
      await gql(
        `mutation ($entityId: String!, $uid: String!, $payload: Any) {
      timelineEvent_insert(data: { entityType: "development_product", entityId: $entityId, kind: "created", actorUid: $uid, payload: $payload }) }`,
        {
          entityId: number,
          uid: ownerUid,
          payload: {
            summary: `Opened as an idea from the owner's concept boards: ${product.name}`,
          },
        },
      );
      added.products += 1;
    }
    return added;
  }

  return {
    gql,
    seedOwner,
    seedReference,
    seedCatalog,
    seedTemplates,
    seedInspectionTemplates,
    seedLogistics,
    seedDevelopment,
    counts: {
      countries: COUNTRIES.length,
      currencies: CURRENCIES.length,
      uoms: UOMS.length,
      incoterms: INCOTERMS.length,
      templates: TEMPLATES.length,
      inspectionTemplates: INSPECTION_TEMPLATES.length,
      places: PLACES.length,
      documentRequirements: DOCUMENT_REQUIREMENTS.length,
      products: catalog.products.length,
    },
  };
}
