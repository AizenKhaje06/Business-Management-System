import {
  DollarSign,
  Receipt,
  TrendingDown,
  Package,
  HardHat,
  MoreHorizontal,
  Wallet,
  Scale,
} from 'lucide-react';
import type { ProjectCosting, CostBreakdownEntry } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ProjectCostingProps {
  costing: ProjectCosting;
  breakdown: CostBreakdownEntry[];
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(v);
}

const groupLabels: Record<string, string> = {
  material: 'Material',
  labor: 'Labor',
  other: 'Other',
};

const groupColors: Record<string, string> = {
  material: 'bg-teal-100 text-teal-700',
  labor: 'bg-blue-100 text-blue-700',
  other: 'bg-gray-100 text-gray-700',
};

export function ProjectCosting({ costing, breakdown }: ProjectCostingProps) {
  const isNegative = costing.project_difference < 0;

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contract Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costing.contract_amount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(costing.total_payments)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(costing.outstanding_balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contract - Payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Material Cost
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-teal-600">
              {formatCurrency(costing.material_cost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Labor Cost
            </CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(costing.labor_cost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Other Cost
            </CardTitle>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-600">
              {formatCurrency(costing.other_cost)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-muted/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Project Cost
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costing.total_project_cost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved expenses only
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Project Difference
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                isNegative ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(costing.project_difference)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contract - Total Project Cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown by Category Table */}
      {breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Cost Breakdown by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost Group</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {entry.category_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={groupColors[entry.cost_group]}
                        >
                          {groupLabels[entry.cost_group]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {entry.expense_count}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
