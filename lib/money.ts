/**
 * Exact monetary handling utility for TamizhTech ERP 2.0.
 * Eliminates JavaScript floating-point drift across all transactions,
 * sourcing, expenses, quotations, invoices, taxes, payments, WAC, and reports.
 */

/**
 * Round to 2 decimal places using epsilon to prevent floating-point representation drift.
 */
export function roundMoney(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Convert rupees to paise (integer minor units).
 */
export function toPaise(rupees: number): number {
  if (typeof rupees !== 'number' || isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Convert paise (integer minor units) to rupees (exact 2 decimals).
 */
export function fromPaise(paise: number): number {
  if (typeof paise !== 'number' || isNaN(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Deterministically round intermediate values to integer paise without truncation.
 */
export function roundToPaise(paise: number): number {
  if (typeof paise !== 'number' || isNaN(paise)) return 0;
  return Math.round(paise + Number.EPSILON);
}

/**
 * Safely multiplies exact quantity by exact unit cost in paise without float truncation drift.
 * costAmountPaise = roundToPaise(quantity * unitCostPaise)
 */
export function safeMultiplyQuantityByPaise(quantity: number, unitCostPaise: number): number {
  if (typeof quantity !== 'number' || isNaN(quantity)) return 0;
  if (typeof unitCostPaise !== 'number' || isNaN(unitCostPaise)) return 0;
  return roundToPaise(quantity * unitCostPaise);
}


/**
 * Safe addition of monetary amounts via integer minor units.
 */
export function safeAdd(...amounts: number[]): number {
  const totalPaise = amounts.reduce((acc, curr) => acc + toPaise(curr), 0);
  return fromPaise(totalPaise);
}

/**
 * Safe subtraction of monetary amounts (a - b) via integer minor units.
 */
export function safeSub(a: number, b: number): number {
  return fromPaise(toPaise(a) - toPaise(b));
}

/**
 * Safe multiplication of money by quantity or factor.
 */
export function safeMul(amount: number, factor: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  if (typeof factor !== 'number' || isNaN(factor)) return 0;
  return roundMoney(amount * factor);
}

/**
 * Safe division of money by divisor (e.g. quantities in rolling WAC).
 */
export function safeDiv(amount: number, divisor: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  if (typeof divisor !== 'number' || isNaN(divisor) || divisor === 0) return 0;
  return roundMoney(amount / divisor);
}

/**
 * Format INR currency string (e.g. ₹1,23,456.78).
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  const rounded = roundMoney(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(rounded);
}

// ─── Fixed-Scale Quantity & Intermediate Costing ──────────────────

/**
 * Converts a real quantity to integer minor units using product's quantityScale.
 * Countable: scale = 1 -> 5 pieces = 5 minor units
 * Fractional: scale = 1000 -> 1.250 kg = 1250 minor units
 */
export function toMinorQuantity(realQty: number, scale: number = 1): number {
  if (typeof realQty !== 'number' || isNaN(realQty)) return 0;
  const safeScale = Math.max(1, Math.round(scale || 1));
  return Math.round((realQty + Number.EPSILON) * safeScale);
}

/**
 * Converts integer minor units back to real quantity using product's quantityScale.
 */
export function fromMinorQuantity(minorQty: number, scale: number = 1): number {
  if (typeof minorQty !== 'number' || isNaN(minorQty)) return 0;
  const safeScale = Math.max(1, Math.round(scale || 1));
  return minorQty / safeScale;
}

/**
 * Calculates intermediate cost in paise for fractional/minor quantities.
 * Formula: exact intermediate = (minorQty * unitCostPaise) / scale
 * Rounds ONLY the final persisted monetary result to nearest integer paise.
 */
export function calculateMinorCostPaise(
  minorQty: number,
  scale: number,
  unitCostPaise: number
): number {
  if (typeof minorQty !== 'number' || isNaN(minorQty) || minorQty === 0) return 0;
  if (typeof unitCostPaise !== 'number' || isNaN(unitCostPaise) || unitCostPaise === 0) return 0;
  const safeScale = Math.max(1, Math.round(scale || 1));
  const rawCost = (minorQty * unitCostPaise) / safeScale;
  return roundToPaise(rawCost);
}

/**
 * Calculates unit cost in paise given total cost in paise and produced minor quantity.
 * Formula: realQty = minorQty / scale; unitCost = totalCostPaise / realQty
 * Rounded only at final integer paise level.
 */
export function calculateUnitCostFromMinor(
  totalCostPaise: number,
  minorQty: number,
  scale: number
): number {
  if (typeof totalCostPaise !== 'number' || isNaN(totalCostPaise) || totalCostPaise <= 0) return 0;
  if (typeof minorQty !== 'number' || isNaN(minorQty) || minorQty <= 0) return 0;
  const safeScale = Math.max(1, Math.round(scale || 1));
  const realQty = minorQty / safeScale;
  if (realQty <= 0) return 0;
  return roundToPaise(totalCostPaise / realQty);
}

