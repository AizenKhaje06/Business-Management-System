'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  LineChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  MonthlyDataPoint,
  CategoryDataPoint,
  PaymentStatusDataPoint,
  ProjectStatusDataPoint,
} from '@/app/actions/dashboard';

const CHART_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

function formatCurrencyShort(amount: number): string {
  if (Math.abs(amount) >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--background))',
  fontSize: '12px',
};

interface DashboardChartsProps {
  monthlyData: MonthlyDataPoint[];
  expenseByCategory: CategoryDataPoint[];
  projectCostDistribution: CategoryDataPoint[];
  paymentStatusData: PaymentStatusDataPoint[];
  projectStatusData: ProjectStatusDataPoint[];
}

export function DashboardCharts({
  monthlyData,
  expenseByCategory,
  projectCostDistribution,
  paymentStatusData,
  projectStatusData,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Monthly Input vs Output */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Monthly Input vs Output</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={formatCurrencyShort}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => formatCurrencyShort(value)}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
              <Area
                type="monotone"
                dataKey="input"
                name="Input"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#inputGrad)"
              />
              <Area
                type="monotone"
                dataKey="output"
                name="Output"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#outputGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Difference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Difference</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={formatCurrencyShort}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => formatCurrencyShort(value)}
              />
              <Line
                type="monotone"
                dataKey="difference"
                name="Difference"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expense by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseByCategory.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              No expense data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={expenseByCategory}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={formatCurrencyShort}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={90}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => formatCurrencyShort(value)}
                />
                <Bar
                  dataKey="value"
                  name="Amount"
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Project Cost Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Cost Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {projectCostDistribution.every((d) => d.value === 0) ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              No project data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={projectCostDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {projectCostDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Payment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentStatusData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              No payment data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={paymentStatusData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: string) =>
                    v.charAt(0).toUpperCase() + v.slice(1)
                  }
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) =>
                    name === 'amount' ? formatCurrencyShort(value) : value
                  }
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                <Bar
                  dataKey="count"
                  name="Count"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="amount"
                  name="Amount"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Project Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Status</CardTitle>
        </CardHeader>
        <CardContent>
          {projectStatusData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              No project data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {projectStatusData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                  iconType="circle"
                  formatter={(value: string) =>
                    value
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
