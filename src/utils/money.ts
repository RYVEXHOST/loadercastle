import type { CartItem, TaxSettings } from '../types/models';

export const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

export const pointsToRupees = (points: number) => Math.floor(points / 10);

export interface Totals {
  subtotal: number;
  discount: number;
  loyaltyValue: number;
  taxableAmount: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
}

export function calculateTotals(
  items: CartItem[],
  discount: number,
  redeemPoints: number,
  taxSettings: TaxSettings,
): Totals {
  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const loyaltyValue = Math.min(pointsToRupees(redeemPoints), Math.max(subtotal - safeDiscount, 0));
  const taxableAmount = round2(Math.max(subtotal - safeDiscount - loyaltyValue, 0));
  const tax = round2(taxableAmount * (taxSettings.rate / 100));
  const cgst = taxSettings.mode === 'intra-state' ? round2(tax / 2) : 0;
  const sgst = taxSettings.mode === 'intra-state' ? round2(tax / 2) : 0;
  const igst = taxSettings.mode === 'inter-state' ? tax : 0;
  const beforeRound = taxableAmount + tax;
  const grandTotal = Math.round(beforeRound);
  const roundOff = round2(grandTotal - beforeRound);
  return { subtotal, discount: safeDiscount, loyaltyValue, taxableAmount, tax, cgst, sgst, igst, roundOff, grandTotal };
}

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const createInvoiceNo = (branchName: string, count: number) => {
  const prefix = branchName.slice(0, 3).toUpperCase();
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};
