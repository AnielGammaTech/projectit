import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Circle,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import ManageITShell from '@/components/assets/ManageITShell';
import { downloadCSV } from '@/utils/csvExport';

const TABS = ['All Assets', 'By Employee', 'Consent Forms', 'Value & Cost'];

function AppleLogo({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsLogo({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 12V6.5l8-1.1V12H3zm10 0V5.2l8-1.2V12h-8zM3 13h8v6.6l-8-1.1V13zm10 0h8v6l-8 1.2V13z" />
    </svg>
  );
}

function getOsIcon(asset) {
  const os = (asset.os || '').toLowerCase();
  const manufacturer = (asset.manufacturer || '').toLowerCase();
  const model = (asset.model || '').toLowerCase();
  const isApple =
    os.includes('mac') || os.includes('ios') || os.includes('darwin') ||
    manufacturer.includes('apple') || model.includes('mac') ||
    model.includes('iphone') || model.includes('ipad');
  const isWindows = os.includes('windows') || os.includes('win');
  if (isApple) return { Icon: AppleLogo, label: 'macOS' };
  if (isWindows) return { Icon: WindowsLogo, label: 'Windows' };
  return null;
}

function relativeTime(dateStr) {
  if (!dateStr) return '--';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {active ? (
        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

function HorizontalBar({ label, value, max, color = 'bg-emerald-700' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{formatCurrency(value)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TabAllAssets({ assets, employeeMap, assignments, search }) {
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const activeAssignmentMap = useMemo(() => {
    const map = new Map();
    for (const a of assignments) {
      if (!a.returned_date && a.employee_id) {
        map.set(a.asset_id, a.employee_id);
      }
    }
    return map;
  }, [assignments]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = assets.filter((a) => {
      const empId = activeAssignmentMap.get(a.id);
      const emp = empId ? employeeMap.get(empId) : null;
      const empName = emp ? `${emp.first_name} ${emp.last_name}` : '';
      return (
        (a.name || '').toLowerCase().includes(q) ||
        (a.serial_number || '').toLowerCase().includes(q) ||
        (a.model || '').toLowerCase().includes(q) ||
        empName.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      return valA < valB ? -dir : valA > valB ? dir : 0;
    });
  }, [assets, search, sortField, sortDir, activeAssignmentMap, employeeMap]);

  const handleExportCsv = () => {
    const headers = ['Name', 'Type', 'OS', 'Serial Number', 'Model', 'Employee', 'Status', 'Online', 'Last Contact', 'Condition'];
    const csvRows = rows.map((asset) => {
      const empId = activeAssignmentMap.get(asset.id);
      const emp = empId ? employeeMap.get(empId) : null;
      return [
        asset.name || '',
        asset.type || '',
        asset.os || '',
        asset.serial_number || '',
        asset.model || '',
        emp ? `${emp.first_name} ${emp.last_name}` : '',
        asset.status || '',
        asset.device_active ? 'Yes' : 'No',
        asset.last_contact || '',
        asset.condition || '',
      ];
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(`all-assets-${date}.csv`, headers, csvRows);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="w-4 h-4 mr-1" />
          Download CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 dark:bg-slate-900/50">
            <th className="px-4 py-3 text-left"><SortHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
            <th className="px-4 py-3 text-left"><SortHeader label="Type" field="asset_type" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
            <th className="px-4 py-3 text-left"><SortHeader label="OS" field="os" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</th>
            <th className="px-4 py-3 text-left"><SortHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Online</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Contact</th>
            <th className="px-4 py-3 text-left"><SortHeader label="Condition" field="condition" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((asset) => {
            const osInfo = getOsIcon(asset);
            const empId = activeAssignmentMap.get(asset.id);
            const emp = empId ? employeeMap.get(empId) : null;
            const isOnline = asset.device_active;
            return (
              <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="px-4 py-2.5 font-medium text-foreground">{asset.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{asset.asset_type || '--'}</td>
                <td className="px-4 py-2.5">
                  {osInfo ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <osInfo.Icon className="w-4 h-4" />
                      <span className="text-xs">{asset.os_version || osInfo.label}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">{asset.os || '--'}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {emp ? `${emp.first_name} ${emp.last_name}` : '--'}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={cn('text-xs', asset.status === 'Available' && 'border-emerald-300 text-emerald-700 dark:text-emerald-400', asset.status === 'Assigned' && 'border-blue-300 text-blue-700 dark:text-blue-400')}>
                    {asset.status || '--'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Circle className={cn('w-2.5 h-2.5 mx-auto', isOnline ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600')} />
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{relativeTime(asset.last_contact)}</td>
                <td className="px-4 py-2.5">
                  <span className={cn('text-xs font-medium', asset.condition === 'New' && 'text-emerald-600 dark:text-emerald-400', asset.condition === 'Good' && 'text-blue-600 dark:text-blue-400', asset.condition === 'Fair' && 'text-amber-600 dark:text-amber-400', asset.condition === 'Damaged' && 'text-red-600 dark:text-red-400')}>
                    {asset.condition || '--'}
                  </span>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No assets found</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function TabByEmployee({ employees, assignments, assets }) {
  const [expanded, setExpanded] = useState(new Set());

  const toggle = (empId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const employeeDevices = useMemo(() => {
    const activeByEmp = {};
    for (const a of assignments) {
      if (!a.returned_date && a.employee_id) {
        if (!activeByEmp[a.employee_id]) activeByEmp[a.employee_id] = [];
        activeByEmp[a.employee_id].push(a.asset_id);
      }
    }
    return employees
      .map((emp) => ({
        ...emp,
        fullName: `${emp.first_name} ${emp.last_name}`,
        deviceIds: activeByEmp[emp.id] || [],
      }))
      .filter((e) => e.deviceIds.length > 0)
      .sort((a, b) => b.deviceIds.length - a.deviceIds.length);
  }, [employees, assignments]);

  const handleExportCsv = () => {
    const headers = ['Employee Name', 'Department', 'Device Count', 'Device Names'];
    const csvRows = employeeDevices.map((emp) => [
      emp.fullName,
      emp.department || '',
      String(emp.deviceIds.length),
      emp.deviceIds.map((id) => assetMap.get(id)?.name || '').filter(Boolean).join('; '),
    ]);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(`assets-by-employee-${date}.csv`, headers, csvRows);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="w-4 h-4 mr-1" />
          Download CSV
        </Button>
      </div>
      {employeeDevices.map((emp) => {
        const isOpen = expanded.has(emp.id);
        return (
          <div key={emp.id} className="rounded-xl border bg-card overflow-hidden">
            <button
              onClick={() => toggle(emp.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="font-medium text-foreground">{emp.fullName}</span>
                <span className="text-xs text-muted-foreground">{emp.department || 'No dept'}</span>
              </div>
              <Badge variant="outline" className="text-xs">{emp.deviceIds.length} device{emp.deviceIds.length !== 1 ? 's' : ''}</Badge>
            </button>
            {isOpen && (
              <div className="border-t divide-y divide-slate-100 dark:divide-slate-800">
                {emp.deviceIds.map((assetId) => {
                  const asset = assetMap.get(assetId);
                  if (!asset) return null;
                  const osInfo = getOsIcon(asset);
                  return (
                    <div key={assetId} className="flex items-center gap-3 px-8 py-2.5 text-sm">
                      {osInfo && <osInfo.Icon className="w-4 h-4 text-muted-foreground" />}
                      <span className="font-medium text-foreground">{asset.name}</span>
                      <span className="text-muted-foreground text-xs">{asset.serial_number || ''}</span>
                      <Badge variant="outline" className="ml-auto text-xs">{asset.condition || '--'}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {employeeDevices.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">No employees with assigned devices</p>
      )}
    </div>
  );
}

function TabConsentForms({ acceptances, assets, assignments, employeeMap }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const assignmentMap = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);

  const rows = useMemo(() => {
    return acceptances
      .map((acc) => {
        const assignment = assignmentMap.get(acc.assignment_id);
        const asset = acc.asset_id ? assetMap.get(acc.asset_id) : (assignment ? assetMap.get(assignment.asset_id) : null);
        const emp = assignment?.employee_id ? employeeMap.get(assignment.employee_id) : null;
        return { ...acc, assetName: asset?.name || 'Unknown', empName: emp ? `${emp.first_name} ${emp.last_name}` : '--' };
      })
      .filter((r) => statusFilter === 'all' || r.status === statusFilter);
  }, [acceptances, statusFilter, assetMap, assignmentMap, employeeMap]);

  const STATUS_BADGE = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    signed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const handleExportCsv = () => {
    const headers = ['Asset Name', 'Employee', 'Status', 'Signed Date', 'Signer Name'];
    const csvRows = rows.map((r) => [
      r.assetName,
      r.empName,
      r.status || '',
      r.signed_at ? format(new Date(r.signed_at), 'MMM d, yyyy') : '',
      r.signer_name || '',
    ]);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(`consent-forms-${date}.csv`, headers, csvRows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'pending', 'signed', 'expired'].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            className={cn(statusFilter === s && 'bg-emerald-700 hover:bg-emerald-800 text-white')}
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="ml-auto">
          <Download className="w-4 h-4 mr-1" />
          Download CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-900/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signed Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="px-4 py-2.5 font-medium text-foreground">{r.assetName}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.empName}</td>
                <td className="px-4 py-2.5">
                  <Badge className={cn('text-xs capitalize', STATUS_BADGE[r.status] || '')}>{r.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {r.signed_at ? format(new Date(r.signed_at), 'MMM d, yyyy') : '--'}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.signer_name || '--'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No consent forms found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabValueCost({ assets, employees, assignments }) {
  const totalValue = useMemo(() => assets.reduce((s, a) => s + (Number(a.purchase_cost) || 0), 0), [assets]);
  const avgCost = assets.length > 0 ? totalValue / assets.length : 0;

  const costByType = useMemo(() => {
    const map = {};
    for (const a of assets) {
      const type = a.type || 'Other';
      map[type] = (map[type] || 0) + (Number(a.purchase_cost) || 0);
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [assets]);

  const costByDept = useMemo(() => {
    const employeeMap = new Map(employees.map((e) => [e.id, e]));
    const activeByAsset = {};
    for (const a of assignments) {
      if (!a.returned_date && a.employee_id) {
        activeByAsset[a.asset_id] = a.employee_id;
      }
    }
    const deptCosts = {};
    for (const asset of assets) {
      const empId = activeByAsset[asset.id];
      const emp = empId ? employeeMap.get(empId) : null;
      const dept = emp?.department || 'Unassigned';
      deptCosts[dept] = (deptCosts[dept] || 0) + (Number(asset.purchase_cost) || 0);
    }
    return Object.entries(deptCosts).sort(([, a], [, b]) => b - a);
  }, [assets, employees, assignments]);

  const maxType = costByType.length > 0 ? costByType[0][1] : 0;
  const maxDept = costByDept.length > 0 ? costByDept[0][1] : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Fleet Value</p>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalValue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground mb-1">Average Device Cost</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(avgCost)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Cost by Type</h3>
        <div className="space-y-3">
          {costByType.map(([type, value]) => (
            <HorizontalBar key={type} label={type} value={value} max={maxType} color="bg-emerald-700 dark:bg-emerald-600" />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Cost by Department</h3>
        <div className="space-y-3">
          {costByDept.map(([dept, value]) => (
            <HorizontalBar key={dept} label={dept} value={value} max={maxDept} color="bg-emerald-800 dark:bg-emerald-500" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AssetReports() {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('-created_date'),
    staleTime: 0,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
    staleTime: 0,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list('last_name'),
    staleTime: 0,
  });

  const { data: acceptances = [], isLoading: loadingAcceptances } = useQuery({
    queryKey: ['assetAcceptances'],
    queryFn: () => api.entities.AssetAcceptance.list('-created_date'),
    staleTime: 0,
  });

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const isLoading = loadingAssets || loadingAssignments || loadingEmployees || loadingAcceptances;

  if (isLoading) {
    return (
      <ManageITShell>
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
          <CardGridSkeleton />
        </div>
      </ManageITShell>
    );
  }

  return (
    <ManageITShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === i
                  ? 'border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search bar for tabs that need it */}
        {(activeTab === 0) && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, serial, model, employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 0 && (
            <TabAllAssets
              assets={assets}
              employeeMap={employeeMap}
              assignments={assignments}
              search={search}
            />
          )}
          {activeTab === 1 && (
            <TabByEmployee
              employees={employees}
              assignments={assignments}
              assets={assets}
            />
          )}
          {activeTab === 2 && (
            <TabConsentForms
              acceptances={acceptances}
              assets={assets}
              assignments={assignments}
              employeeMap={employeeMap}
            />
          )}
          {activeTab === 3 && (
            <TabValueCost
              assets={assets}
              employees={employees}
              assignments={assignments}
            />
          )}
        </motion.div>
      </div>
    </ManageITShell>
  );
}
