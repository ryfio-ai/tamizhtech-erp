import prisma from '../lib/prisma';
import { generateSku } from '../lib/sequence';
import { normalizeProductName } from '../lib/productUtils';
import * as fs from 'fs';

export interface DiscoveredProduct {
  name: string;
  category: string;
  categorySlug: string;
  productSlug: string;
  url: string;
  price: number | null;
  pricingMode: 'FIXED' | 'REQUIREMENT_BASED';
  description: string;
  websiteSku?: string;
  type: 'PHYSICAL_PRODUCT' | 'SERVICE';
}

export interface ImportReport {
  discovered: number;
  newPhysical: number;
  newServices: number;
  existingPhysicalMatched: number;
  existingServicesMatched: number;
  flaggedForReview: number;
  errors: number;
  items: Array<{
    name: string;
    type: string;
    sku: string;
    pricing: string;
    category: string;
    sourceUrl: string;
    initialStock: string;
    status: 'CREATED' | 'MATCHED_EXISTING' | 'FLAGGED';
  }>;
}

/**
 * Maps website category strings to canonical ERP categories.
 * Unconfident / ambiguous categories return 'Needs Review'.
 */
export function mapWebsiteCategory(cat: string, name: string): string {
  const normCat = (cat || '').toLowerCase();
  const normName = (name || '').toLowerCase();

  if (normCat.includes('motor') || normName.includes('rpm') || normName.includes('motor')) {
    return 'Motors';
  }
  if (normCat.includes('radio') || normCat.includes('controller') || normName.includes('flysky') || normName.includes('transmitter')) {
    return 'Controllers';
  }
  if (normCat.includes('component') || normCat.includes('wheel') || normName.includes('wheel')) {
    return 'Robotics Components';
  }
  if (normCat.includes('competition') || normCat.includes('educational') || normName.includes('bot') || normName.includes('ttrc lf') || normName.includes('robo')) {
    return 'Competition Kits';
  }
  if (normCat.includes('service') || normCat.includes('fabrication') || normCat.includes('3d print') || normCat.includes('pcb')) {
    return 'Services';
  }

  return 'Needs Review';
}

/**
 * Extracts structured Schema.org JSON-LD from a product page HTML string.
 */
export function extractSchemaOrgProduct(html: string): Partial<DiscoveredProduct> | null {
  try {
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(m[1]);
        const obj = Array.isArray(parsed) ? parsed.find(x => x['@type'] === 'Product') : (parsed['@type'] === 'Product' ? parsed : null);
        if (obj) {
          const offers = obj.offers;
          const price = offers && offers.price !== undefined ? Number(offers.price) : null;
          return {
            name: obj.name,
            description: obj.description,
            category: obj.category,
            websiteSku: obj.sku,
            price: price && price > 0 ? price : null,
            pricingMode: price && price > 0 ? 'FIXED' : 'REQUIREMENT_BASED',
          };
        }
      } catch {
        // Skip invalid JSON blocks
      }
    }
  } catch {
    // Ignore extraction errors
  }
  return null;
}

/**
 * Dynamically discovers published products from live catalog or verified snapshot.
 */
export async function discoverPublishedProducts(): Promise<DiscoveredProduct[]> {
  const catalogUrl = 'https://www.tamizhtech.in/products';
  let html = '';
  let isOnline = false;

  try {
    const res = await fetch(catalogUrl, {
      headers: { 'User-Agent': 'TamizhTech-ERP-Importer/2.0' },
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      html = await res.text();
      isOnline = true;
    }
  } catch {
    // Fallback to local snapshot
  }

  if (!html) {
    const snapshotPath = 'C:/Users/sathish/.gemini/antigravity-ide/brain/26f826ec-ba68-4823-aa6c-d80270748e96/.system_generated/steps/1623/content.md';
    if (fs.existsSync(snapshotPath)) {
      html = fs.readFileSync(snapshotPath, 'utf8');
    }
  }

  if (!html) {
    throw new Error('Unable to fetch or read published catalog data');
  }

  // Find all product links: /products/[categorySlug]/[productSlug]
  const linkRegex = /href="(\/products\/([^\/"]+)\/([^"]+))"/g;
  const discoveredMap = new Map<string, { url: string; categorySlug: string; productSlug: string }>();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const path = match[1];
    const categorySlug = match[2];
    const productSlug = match[3];

    // Filter out top-level navigation anchors
    if (path.split('/').length === 4 && !discoveredMap.has(productSlug)) {
      discoveredMap.set(productSlug, {
        url: 'https://www.tamizhtech.in' + path,
        categorySlug,
        productSlug,
      });
    }
  }

  console.log(`[Importer] Discovered ${discoveredMap.size} product URLs dynamically.`);

  const products: DiscoveredProduct[] = [];

  for (const [slug, item] of Array.from(discoveredMap.entries())) {
    let pageHtml = '';
    if (isOnline) {
      try {
        const pageRes = await fetch(item.url, {
          headers: { 'User-Agent': 'TamizhTech-ERP-Importer/2.0' },
          signal: AbortSignal.timeout(1500),
        });
        if (pageRes.ok) {
          pageHtml = await pageRes.text();
        }
      } catch {
        // Will fall back to catalog HTML chunk
      }
    }

    // Priority 1: Structured Schema.org JSON-LD from product page
    let structured = pageHtml ? extractSchemaOrgProduct(pageHtml) : null;

    // Priority 2: Fallback to card HTML chunk from catalog page
    if (!structured || !structured.name) {
      // Find card chunk for this slug
      const cardSplits = html.split('class="group bg-white rounded-2xl border border-slate-200/90');
      const card = cardSplits.find(c => c.includes(slug)) || '';

      const nameMatch = card.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) || card.match(/alt="([^"]+)"/i);
      const catMatch = card.match(/text-\[#FF6B00\]">([^<]+)<\/span>/i);
      const descMatch = card.match(/line-clamp-2[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      const priceMatch = card.match(/font-extrabold text-slate-900 text-base tracking-tight">₹([\d,]+)/i);
      const codeMatch = card.match(/#<!-- -->([^<]+)/i);

      const parsedPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

      structured = {
        name: nameMatch ? nameMatch[1].trim() : slug.replace(/-/g, ' ').toUpperCase(),
        category: catMatch ? catMatch[1].trim() : item.categorySlug.replace(/-/g, ' '),
        description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '',
        websiteSku: codeMatch ? codeMatch[1].trim() : undefined,
        price: parsedPrice && parsedPrice > 0 ? parsedPrice : null,
        pricingMode: parsedPrice && parsedPrice > 0 ? 'FIXED' : 'REQUIREMENT_BASED',
      };
    }

    // Clean up duplicate leading title in description if present
    let cleanDesc = structured.description || '';
    if (structured.name && cleanDesc.startsWith(structured.name)) {
      cleanDesc = cleanDesc.substring(structured.name.length).trim();
    }

    // Determine type: physical vs service
    const isService = (item.categorySlug || '').includes('service') || (structured.category || '').toLowerCase().includes('service');
    const type: 'PHYSICAL_PRODUCT' | 'SERVICE' = isService ? 'SERVICE' : 'PHYSICAL_PRODUCT';

    products.push({
      name: structured.name || slug.replace(/-/g, ' ').toUpperCase(),
      category: structured.category || item.categorySlug,
      categorySlug: item.categorySlug,
      productSlug: slug,
      url: item.url,
      price: structured.price || null,
      pricingMode: structured.pricingMode || (structured.price ? 'FIXED' : 'REQUIREMENT_BASED'),
      description: cleanDesc,
      websiteSku: structured.websiteSku,
      type,
    });
  }

  return products;
}

/**
 * Main import runner.
 */
export async function runWebsiteProductImport(): Promise<ImportReport> {
  console.log('🚀 Starting TamizhTech Website Catalog Importer...');
  const discovered = await discoverPublishedProducts();

  const report: ImportReport = {
    discovered: discovered.length,
    newPhysical: 0,
    newServices: 0,
    existingPhysicalMatched: 0,
    existingServicesMatched: 0,
    flaggedForReview: 0,
    errors: 0,
    items: [],
  };

  for (const item of discovered) {
    try {
      const normalizedName = normalizeProductName(item.name);
      const mappedCategory = mapWebsiteCategory(item.category, item.name);

      if (mappedCategory === 'Needs Review') {
        report.flaggedForReview++;
      }

      // Priority 1: Match by sourceSlug
      let existing = await prisma.product.findFirst({
        where: { sourceSlug: item.productSlug },
      });

      // Priority 2: Match by normalizedName
      if (!existing && normalizedName) {
        existing = await prisma.product.findFirst({
          where: { normalizedName },
        });
      }

      if (existing) {
        // Product exists: PRESERVE SKU, PRESERVE stock, PRESERVE price, PRESERVE ledger
        if (existing.type === 'SERVICE') {
          report.existingServicesMatched++;
        } else {
          report.existingPhysicalMatched++;
        }

        // Update source metadata without changing business values
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            sourceType: 'WEBSITE',
            sourceUrl: item.url,
            sourceSlug: item.productSlug,
            sourceProductName: item.name,
            lastSyncedAt: new Date(),
          },
        });

        report.items.push({
          name: existing.name,
          type: existing.type,
          sku: existing.sku,
          pricing: existing.pricingMode === 'REQUIREMENT_BASED' ? 'Based on requirement' : `₹${existing.basePrice?.toFixed(2)}`,
          category: existing.category || 'General',
          sourceUrl: item.url,
          initialStock: existing.type === 'PHYSICAL_PRODUCT' ? `${existing.stockQuantity} (Preserved)` : 'N/A',
          status: 'MATCHED_EXISTING',
        });
        continue;
      }

      // Priority 4: Create new product
      const sku = await generateSku(mappedCategory === 'Needs Review' ? 'General' : mappedCategory);
      const isPhysical = item.type === 'PHYSICAL_PRODUCT';
      const initialStock = isPhysical ? 1 : 0;

      const created = await prisma.product.create({
        data: {
          sku,
          name: item.name,
          normalizedName,
          category: mappedCategory === 'Needs Review' ? 'Needs Review' : mappedCategory,
          type: item.type,
          pricingMode: item.pricingMode,
          basePrice: item.price,
          description: item.description || null,
          stockQuantity: initialStock,
          minStock: 5,
          sourceType: 'WEBSITE',
          sourceUrl: item.url,
          sourceSlug: item.productSlug,
          sourceProductName: item.name,
          lastSyncedAt: new Date(),
          status: 'ACTIVE',
        },
      });

      // For physical products, create OPENING ledger entry (+1)
      if (isPhysical) {
        await prisma.stockLedgerEntry.create({
          data: {
            productId: created.id,
            quantitySigned: 1,
            type: 'OPENING',
            referenceType: 'OPENING_BALANCE',
            referenceId: created.id,
            notes: 'Initial stock imported from TamizhTech website catalog',
          },
        });
        report.newPhysical++;
      } else {
        report.newServices++;
      }

      report.items.push({
        name: created.name,
        type: created.type,
        sku: created.sku,
        pricing: created.pricingMode === 'REQUIREMENT_BASED' ? 'Based on requirement' : `₹${created.basePrice?.toFixed(2)}`,
        category: created.category || 'General',
        sourceUrl: item.url,
        initialStock: isPhysical ? '1 (+1 OPENING)' : 'N/A',
        status: mappedCategory === 'Needs Review' ? 'FLAGGED' : 'CREATED',
      });
    } catch (err: any) {
      console.error(`[Importer] Error importing ${item.name}:`, err.message);
      report.errors++;
    }
  }

  // Print Structured Import Report
  console.log('\n==================================================');
  console.log('       TAMIZHTECH WEBSITE IMPORT REPORT           ');
  console.log('==================================================');
  console.log(`Products Discovered:        ${report.discovered}`);
  console.log(`New Physical Products:      ${report.newPhysical}`);
  console.log(`New Services:               ${report.newServices}`);
  console.log(`Existing Products Matched:  ${report.existingPhysicalMatched}`);
  console.log(`Existing Services Matched:  ${report.existingServicesMatched}`);
  console.log(`Flagged for Review:         ${report.flaggedForReview}`);
  console.log(`Errors:                     ${report.errors}`);
  console.log('--------------------------------------------------');
  console.log('ITEMIZED IMPORT LOG:');
  for (const it of report.items) {
    console.log(`[${it.status}] ${it.sku} | ${it.name} | ${it.type} | ${it.category} | ${it.pricing} | Stock: ${it.initialStock}`);
  }
  console.log('==================================================\n');

  return report;
}

if (require.main === module) {
  runWebsiteProductImport()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
