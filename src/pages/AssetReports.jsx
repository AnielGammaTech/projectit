import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import {
  PieChart,
  Monitor,
  Smartphone,
  Key,
  Car,
  Wrench,
  Box,
  DollarSign,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import AssetStatsCard from '@/components/assets/AssetStatsCard';

const TYPE_CONFIG = {
  'IT Equipment': { icon: Monitor, color: 'bg-blue-500', barColor: 'bg-blue-500' },
  'Mobile Device': { icon: Smartphone, color: 'bg-purple-500', barColor: 'bg-purple-500' },
  'Software License': { icon: Key, color: 'bg-emerald-500', barColor: 'bg-emerald-500' },
  'Vehicle': { icon: Car, color: 'bg-orange-500', barColor: 'bg-orange-500' },
  'Physical Tool': { icon: Wrench, color: 'bg-rose-500', barColor: 'bg-rose-500' },
};

const STATUS_CONFIG = {
  'Available': { color: 'bg-emerald-500' },
  'Assigned': { color: 'bg-blue-500' },
  'Returned': { color: 'bg-amber-500' },
};

const CONDITION_CONFIG = {
  'New': { color: 'bg-emerald-500' },
  'Good': { color: 'bg-blue-500' },
  'Fair': { color: 'bg-amber-500' },
  'Damaged': { color: 'bg-red-500' },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || { icon: Box, color: 'bg-slate-500', barColor: 'bg-slate-500' };
}

function DistributionBar({ items, total }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {item.icon && (
                  <div className={cn('p-1 rounded', item.iconBg || 'bg-slate-100 dark:bg-slate-800')}>
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <span className="text-muted-foreground">
                {item.count} ({percentage}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', item.barColor)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportCard({ title, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border bg-white dark:bg-card p-5 shadow-warm"
    >
      <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function AssetReports() {
  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('-created_date'),
    staleTime: 300000,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
    staleTime: 300000,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list('last_name'),
    staleTime: 300000,
  });

  const totalAssets = assets.length;

  const totalValue = useMemo(() => {
    return assets.reduce((sum, a) => sum + (Number(a.purchase_cost) || 0), 0);
  }, [assets]);

  const activeAssignments = useMemo(() => {
    return assignments.filter((a) => !a.returned_date);
  }, [assignments]);

  const typeDistribution = useMemo(() => {
    const counts = {};
    for (const asset of assets) {
      const type = asset.asset_type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => {
        const config = getTypeConfig(label);
        return {
          label,
          count,
          icon: config.icon,
          iconBg: config.color,
          barColor: config.barColor,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [assets]);

  const statusDistribution = useMemo(() => {
    const counts = {};
    for (const asset of assets) {
      const status = asset.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => {
        const config = STATUS_CONFIG[label] || { color: 'bg-slate-500' };
        return { label, count, barColor: config.color };
      })
      .sort((a, b) => b.count - a.count);
  }, [assets]);

  const conditionDistribution = useMemo(() => {
    const counts = {};
    for (const asset of assets) {
      const condition = asset.condition || 'Unknown';
      counts[condition] = (counts[condition] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => {
        const config = CONDITION_CONFIG[label] || { color: 'bg-slate-500' };
        return { label, count, barColor: config.color };
      })
      .sort((a, b) => b.count - a.count);
  }, [assets]);

  const topHolders = useMemo(() => {
    const holderCounts = {};
    for (const assignment of activeAssignments) {
      const empId = assignment.employee_id;
      if (empId) {
        holderCounts[empId] = (holderCounts[empId] || 0) + 1;
      }
    }
    const employeeMap = new Map(employees.map((e) => [e.id, e]));
    return Object.entries(holderCounts)
      .map(([empId, count]) => {
        const emp = employeeMap.get(empId);
        const name = emp
          ? `${emp.first_name} ${emp.last_name}`
          : 'Unknown Employee';
        return { name, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [activeAssignments, employees]);

  if (loadingAssets || loadingAssignments || loadingEmployees) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <CardGridSkeleton />
      </div>
    );
  }

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalValue);

  const uniqueEmployeeIds = new Set(
    activeAssignments.map((a) => a.employee_id).filter(Boolean)
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
          <PieChart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Asset Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalAssets} total asset{totalAssets !== 1 ? 's' : ''}
          </p>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AssetStatsCard
          title="Total Assets"
          value={totalAssets}
          icon={Box}
          iconColor="bg-[#0F2F44]"
          delay={0}
        />
        <AssetStatsCard
          title="Total Value"
          value={formattedValue}
          icon={DollarSign}
          iconColor="bg-emerald-600"
          delay={0.05}
        />
        <AssetStatsCard
          title="Employees"
          value={uniqueEmployeeIds.size}
          icon={Users}
          iconColor="bg-blue-600"
          delay={0.1}
        />
        <AssetStatsCard
          title="Active Assignments"
          value={activeAssignments.length}
          icon={ClipboardCheck}
          iconColor="bg-purple-600"
          delay={0.15}
        />
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReportCard title="Assets by Type" delay={0.1}>
          {typeDistribution.length > 0 ? (
            <DistributionBar items={typeDistribution} total={totalAssets} />
          ) : (
            <p className="text-sm text-muted-foreground">No assets found</p>
          )}
        </ReportCard>

        <ReportCard title="Assets by Status" delay={0.15}>
          {statusDistribution.length > 0 ? (
            <DistributionBar items={statusDistribution} total={totalAssets} />
          ) : (
            <p className="text-sm text-muted-foreground">No assets found</p>
          )}
        </ReportCard>

        <ReportCard title="Assets by Condition" delay={0.2}>
          {conditionDistribution.length > 0 ? (
            <DistributionBar items={conditionDistribution} total={totalAssets} />
          ) : (
            <p className="text-sm text-muted-foreground">No assets found</p>
          )}
        </ReportCard>

        <ReportCard title="Top Asset Holders" delay={0.25}>
          {topHolders.length > 0 ? (
            <div className="space-y-3">
              {topHolders.map((holder, i) => (
                <div
                  key={holder.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground">
                      {holder.name}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {holder.count} asset{holder.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active assignments
            </p>
          )}
        </ReportCard>
      </div>
    </div>
  );
}
