import type { Transaction } from '../types/models';
import { formatINR } from '../utils/money';

interface ChartProps {
  transactions: Transaction[];
}

export function DailyIncomeChart({ transactions }: ChartProps) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const total = transactions.filter((txn) => txn.createdAt.slice(0, 10) === key).reduce((sum, txn) => sum + txn.grandTotal, 0);
    return { label: date.toLocaleDateString('en-IN', { weekday: 'short' }), total };
  });
  const max = Math.max(...days.map((day) => day.total), 1);
  const points = days.map((day, index) => `${30 + index * 48},${130 - (day.total / max) * 96}`).join(' ');
  return (
    <svg className="chart" viewBox="0 0 350 160" role="img" aria-label="Daily income trend">
      <polyline fill="none" stroke="#0d7c66" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
      {days.map((day, index) => (
        <g key={day.label}>
          <circle cx={30 + index * 48} cy={130 - (day.total / max) * 96} r="4" fill="#f4a124" />
          <text x={30 + index * 48} y="150" textAnchor="middle">{day.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function PaymentDonut({ transactions }: ChartProps) {
  const modes = ['Cash', 'UPI', 'Card', 'Split Payment'] as const;
  const totals = modes.map((mode) => ({
    mode,
    total: transactions.filter((txn) => txn.paymentMode === mode).reduce((sum, txn) => sum + txn.grandTotal, 0),
  }));
  const max = Math.max(...totals.map((item) => item.total), 1);
  return (
    <div className="bar-list">
      {totals.map((item) => (
        <div className="bar-row" key={item.mode}>
          <span>{item.mode}</span>
          <div className="bar-track"><i style={{ width: `${Math.max((item.total / max) * 100, 6)}%` }} /></div>
          <strong>{formatINR(item.total)}</strong>
        </div>
      ))}
    </div>
  );
}

export function TopDishesChart({ transactions }: ChartProps) {
  const totals = new Map<string, number>();
  transactions.forEach((txn) => txn.items.forEach((item) => totals.set(item.name, (totals.get(item.name) ?? 0) + item.quantity)));
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(...rows.map(([, total]) => total), 1);
  return (
    <div className="rank-list">
      {rows.map(([name, total], index) => (
        <div className="rank-row" key={name}>
          <b>{index + 1}</b>
          <span>{name}</span>
          <div className="bar-track"><i style={{ width: `${(total / max) * 100}%` }} /></div>
          <strong>{total}</strong>
        </div>
      ))}
    </div>
  );
}

interface BranchRevenueProps {
  branches: { id: string; name: string }[];
  transactions: Transaction[];
}

export function BranchRevenueChart({ branches, transactions }: BranchRevenueProps) {
  const rows = branches.map((branch) => ({
    name: branch.name,
    total: transactions.filter((txn) => txn.branchId === branch.id).reduce((sum, txn) => sum + txn.grandTotal, 0),
  }));
  const max = Math.max(...rows.map((row) => row.total), 1);
  return (
    <svg className="chart" viewBox="0 0 350 160" role="img" aria-label="Branch revenue comparison">
      {rows.map((row, index) => (
        <g key={row.name}>
          <rect x={40 + index * 100} y={136 - (row.total / max) * 105} width="46" height={(row.total / max) * 105} rx="6" fill={index === 0 ? '#0d7c66' : '#f4a124'} />
          <text x={63 + index * 100} y="152" textAnchor="middle">{row.name}</text>
        </g>
      ))}
    </svg>
  );
}
