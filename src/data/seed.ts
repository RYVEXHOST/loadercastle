import type { Branch, Employee, LoyaltyMember, MenuItem, ReceiptSettings, RestaurantTable, SeedState, TableOrder, TaxSettings, Transaction } from '../types/models';

const now = new Date().toISOString();

export const branches: Branch[] = [
  { id: 'downtown', name: 'Downtown', address: '12 MG Road, Bengaluru', phone: '+91 98765 43001', gstin: '29AABCR1234F1Z5' },
  { id: 'uptown', name: 'Uptown', address: '88 Park Street, Kolkata', phone: '+91 98765 43002', gstin: '19AABCR1234F1Z2' },
  { id: 'westside', name: 'Westside', address: '41 Linking Road, Mumbai', phone: '+91 98765 43003', gstin: '27AABCR1234F1Z9' },
];

const dishes = [
  ['Paneer Tikka Platter', 'Starters', 285, 18],
  ['Tandoori Broccoli', 'Starters', 245, 14],
  ['Butter Chicken', 'Mains', 420, 12],
  ['Dal Makhani', 'Mains', 310, 16],
  ['Hyderabadi Veg Biryani', 'Rice', 340, 21],
  ['Mutton Rogan Josh', 'Mains', 560, 9],
  ['Masala Dosa', 'Breakfast', 180, 22],
  ['Filter Coffee', 'Beverages', 90, 44],
  ['Mango Lassi', 'Beverages', 130, 31],
  ['Gulab Jamun', 'Desserts', 120, 25],
] as const;

export const menuItems: MenuItem[] = branches.flatMap((branch) =>
  dishes.map(([name, category, price, stock], index) => ({
    id: `${branch.id}-item-${index + 1}`,
    branchId: branch.id,
    name,
    category,
    price,
    available: stock > 0,
    stock,
    lowStockAt: 10,
    ingredients: category === 'Beverages' ? ['milk', 'spice mix'] : ['spice mix', 'fresh produce', 'ghee'],
  })),
);

export const tables: RestaurantTable[] = branches.flatMap((branch) =>
  Array.from({ length: 12 }, (_, index) => ({
    id: `${branch.id}-table-${index + 1}`,
    branchId: branch.id,
    number: index + 1,
    seats: index % 4 === 0 ? 6 : index % 3 === 0 ? 2 : 4,
    status: index === 1 ? 'Needs Service' : index === 2 ? 'Billing' : index < 5 ? 'Occupied' : 'Available',
  })),
);

export const tableOrders: TableOrder[] = branches.flatMap((branch) => [
  {
    id: `${branch.id}-qr-order-1`,
    branchId: branch.id,
    tableId: `${branch.id}-table-2`,
    source: 'QR',
    status: 'Placed',
    customerName: 'QR Guest',
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    note: 'No onion',
    items: [
      { menuItemId: `${branch.id}-item-1`, name: 'Paneer Tikka Platter', price: 285, quantity: 1, note: 'No onion', taxRate: 5 },
      { menuItemId: `${branch.id}-item-9`, name: 'Mango Lassi', price: 130, quantity: 2, note: '', taxRate: 5 },
    ],
  },
  {
    id: `${branch.id}-waiter-order-1`,
    branchId: branch.id,
    tableId: `${branch.id}-table-3`,
    source: 'Waiter',
    status: 'Preparing',
    customerName: 'Walk-in',
    createdAt: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
    note: 'Serve starters first',
    items: [
      { menuItemId: `${branch.id}-item-3`, name: 'Butter Chicken', price: 420, quantity: 1, note: 'Medium spice', taxRate: 5 },
      { menuItemId: `${branch.id}-item-8`, name: 'Filter Coffee', price: 90, quantity: 2, note: '', taxRate: 5 },
    ],
  },
]);

export const taxSettings: TaxSettings[] = branches.map((branch, index) => ({
  branchId: branch.id,
  rate: [5, 12, 18][index] ?? 5,
  mode: 'intra-state',
}));

export const receiptSettings: ReceiptSettings[] = branches.map((branch) => ({
  branchId: branch.id,
  storeName: `Loader Castle ${branch.name}`,
  slogan: 'Fresh food, warm service. Visit again.',
  printerWidth: '80mm',
}));

export const loyaltyMembers: LoyaltyMember[] = [
  { id: 'cust-1', memberCode: 'LC1001', name: 'Ananya Rao', phone: '9876501111', points: 860, branchId: 'downtown', history: [{ id: 'lh-1', at: now, branchId: 'downtown', points: 860, type: 'earned', note: 'Opening balance' }] },
  { id: 'cust-2', memberCode: 'LC1002', name: 'Rohan Mehta', phone: '9876502222', points: 430, branchId: 'uptown', history: [{ id: 'lh-2', at: now, branchId: 'uptown', points: 430, type: 'earned', note: 'Opening balance' }] },
  { id: 'cust-3', memberCode: 'LC1003', name: 'Fatima Khan', phone: '9876503333', points: 210, branchId: 'westside', history: [{ id: 'lh-3', at: now, branchId: 'westside', points: 210, type: 'earned', note: 'Opening balance' }] },
];

export const employees: Employee[] = branches.flatMap((branch, index) => [
  { id: `${branch.id}-emp-1`, branchId: branch.id, name: ['Meera', 'Kabir', 'Isha'][index] ?? 'Meera', role: 'Cashier', shift: '10:00-18:00', wagePerShift: 950, status: 'Scheduled', history: [] },
  { id: `${branch.id}-emp-2`, branchId: branch.id, name: ['Arjun', 'Neha', 'Vikram'][index] ?? 'Arjun', role: 'Steward', shift: '14:00-22:00', wagePerShift: 800, status: 'Completed', history: [{ id: `${branch.id}-att-1`, at: now, status: 'Completed', shift: '14:00-22:00' }] },
]);

export const transactions: Transaction[] = branches.map((branch, index) => ({
  id: `${branch.id}-txn-1`,
  invoiceNo: `${branch.name.slice(0, 3).toUpperCase()}-2026-00001`,
  branchId: branch.id,
  createdAt: new Date(Date.now() - index * 86400000).toISOString(),
  cashier: 'Meera',
  items: [
    { menuItemId: `${branch.id}-item-3`, name: 'Butter Chicken', price: 420, quantity: 2, note: 'Medium spice', taxRate: taxSettings[index]?.rate ?? 5 },
    { menuItemId: `${branch.id}-item-8`, name: 'Filter Coffee', price: 90, quantity: 3, note: '', taxRate: taxSettings[index]?.rate ?? 5 },
  ],
  paymentMode: index === 0 ? 'UPI' : index === 1 ? 'Card' : 'Cash',
  splitPayments: [],
  loyaltyRedeemed: 0,
  loyaltyEarned: 54,
  subtotal: 1110,
  discount: 50,
  taxableAmount: 1060,
  taxRate: taxSettings[index]?.rate ?? 5,
  cgst: 26.5,
  sgst: 26.5,
  igst: 0,
  roundOff: 0,
  grandTotal: 1113,
}));

export const seedState: SeedState = {
  branches,
  menuItems,
  tables,
  tableOrders,
  loyaltyMembers,
  employees,
  transactions,
  taxSettings,
  receiptSettings,
};

export const createBranchDefaults = (name: string): SeedState => {
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `branch-${Date.now()}`;
  const branch: Branch = { id, name, address: 'New branch address', phone: '+91 90000 00000', gstin: '' };
  return {
    branches: [branch],
    menuItems: dishes.slice(0, 6).map(([dishName, category, price, stock], index) => ({
      id: `${id}-item-${index + 1}`,
      branchId: id,
      name: dishName,
      category,
      price,
      available: true,
      stock,
      lowStockAt: 10,
      ingredients: ['fresh produce', 'spice mix'],
    })),
    tables: Array.from({ length: 10 }, (_, index) => ({
      id: `${id}-table-${index + 1}`,
      branchId: id,
      number: index + 1,
      seats: index % 4 === 0 ? 6 : 4,
      status: 'Available',
    })),
    tableOrders: [],
    loyaltyMembers: [],
    employees: [{ id: `${id}-emp-1`, branchId: id, name: 'New Cashier', role: 'Cashier', shift: '10:00-18:00', wagePerShift: 900, status: 'Scheduled', history: [] }],
    transactions: [],
    taxSettings: [{ branchId: id, rate: 5, mode: 'intra-state' }],
    receiptSettings: [{ branchId: id, storeName: `Loader Castle ${name}`, slogan: 'Fresh food, warm service. Visit again.', printerWidth: '80mm' }],
  };
};
