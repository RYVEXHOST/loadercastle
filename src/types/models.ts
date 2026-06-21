export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Split Payment';
export type AttendanceStatus = 'Scheduled' | 'Completed' | 'Absent';
export type SyncStatus = 'online' | 'offline';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  gstin: string;
}

export interface TaxSettings {
  branchId: string;
  rate: number;
  mode: 'intra-state' | 'inter-state';
}

export interface ReceiptSettings {
  branchId: string;
  storeName: string;
  slogan: string;
  printerWidth: '58mm' | '80mm';
}

export interface MenuItem {
  id: string;
  branchId: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  stock: number;
  lowStockAt: number;
  ingredients: string[];
}

export interface LoyaltyMember {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  points: number;
  branchId: string;
  history: LoyaltyEvent[];
}

export interface LoyaltyEvent {
  id: string;
  at: string;
  branchId: string;
  points: number;
  type: 'earned' | 'redeemed' | 'registered';
  note: string;
}

export interface Employee {
  id: string;
  branchId: string;
  name: string;
  role: string;
  shift: string;
  wagePerShift: number;
  status: AttendanceStatus;
  history: AttendanceEvent[];
}

export interface AttendanceEvent {
  id: string;
  at: string;
  status: AttendanceStatus;
  shift: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
  taxRate: number;
}

export interface SplitPayment {
  mode: Exclude<PaymentMode, 'Split Payment'>;
  amount: number;
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  branchId: string;
  createdAt: string;
  cashier: string;
  items: CartItem[];
  paymentMode: PaymentMode;
  splitPayments: SplitPayment[];
  customerId?: string;
  loyaltyRedeemed: number;
  loyaltyEarned: number;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
}

export interface SeedState {
  branches: Branch[];
  menuItems: MenuItem[];
  loyaltyMembers: LoyaltyMember[];
  employees: Employee[];
  transactions: Transaction[];
  taxSettings: TaxSettings[];
  receiptSettings: ReceiptSettings[];
}
