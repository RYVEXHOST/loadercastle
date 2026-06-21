import { useEffect, useState } from 'react';
import { BranchRevenueChart, DailyIncomeChart, PaymentDonut, TopDishesChart } from './components/Charts';
import { LoginPage } from './components/LoginPage';
import { ReceiptPreview } from './components/Receipt';
import { Shell } from './components/Shell';
import { useAuthSession } from './hooks/useAuthSession';
import { useRestaurantStore } from './hooks/useRestaurantStore';
import type { CartItem, MenuItem, PaymentMode, RestaurantTable, TableOrder, TableOrderStatus, Transaction } from './types/models';
import { calculateTotals, formatINR } from './utils/money';

const paymentModes: PaymentMode[] = ['Cash', 'UPI', 'Card', 'Split Payment'];

export default function App() {
  const auth = useAuthSession();
  const store = useRestaurantStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [lastTransaction, setLastTransaction] = useState<Transaction | undefined>();

  const customers = store.state?.loyaltyMembers ?? [];
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const customerResults = customers.filter((customer) =>
    `${customer.name} ${customer.phone} ${customer.memberCode}`.toLowerCase().includes(customerQuery.toLowerCase()),
  );
  const totals = calculateTotals(cart, discount, redeemPoints, store.branchTax);

  useEffect(() => {
    if (auth.session?.role === 'user' && !['Dashboard', 'POS', 'Tables', 'Loyalty'].includes(store.activeTab)) {
      store.setActiveTab('POS');
    }
  }, [auth.session, store]);

  const addToCart = (item: MenuItem) => {
    if (!item.available) return;
    setCart((existing) => {
      const found = existing.find((cartItem) => cartItem.menuItemId === item.id);
      if (found) return existing.map((cartItem) => (cartItem.menuItemId === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem));
      return [...existing, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, note: '', taxRate: store.branchTax.rate }];
    });
  };

  const updateCart = (id: string, patch: Partial<CartItem>) => {
    setCart((existing) => existing.map((item) => (item.menuItemId === id ? { ...item, ...patch, quantity: Math.max(patch.quantity ?? item.quantity, 1) } : item)));
  };

  const submitCheckout = async () => {
    const transaction = await store.checkout({
      cart,
      discount,
      redeemPoints,
      paymentMode,
      splitPayments: paymentMode === 'Split Payment' ? [{ mode: 'UPI', amount: Math.ceil(totals.grandTotal / 2) }, { mode: 'Cash', amount: Math.floor(totals.grandTotal / 2) }] : [],
      customerId: selectedCustomerId,
    });
    if (transaction) {
      setLastTransaction(transaction);
      setCart([]);
      setDiscount(0);
      setRedeemPoints(0);
    }
  };

  if (!auth.session) return <LoginPage error={auth.authError} onLogin={auth.login} />;
  if (!store.state) return <div className="loading">Preparing offline restaurant workspace...</div>;

  return (
    <Shell
      activeTab={store.activeTab}
      setActiveTab={store.setActiveTab}
      branches={store.state.branches}
      activeBranchId={store.activeBranchId}
      setActiveBranchId={store.setActiveBranchId}
      syncStatus={store.syncStatus}
      pendingWrites={store.pendingWrites}
      toast={store.toast}
      session={auth.session}
      onLogout={auth.logout}
    >
      {store.activeTab === 'POS' && (
        <section className="pos-grid">
          <div className="menu-panel">
            <div className="panel-heading">
              <h2>Menu</h2>
              <span>{store.branchMenu.filter((item) => item.available).length} available</span>
            </div>
            <div className="menu-grid">
              {store.branchMenu.map((item) => (
                <button className={`menu-item ${!item.available ? 'disabled' : ''}`} key={item.id} onClick={() => addToCart(item)}>
                  <span>{item.category}</span>
                  <strong>{item.name}</strong>
                  <b>{formatINR(item.price)}</b>
                  <small>{item.stock <= item.lowStockAt ? 'Low stock' : `${item.stock} in stock`}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="cart-panel">
            <div className="panel-heading"><h2>Billing Cart</h2><span>{cart.length} lines</span></div>
            <div className="cart-list">
              {cart.map((item) => (
                <div className="cart-row" key={item.menuItemId}>
                  <div><strong>{item.name}</strong><input value={item.note} placeholder="Customization note" onChange={(event) => updateCart(item.menuItemId, { note: event.target.value })} /></div>
                  <div className="qty"><button onClick={() => updateCart(item.menuItemId, { quantity: item.quantity - 1 })}>-</button><span>{item.quantity}</span><button onClick={() => updateCart(item.menuItemId, { quantity: item.quantity + 1 })}>+</button></div>
                  <b>{formatINR(item.price * item.quantity)}</b>
                </div>
              ))}
              {cart.length === 0 && <div className="empty">Tap dishes to start a bill.</div>}
            </div>
            <div className="checkout-box">
              <label>Discount <input type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label>
              <label>Loyalty search <input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Name, phone, code" /></label>
              {customerQuery && <div className="search-results">{customerResults.slice(0, 4).map((customer) => <button key={customer.id} onClick={() => setSelectedCustomerId(customer.id)}>{customer.name} · {customer.memberCode} · {customer.points} pts</button>)}</div>}
              <label>Redeem points <input type="number" value={redeemPoints} max={selectedCustomer?.points ?? 0} onChange={(event) => setRedeemPoints(Number(event.target.value))} /></label>
              <div className="payment-tabs">{paymentModes.map((mode) => <button className={paymentMode === mode ? 'selected' : ''} key={mode} onClick={() => setPaymentMode(mode)}>{mode}</button>)}</div>
              <TotalRows totals={totals} taxRate={store.branchTax.rate} />
              <button className="button primary checkout" disabled={cart.length === 0} onClick={submitCheckout}>Complete Checkout</button>
            </div>
          </div>
          <ReceiptPreview branch={store.activeBranch} receipt={store.branchReceipt} transaction={lastTransaction} />
        </section>
      )}

      {store.activeTab === 'Dashboard' && <Dashboard store={store} />}
      {store.activeTab === 'Tables' && (
        <TableOrdersSection
          tables={store.branchTables}
          orders={store.branchTableOrders}
          menu={store.branchMenu}
          taxRate={store.branchTax.rate}
          isAdmin={auth.session.role === 'admin'}
          onTableUpdate={store.updateTable}
          onAddWaiterOrder={store.addWaiterTableOrder}
          onOrderStatusUpdate={store.updateTableOrderStatus}
        />
      )}
      {auth.session.role === 'admin' && store.activeTab === 'Inventory' && <Inventory items={store.branchMenu} onSave={store.updateMenuItem} onCreate={store.addMenuItem} />}
      {store.activeTab === 'Loyalty' && <Loyalty members={customers} branchId={store.activeBranchId} onRegister={store.registerMember} />}
      {auth.session.role === 'admin' && store.activeTab === 'Attendance' && <Attendance employees={store.branchEmployees} onCycle={store.cycleAttendance} />}
      {auth.session.role === 'admin' && store.activeTab === 'Settings' && <Settings store={store} />}
    </Shell>
  );
}

function TotalRows({ totals, taxRate }: { totals: ReturnType<typeof calculateTotals>; taxRate: number }) {
  return (
    <div className="totals">
      <span>Subtotal <b>{formatINR(totals.subtotal)}</b></span>
      <span>Discount + loyalty <b>{formatINR(totals.discount + totals.loyaltyValue)}</b></span>
      <span>CGST / SGST ({taxRate}%) <b>{formatINR(totals.cgst)} / {formatINR(totals.sgst)}</b></span>
      <span>Round off <b>{formatINR(totals.roundOff)}</b></span>
      <strong>Grand Total <b>{formatINR(totals.grandTotal)}</b></strong>
    </div>
  );
}

function Dashboard({ store }: { store: ReturnType<typeof useRestaurantStore> }) {
  const transactions = store.branchTransactions;
  const gross = transactions.reduce((sum, txn) => sum + txn.subtotal, 0);
  const net = transactions.reduce((sum, txn) => sum + txn.grandTotal, 0);
  const tax = transactions.reduce((sum, txn) => sum + txn.cgst + txn.sgst + txn.igst, 0);
  const aov = transactions.length ? net / transactions.length : 0;
  return (
    <section className="dashboard">
      <Metric title="Gross revenue" value={formatINR(gross)} />
      <Metric title="Net revenue" value={formatINR(net)} />
      <Metric title="Transactions" value={String(transactions.length)} />
      <Metric title="Average order" value={formatINR(aov)} />
      <Metric title="GST collected" value={formatINR(tax)} />
      <div className="analytics-card wide"><h2>Daily income trend</h2><DailyIncomeChart transactions={transactions} /></div>
      <div className="analytics-card"><h2>Payment channel split</h2><PaymentDonut transactions={transactions} /></div>
      <div className="analytics-card"><h2>Top-selling dishes</h2><TopDishesChart transactions={transactions} /></div>
      <div className="analytics-card wide"><h2>Branch revenue comparison</h2><BranchRevenueChart branches={store.state?.branches ?? []} transactions={store.state?.transactions ?? []} /></div>
    </section>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="metric"><span>{title}</span><strong>{value}</strong></div>;
}

function TableOrdersSection({
  tables,
  orders,
  menu,
  taxRate,
  isAdmin,
  onTableUpdate,
  onAddWaiterOrder,
  onOrderStatusUpdate,
}: {
  tables: RestaurantTable[];
  orders: TableOrder[];
  menu: MenuItem[];
  taxRate: number;
  isAdmin: boolean;
  onTableUpdate: (table: RestaurantTable) => Promise<void>;
  onAddWaiterOrder: (input: { tableId: string; items: CartItem[]; note: string }) => Promise<void>;
  onOrderStatusUpdate: (orderId: string, status: TableOrderStatus) => Promise<void>;
}) {
  const [selectedTableId, setSelectedTableId] = useState(tables[0]?.id ?? '');
  const [waiterCart, setWaiterCart] = useState<CartItem[]>([]);
  const [waiterNote, setWaiterNote] = useState('');
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? tables[0];
  const selectedOrders = orders.filter((order) => order.tableId === selectedTable?.id);
  const qrOrders = selectedOrders.filter((order) => order.source === 'QR');
  const waiterOrders = selectedOrders.filter((order) => order.source === 'Waiter');
  const waiterTotal = waiterCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addWaiterItem = (item: MenuItem) => {
    setWaiterCart((existing) => {
      const found = existing.find((cartItem) => cartItem.menuItemId === item.id);
      if (found) return existing.map((cartItem) => (cartItem.menuItemId === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem));
      return [...existing, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, note: '', taxRate }];
    });
  };

  const updateWaiterQuantity = (id: string, quantity: number) => {
    setWaiterCart((existing) => existing.map((item) => (item.menuItemId === id ? { ...item, quantity: Math.max(quantity, 1) } : item)));
  };

  const submitWaiterOrder = async () => {
    if (!selectedTable) return;
    await onAddWaiterOrder({ tableId: selectedTable.id, items: waiterCart, note: waiterNote });
    setWaiterCart([]);
    setWaiterNote('');
  };

  if (!selectedTable) return <section className="table-panel"><div className="empty">No tables configured for this branch.</div></section>;

  return (
    <section className="tables-workspace">
      <div className="table-layout-card">
        <div className="panel-heading">
          <div>
            <h2>Table Layout</h2>
            <span>Click a table to view QR and waiter orders separately.</span>
          </div>
        </div>
        <div className="restaurant-floor">
          {tables.map((table) => (
            <button
              className={`floor-table ${table.status.toLowerCase().replace(/\s+/g, '-')} ${selectedTable.id === table.id ? 'selected' : ''}`}
              key={table.id}
              onClick={() => setSelectedTableId(table.id)}
              aria-label={`Table ${table.number}`}
            >
              {table.number}
            </button>
          ))}
        </div>
      </div>

      <aside className="table-detail-card">
        <div className="table-detail-header">
          <div>
            <span>Selected table</span>
            <h2>Table {selectedTable.number}</h2>
            <p>{selectedTable.seats} seats</p>
          </div>
          {isAdmin ? (
            <select value={selectedTable.status} onChange={(event) => onTableUpdate({ ...selectedTable, status: event.target.value as RestaurantTable['status'] })}>
              <option>Available</option>
              <option>Occupied</option>
              <option>Needs Service</option>
              <option>Billing</option>
            </select>
          ) : (
            <span className={`table-status-pill ${selectedTable.status.toLowerCase().replace(/\s+/g, '-')}`}>{selectedTable.status}</span>
          )}
        </div>

        <div className="split-orders">
          <OrderColumn title="QR Orders" orders={qrOrders} isAdmin={isAdmin} onOrderStatusUpdate={onOrderStatusUpdate} />
          <OrderColumn title="Waiter Orders" orders={waiterOrders} isAdmin={isAdmin} onOrderStatusUpdate={onOrderStatusUpdate} />
        </div>

        <div className="waiter-order-builder">
          <div className="panel-heading">
            <h2>Add Waiter Order</h2>
            <span>{formatINR(waiterTotal)}</span>
          </div>
          <div className="compact-menu-grid">
            {menu.filter((item) => item.available).slice(0, 8).map((item) => (
              <button key={item.id} onClick={() => addWaiterItem(item)}>
                <span>{item.name}</span>
                <b>{formatINR(item.price)}</b>
              </button>
            ))}
          </div>
          <div className="waiter-cart-list">
            {waiterCart.map((item) => (
              <div className="waiter-cart-row" key={item.menuItemId}>
                <span>{item.name}</span>
                <div className="qty"><button onClick={() => updateWaiterQuantity(item.menuItemId, item.quantity - 1)}>-</button><span>{item.quantity}</span><button onClick={() => updateWaiterQuantity(item.menuItemId, item.quantity + 1)}>+</button></div>
                <b>{formatINR(item.price * item.quantity)}</b>
              </div>
            ))}
            {waiterCart.length === 0 && <div className="empty small">Select menu items to create a waiter order for this table.</div>}
          </div>
          <label>Order note <input value={waiterNote} onChange={(event) => setWaiterNote(event.target.value)} placeholder="Kitchen note or service instruction" /></label>
          <button className="button primary" disabled={waiterCart.length === 0} onClick={submitWaiterOrder}>Send Waiter Order</button>
        </div>
      </aside>
    </section>
  );
}

function OrderColumn({ title, orders, isAdmin, onOrderStatusUpdate }: { title: string; orders: TableOrder[]; isAdmin: boolean; onOrderStatusUpdate: (orderId: string, status: TableOrderStatus) => Promise<void> }) {
  const statuses: TableOrderStatus[] = ['Placed', 'Preparing', 'Served', 'Cancelled'];
  return (
    <div className="order-column">
      <h3>{title}</h3>
      {orders.map((order) => (
        <article className="table-order-card" key={order.id}>
          <div className="table-order-topline">
            <span>{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            {isAdmin ? (
              <select value={order.status} onChange={(event) => onOrderStatusUpdate(order.id, event.target.value as TableOrderStatus)}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            ) : (
              <b>{order.status}</b>
            )}
          </div>
          {order.items.map((item) => (
            <div className="table-order-line" key={`${order.id}-${item.menuItemId}-${item.note}`}>
              <span>{item.name} x {item.quantity}</span>
              <b>{formatINR(item.price * item.quantity)}</b>
            </div>
          ))}
          {order.note && <p>{order.note}</p>}
        </article>
      ))}
      {orders.length === 0 && <div className="empty small">No {title.toLowerCase()} for this table.</div>}
    </div>
  );
}

function Inventory({ items, onSave, onCreate }: { items: MenuItem[]; onSave: (item: MenuItem) => Promise<void>; onCreate: (item: Omit<MenuItem, 'id' | 'branchId'>) => Promise<void> }) {
  const [draft, setDraft] = useState({ name: '', category: 'Mains', price: 250, stock: 12 });
  return (
    <section className="table-panel">
      <div className="inline-form">
        <input placeholder="Dish name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <input placeholder="Category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
        <input type="number" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} />
        <button className="button primary" onClick={() => onCreate({ ...draft, available: true, lowStockAt: 10, ingredients: ['fresh produce'] })}>Add item</button>
      </div>
      <table><thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Stock</th><th>Available</th></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.category}</td><td>{formatINR(item.price)}</td><td><input type="number" value={item.stock} onChange={(event) => onSave({ ...item, stock: Number(event.target.value) })} /></td><td><input type="checkbox" checked={item.available} onChange={(event) => onSave({ ...item, available: event.target.checked })} /></td></tr>)}
      </tbody></table>
    </section>
  );
}

function Loyalty({ members, branchId, onRegister }: { members: NonNullable<ReturnType<typeof useRestaurantStore>['state']>['loyaltyMembers']; branchId: string; onRegister: (member: { name: string; phone: string }) => Promise<void> }) {
  const [draft, setDraft] = useState({ name: '', phone: '' });
  const rows = members.filter((member) => member.branchId === branchId);
  return (
    <section className="table-panel">
      <div className="inline-form"><input placeholder="Member name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input placeholder="Phone" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /><button className="button primary" onClick={() => onRegister(draft)}>Register member</button></div>
      <table><thead><tr><th>Member</th><th>Code</th><th>Phone</th><th>Points</th><th>History</th></tr></thead><tbody>{rows.map((member) => <tr key={member.id}><td>{member.name}</td><td>{member.memberCode}</td><td>{member.phone}</td><td>{member.points}</td><td>{member.history.length} events</td></tr>)}</tbody></table>
    </section>
  );
}

function Attendance({ employees, onCycle }: { employees: ReturnType<typeof useRestaurantStore>['branchEmployees']; onCycle: (id: string) => Promise<void> }) {
  const payroll = employees.filter((employee) => employee.status === 'Completed').reduce((sum, employee) => sum + employee.wagePerShift, 0);
  return <section className="table-panel"><div className="metric"><span>Completed shift payroll</span><strong>{formatINR(payroll)}</strong></div><table><thead><tr><th>Name</th><th>Role</th><th>Shift</th><th>Status</th><th>Wage</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td>{employee.name}</td><td>{employee.role}</td><td>{employee.shift}</td><td><button className={`status ${employee.status.toLowerCase()}`} onClick={() => onCycle(employee.id)}>{employee.status}</button></td><td>{formatINR(employee.wagePerShift)}</td></tr>)}</tbody></table></section>;
}

function Settings({ store }: { store: ReturnType<typeof useRestaurantStore> }) {
  const [branchName, setBranchName] = useState('');
  const rates = [2, 5, 8.25, 12, 18];
  return (
    <section className="settings-grid">
      <div className="analytics-card"><h2>GST settings</h2><div className="payment-tabs">{rates.map((rate) => <button className={store.branchTax.rate === rate ? 'selected' : ''} key={rate} onClick={() => store.updateTax({ ...store.branchTax, rate })}>{rate}%</button>)}</div><label>Custom GST %<input type="number" value={store.branchTax.rate} onChange={(event) => store.updateTax({ ...store.branchTax, rate: Number(event.target.value) })} /></label><p>CGST/SGST enabled for intra-state billing. IGST field is retained for inter-state readiness.</p></div>
      <div className="analytics-card"><h2>Branches</h2><div className="inline-form"><input placeholder="New branch name" value={branchName} onChange={(event) => setBranchName(event.target.value)} /><button className="button primary" onClick={() => store.addBranch(branchName)}>Create branch</button></div>{store.state?.branches.map((branch) => <p key={branch.id}>{branch.name} · {branch.gstin || 'GSTIN pending'}</p>)}</div>
      <div className="analytics-card"><h2>Seed utility</h2><p>Populate Database Seed Data is idempotent: first boot hydrates IndexedDB and Firestore mirroring uses document IDs with merge semantics, so reruns update safely.</p></div>
    </section>
  );
}
