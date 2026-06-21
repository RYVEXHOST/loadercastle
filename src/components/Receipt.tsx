import type { Branch, ReceiptSettings, Transaction } from '../types/models';
import { formatINR } from '../utils/money';

interface Props {
  branch?: Branch;
  receipt?: ReceiptSettings;
  transaction?: Transaction;
}

export function ReceiptPreview({ branch, receipt, transaction }: Props) {
  if (!branch || !receipt) return null;
  return (
    <aside className="receipt-shell">
      <div className={`receipt ${receipt.printerWidth === '58mm' ? 'receipt-narrow' : ''}`}>
        <h3>{receipt.storeName}</h3>
        <p>{branch.address}</p>
        <p>{branch.phone} | GSTIN {branch.gstin || 'Pending'}</p>
        <hr />
        <p>Invoice: {transaction?.invoiceNo ?? 'Draft'}</p>
        <p>{new Date(transaction?.createdAt ?? Date.now()).toLocaleString('en-IN')}</p>
        <p>Cashier: {transaction?.cashier ?? 'Counter 1'}</p>
        <hr />
        {(transaction?.items ?? []).map((item) => (
          <div className="receipt-line" key={`${item.menuItemId}-${item.note}`}>
            <span>{item.name} x {item.quantity}</span>
            <span>{formatINR(item.price * item.quantity)}</span>
          </div>
        ))}
        {!transaction && <p className="muted-center">Receipt preview updates after checkout.</p>}
        <hr />
        <div className="receipt-line"><span>CGST</span><span>{formatINR(transaction?.cgst ?? 0)}</span></div>
        <div className="receipt-line"><span>SGST</span><span>{formatINR(transaction?.sgst ?? 0)}</span></div>
        <div className="receipt-line"><span>IGST</span><span>{formatINR(transaction?.igst ?? 0)}</span></div>
        <div className="receipt-line"><span>Round off</span><span>{formatINR(transaction?.roundOff ?? 0)}</span></div>
        <div className="receipt-total"><span>Total</span><span>{formatINR(transaction?.grandTotal ?? 0)}</span></div>
        <p>Payment: {transaction?.paymentMode ?? '-'}</p>
        <p>Loyalty earned/redeemed: {transaction?.loyaltyEarned ?? 0}/{transaction?.loyaltyRedeemed ?? 0}</p>
        <div className="qr-mock">|||| || | |||| | || |||</div>
        <p className="muted-center">{receipt.slogan}</p>
      </div>
      <button className="button primary print-button" onClick={() => window.print()}>Print Thermal Receipt</button>
    </aside>
  );
}
