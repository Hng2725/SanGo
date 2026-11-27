import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RevenuePoint } from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';

interface RevenueChartProps { points: RevenuePoint[] }

export default function RevenueChart({ points }: RevenueChartProps) {
  const formatAxis = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}tr` : value >= 1_000 ? `${Math.round(value / 1_000)}k` : String(value);
  return <ResponsiveContainer width="100%" height={320}><BarChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#d6dfd9" /><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis width={58} tickFormatter={formatAxis} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Doanh thu']} /><Bar dataKey="revenue" fill="#1e7a4f" name="Doanh thu" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>;
}
