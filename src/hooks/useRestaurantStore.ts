import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBranchDefaults } from '../data/seed';
import { flushPendingWrites } from '../services/sync';
import { getPendingWrites, loadState, saveState } from '../services/localStore';
import { hasFirebaseConfig, mirrorSeedToFirestore } from '../services/firebase';
import type { AttendanceStatus, Branch, CartItem, LoyaltyMember, MenuItem, PaymentMode, PendingBill, ReceiptSettings, RestaurantTable, SeedState, SplitPayment, SyncStatus, TableOrder, TableOrderStatus, TaxSettings, Transaction } from '../types/models';
import { calculateTotals, createInvoiceNo } from '../utils/money';

const tabs = ['Dashboard', 'POS', 'Pending Bills', 'Tables', 'Inventory', 'Loyalty', 'Attendance', 'Settings'] as const;
export type AppTab = (typeof tabs)[number];
export const appTabs = [...tabs];

interface CheckoutInput {
  cart: CartItem[];
  discount: number;
  redeemPoints: number;
  paymentMode: PaymentMode;
  splitPayments: SplitPayment[];
  customerId?: string;
  pendingBillId?: string;
}

interface PendingBillInput {
  id?: string;
  label: string;
  cart: CartItem[];
  discount: number;
  redeemPoints: number;
  customerId?: string;
}

interface TableOrderInput {
  tableId: string;
  items: CartItem[];
  note: string;
}

export function useRestaurantStore() {
  const [state, setState] = useState<SeedState | null>(null);
  const [activeBranchId, setActiveBranchId] = useState('downtown');
  const [activeTab, setActiveTab] = useState<AppTab>('POS');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'online' : 'offline');
  const [pendingWrites, setPendingWrites] = useState(0);
  const [toast, setToast] = useState('Loading local cache...');

  useEffect(() => {
    loadState().then((loaded) => {
      setState(loaded);
      setToast('Offline cache ready');
      if (hasFirebaseConfig && navigator.onLine) {
        mirrorSeedToFirestore(loaded).catch(() => setToast('Local cache ready. Cloud seed retry will happen after reconnect.'));
      }
    });
    getPendingWrites().then((items) => setPendingWrites(items.length));
  }, []);

  const persist = useCallback(async (next: SeedState, type: string) => {
    setState(next);
    await saveState(next, type);
    const pending = await flushPendingWrites(next);
    setPendingWrites(pending || (await getPendingWrites()).length);
    setToast(navigator.onLine ? 'Saved locally and queued for sync' : 'Saved offline. Sync will resume automatically.');
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus('online');
      if (state) setPendingWrites(await flushPendingWrites(state));
      setToast('Back online. Sync checked.');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
      setToast('Offline mode. Changes are saved locally.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state]);

  const activeBranch = state?.branches.find((branch) => branch.id === activeBranchId) ?? state?.branches[0];
  const branchId = activeBranch?.id ?? activeBranchId;
  const branchMenu = useMemo(() => state?.menuItems.filter((item) => item.branchId === branchId) ?? [], [state, branchId]);
  const branchTables = useMemo(() => state?.tables.filter((item) => item.branchId === branchId).sort((a, b) => a.number - b.number) ?? [], [state, branchId]);
  const branchTableOrders = useMemo(() => state?.tableOrders.filter((item) => item.branchId === branchId) ?? [], [state, branchId]);
  const branchPendingBills = useMemo(() => state?.pendingBills.filter((item) => item.branchId === branchId).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)) ?? [], [state, branchId]);
  const branchTransactions = useMemo(() => state?.transactions.filter((item) => item.branchId === branchId) ?? [], [state, branchId]);
  const branchEmployees = useMemo(() => state?.employees.filter((item) => item.branchId === branchId) ?? [], [state, branchId]);
  const branchTax = state?.taxSettings.find((item) => item.branchId === branchId) ?? { branchId, rate: 5, mode: 'intra-state' as const };
  const branchReceipt = state?.receiptSettings.find((item) => item.branchId === branchId);

  const addBranch = async (name: string) => {
    if (!state || !name.trim()) return;
    const defaults = createBranchDefaults(name);
    const next = {
      branches: [...state.branches, ...defaults.branches],
      menuItems: [...state.menuItems, ...defaults.menuItems],
      tables: [...state.tables, ...defaults.tables],
      tableOrders: [...state.tableOrders, ...defaults.tableOrders],
      pendingBills: [...state.pendingBills, ...defaults.pendingBills],
      loyaltyMembers: state.loyaltyMembers,
      employees: [...state.employees, ...defaults.employees],
      transactions: state.transactions,
      taxSettings: [...state.taxSettings, ...defaults.taxSettings],
      receiptSettings: [...state.receiptSettings, ...defaults.receiptSettings],
    };
    await persist(next, 'branch:create');
    setActiveBranchId(defaults.branches[0].id);
  };

  const updateMenuItem = async (item: MenuItem) => {
    if (!state) return;
    await persist({ ...state, menuItems: state.menuItems.map((existing) => (existing.id === item.id ? item : existing)) }, 'menu:update');
  };

  const deleteMenuItem = async (itemId: string) => {
    if (!state) return;
    await persist({ ...state, menuItems: state.menuItems.filter((item) => item.id !== itemId) }, 'menu:delete');
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'branchId'>) => {
    if (!state) return;
    const nextItem: MenuItem = { ...item, id: `${branchId}-item-${crypto.randomUUID()}`, branchId };
    await persist({ ...state, menuItems: [nextItem, ...state.menuItems] }, 'menu:create');
  };

  const renameCategory = async (fromCategory: string, toCategory: string) => {
    if (!state || !fromCategory.trim() || !toCategory.trim()) return;
    await persist({
      ...state,
      menuItems: state.menuItems.map((item) => (item.branchId === branchId && item.category === fromCategory ? { ...item, category: toCategory.trim() } : item)),
    }, 'category:rename');
  };

  const deleteCategory = async (category: string) => {
    if (!state || !category.trim()) return;
    await persist({
      ...state,
      menuItems: state.menuItems.filter((item) => !(item.branchId === branchId && item.category === category)),
    }, 'category:delete');
  };

  const updateBranch = async (branch: Branch) => {
    if (!state) return;
    await persist({ ...state, branches: state.branches.map((item) => (item.id === branch.id ? branch : item)) }, 'branch:update');
  };

  const updateReceipt = async (receipt: ReceiptSettings) => {
    if (!state) return;
    await persist({
      ...state,
      receiptSettings: state.receiptSettings.map((item) => (item.branchId === receipt.branchId ? receipt : item)),
    }, 'receipt:update');
  };

  const updateTable = async (table: RestaurantTable) => {
    if (!state) return;
    await persist({ ...state, tables: state.tables.map((existing) => (existing.id === table.id ? table : existing)) }, 'table:update');
  };

  const addWaiterTableOrder = async (input: TableOrderInput) => {
    if (!state || input.items.length === 0) return;
    const nextOrder: TableOrder = {
      id: `table-order-${crypto.randomUUID()}`,
      branchId,
      tableId: input.tableId,
      source: 'Waiter',
      status: 'Placed',
      customerName: 'Walk-in',
      createdAt: new Date().toISOString(),
      items: input.items,
      note: input.note.trim(),
    };
    const nextTables = state.tables.map((table) => (table.id === input.tableId ? { ...table, status: 'Occupied' as const } : table));
    await persist({ ...state, tableOrders: [nextOrder, ...state.tableOrders], tables: nextTables }, 'table-order:create');
  };

  const updateTableOrderStatus = async (orderId: string, status: TableOrderStatus) => {
    if (!state) return;
    await persist({ ...state, tableOrders: state.tableOrders.map((order) => (order.id === orderId ? { ...order, status } : order)) }, 'table-order:update');
  };

  const savePendingBill = async (input: PendingBillInput) => {
    if (!state || input.cart.length === 0) return null;
    const timestamp = new Date().toISOString();
    const existing = input.id ? state.pendingBills.find((bill) => bill.id === input.id) : undefined;
    const pendingBill: PendingBill = {
      id: existing?.id ?? `pending-${crypto.randomUUID()}`,
      branchId,
      label: input.label.trim() || `Bill ${branchPendingBills.length + 1}`,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      items: input.cart,
      discount: input.discount,
      redeemPoints: input.redeemPoints,
      customerId: input.customerId,
    };
    const pendingBills = existing
      ? state.pendingBills.map((bill) => (bill.id === existing.id ? pendingBill : bill))
      : [pendingBill, ...state.pendingBills];
    await persist({ ...state, pendingBills }, existing ? 'pending-bill:update' : 'pending-bill:create');
    return pendingBill;
  };

  const deletePendingBill = async (billId: string) => {
    if (!state) return;
    await persist({ ...state, pendingBills: state.pendingBills.filter((bill) => bill.id !== billId) }, 'pending-bill:delete');
  };

  const updateTax = async (settings: TaxSettings) => {
    if (!state) return;
    await persist({ ...state, taxSettings: state.taxSettings.map((item) => (item.branchId === settings.branchId ? settings : item)) }, 'tax:update');
  };

  const registerMember = async (member: Pick<LoyaltyMember, 'name' | 'phone'>) => {
    if (!state || !member.name.trim() || !member.phone.trim()) return;
    const nextMember: LoyaltyMember = {
      id: `cust-${crypto.randomUUID()}`,
      memberCode: `LC${Math.floor(1000 + Math.random() * 9000)}`,
      name: member.name.trim(),
      phone: member.phone.trim(),
      points: 0,
      branchId,
      history: [{ id: crypto.randomUUID(), at: new Date().toISOString(), branchId, points: 0, type: 'registered', note: 'Member registered' }],
    };
    await persist({ ...state, loyaltyMembers: [nextMember, ...state.loyaltyMembers] }, 'loyalty:create');
  };

  const cycleAttendance = async (employeeId: string) => {
    if (!state) return;
    const order: AttendanceStatus[] = ['Scheduled', 'Completed', 'Absent'];
    const nextEmployees = state.employees.map((employee) => {
      if (employee.id !== employeeId) return employee;
      const status = order[(order.indexOf(employee.status) + 1) % order.length];
      return { ...employee, status, history: [{ id: crypto.randomUUID(), at: new Date().toISOString(), status, shift: employee.shift }, ...employee.history] };
    });
    await persist({ ...state, employees: nextEmployees }, 'attendance:update');
  };

  const checkout = async (input: CheckoutInput) => {
    if (!state || !activeBranch || input.cart.length === 0) return null;
    const member = state.loyaltyMembers.find((item) => item.id === input.customerId);
    const redeemPoints = Math.min(input.redeemPoints, member?.points ?? 0);
    const totals = calculateTotals(input.cart, input.discount, redeemPoints, branchTax);
    const earned = Math.floor(totals.taxableAmount / 20);
    const transaction: Transaction = {
      id: `txn-${crypto.randomUUID()}`,
      invoiceNo: createInvoiceNo(activeBranch.name, branchTransactions.length),
      branchId,
      createdAt: new Date().toISOString(),
      cashier: 'Counter 1',
      items: input.cart,
      paymentMode: input.paymentMode,
      splitPayments: input.splitPayments,
      customerId: input.customerId,
      loyaltyRedeemed: redeemPoints,
      loyaltyEarned: earned,
      subtotal: totals.subtotal,
      discount: totals.discount + totals.loyaltyValue,
      taxableAmount: totals.taxableAmount,
      taxRate: branchTax.rate,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
    };
    const nextMenu = state.menuItems.map((item) => {
      const sold = input.cart.find((cartItem) => cartItem.menuItemId === item.id);
      return sold ? { ...item, stock: Math.max(item.stock - sold.quantity, 0), available: item.stock - sold.quantity > 0 } : item;
    });
    const nextMembers = state.loyaltyMembers.map((customer) => {
      if (customer.id !== member?.id) return customer;
      const points = Math.max(customer.points - redeemPoints, 0) + earned;
      return {
        ...customer,
        points,
        history: [
          { id: crypto.randomUUID(), at: transaction.createdAt, branchId, points: earned, type: 'earned' as const, note: transaction.invoiceNo },
          ...(redeemPoints > 0 ? [{ id: crypto.randomUUID(), at: transaction.createdAt, branchId, points: -redeemPoints, type: 'redeemed' as const, note: transaction.invoiceNo }] : []),
          ...customer.history,
        ],
      };
    });
    const nextPendingBills = input.pendingBillId ? state.pendingBills.filter((bill) => bill.id !== input.pendingBillId) : state.pendingBills;
    await persist({ ...state, transactions: [transaction, ...state.transactions], menuItems: nextMenu, loyaltyMembers: nextMembers, pendingBills: nextPendingBills }, 'checkout:create');
    return transaction;
  };

  return {
    state,
    activeBranch,
    activeBranchId: branchId,
    activeTab,
    setActiveTab,
    setActiveBranchId,
    syncStatus,
    pendingWrites,
    toast,
    branchMenu,
    branchTables,
    branchTableOrders,
    branchPendingBills,
    branchTransactions,
    branchEmployees,
    branchTax,
    branchReceipt,
    addBranch,
    updateMenuItem,
    deleteMenuItem,
    addMenuItem,
    renameCategory,
    deleteCategory,
    updateBranch,
    updateReceipt,
    updateTable,
    addWaiterTableOrder,
    updateTableOrderStatus,
    savePendingBill,
    deletePendingBill,
    updateTax,
    registerMember,
    cycleAttendance,
    checkout,
  };
}
