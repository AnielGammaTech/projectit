# ManageIT Asset Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an asset management module (ManageIT) to ProjectIT for tracking company assets assigned to employees, with JumpCloud employee sync, digital signatures, and license expiry alerts.

**Architecture:** New entity types (Asset, AssetAssignment, Employee) using ProjectIT's existing JSONB entity pattern. New pages under `/Assets*` routes. JumpCloud sync as a server-side function. Shares existing Supabase auth, database, and Railway deployment.

**Tech Stack:** React + Vite, shadcn/ui, Tailwind, Lucide icons, Framer Motion, Express, PostgreSQL JSONB, JumpCloud API

---

### Task 1: Database Migration — Create Entity Tables

**Files:**
- Create: `server/src/db/migrations/009_create_asset_tables.sql`
- Modify: `server/src/db/migrate.js:16-24`

- [ ] **Step 1: Create migration file**

```sql
-- ManageIT module: Asset, AssetAssignment, Employee tables

CREATE TABLE IF NOT EXISTS "Asset" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_asset_data ON "Asset" USING GIN (data);

CREATE TABLE IF NOT EXISTS "AssetAssignment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_assetassignment_data ON "AssetAssignment" USING GIN (data);

CREATE TABLE IF NOT EXISTS "Employee" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_employee_data ON "Employee" USING GIN (data);
```

- [ ] **Step 2: Register migration in migrate.js**

Add `'009_create_asset_tables.sql'` to the migrations array in `server/src/db/migrate.js`:

```javascript
const migrations = [
  '001_create_users.sql',
  '002_create_entity_tables.sql',
  '003_add_invite_columns.sql',
  '004_add_supabase_uid.sql',
  '005_create_file_comment_table.sql',
  '006_create_stock_tables.sql',
  '007_create_apikey_table.sql',
  '008_create_device_token_table.sql',
  '009_create_asset_tables.sql',
];
```

- [ ] **Step 3: Commit**

```bash
git add server/src/db/migrations/009_create_asset_tables.sql server/src/db/migrate.js
git commit -m "feat: add database migration for ManageIT entity tables"
```

---

### Task 2: Register Entity Types in Backend

**Files:**
- Modify: `server/src/services/entityService.js:4-15`
- Modify: `server/src/routes/entities.js:15-18`

- [ ] **Step 1: Add entities to VALID_ENTITIES set**

In `server/src/services/entityService.js`, add `'Asset'`, `'AssetAssignment'`, and `'Employee'` to the `VALID_ENTITIES` set:

```javascript
const VALID_ENTITIES = new Set([
  'AppSettings', 'AuditLog', 'ChangeOrder', 'CommunicationLog', 'CustomRole',
  'Customer', 'DashboardView', 'EmailTemplate', 'Feedback', 'FileComment', 'FileFolder',
  'IncomingQuote', 'IntegrationSettings', 'InventoryItem', 'InventoryTransaction',
  'NotificationSettings', 'Part', 'Product', 'ProductTransaction', 'ProgressUpdate', 'Project',
  'ProjectActivity', 'ProjectFile', 'ProjectNote', 'ProjectStack', 'ProjectStatus',
  'ProjectTag', 'ProjectTemplate', 'Proposal', 'ProposalSettings', 'QuoteRequest',
  'SavedReport', 'Service', 'ServiceBundle', 'Site', 'Task', 'TaskComment', 'Ticket',
  'TaskGroup', 'TeamMember', 'TimeEntry', 'Tool', 'ToolTransaction',
  'DeviceToken', 'UserGroup', 'UserNotification',
  'UserSecuritySettings', 'UserSession', 'ApiKey', 'Workflow', 'WorkflowLog',
  'Asset', 'AssetAssignment', 'Employee',
]);
```

- [ ] **Step 2: Add Asset and AssetAssignment to admin-write guard**

In `server/src/routes/entities.js`, add to `ADMIN_WRITE_ENTITIES` so only admins can create/update/delete assets but employees can read:

```javascript
const ADMIN_WRITE_ENTITIES = new Set([
  'AppSettings', 'ProjectTemplate', 'ProjectStatus', 'ProjectStack',
  'Workflow', 'WorkflowLog', 'ProposalSettings',
  'Asset', 'AssetAssignment', 'Employee',
]);
```

- [ ] **Step 3: Add cascade delete for Asset**

In `server/src/services/entityService.js`, add to `CASCADE_MAP` after the existing entries:

```javascript
Asset: [
  { entity: 'AssetAssignment', foreignKey: 'asset_id' },
],
Employee: [
  { entity: 'AssetAssignment', foreignKey: 'employee_id' },
],
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/entityService.js server/src/routes/entities.js
git commit -m "feat: register ManageIT entities with admin guards and cascade deletes"
```

---

### Task 3: JumpCloud Sync Server Function

**Files:**
- Create: `server/src/routes/functions/syncJumpCloudEmployees.js`
- Modify: `server/src/routes/functions/index.js` (add route)

- [ ] **Step 1: Create JumpCloud sync function**

```javascript
import entityService from '../../services/entityService.js';

export default async function syncJumpCloudEmployees(req, res) {
  const apiKey = process.env.JUMPCLOUD_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'JUMPCLOUD_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://console.jumpcloud.com/api/systemusers', {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `JumpCloud API error: ${text}` });
    }

    const { results: jcUsers } = await response.json();
    const existingEmployees = await entityService.list('Employee');
    const existingByJcId = new Map(
      existingEmployees.map(e => [e.jumpcloud_id, e])
    );

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    const seenJcIds = new Set();

    for (const jcUser of jcUsers) {
      seenJcIds.add(jcUser._id);
      const employeeData = {
        jumpcloud_id: jcUser._id,
        first_name: jcUser.firstname || '',
        last_name: jcUser.lastname || '',
        email: jcUser.email || '',
        department: jcUser.department || '',
        job_title: jcUser.jobTitle || '',
        location: jcUser.location || '',
        status: jcUser.suspended ? 'Suspended' : 'Active',
        last_synced: new Date().toISOString(),
      };

      const existing = existingByJcId.get(jcUser._id);
      if (existing) {
        await entityService.update('Employee', existing.id, employeeData);
        updated++;
      } else {
        await entityService.create('Employee', employeeData);
        created++;
      }
    }

    // Mark employees not in JumpCloud as Inactive
    for (const [jcId, employee] of existingByJcId) {
      if (!seenJcIds.has(jcId) && employee.status !== 'Inactive') {
        await entityService.update('Employee', employee.id, {
          ...employee,
          status: 'Inactive',
          last_synced: new Date().toISOString(),
        });
        deactivated++;
      }
    }

    return res.json({
      success: true,
      summary: { created, updated, deactivated, total: jcUsers.length },
    });
  } catch (error) {
    console.error('JumpCloud sync error:', error);
    return res.status(500).json({ error: 'JumpCloud sync failed' });
  }
}
```

- [ ] **Step 2: Register the route**

In `server/src/routes/functions/index.js`, add the import and route:

```javascript
import syncJumpCloudEmployees from './syncJumpCloudEmployees.js';

// Add with other function routes:
router.post('/sync-jumpcloud', syncJumpCloudEmployees);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/functions/syncJumpCloudEmployees.js server/src/routes/functions/index.js
git commit -m "feat: add JumpCloud employee sync server function"
```

---

### Task 4: Asset Dashboard Page

**Files:**
- Create: `src/pages/AssetDashboard.jsx`
- Create: `src/components/assets/AssetStatsCard.jsx`

- [ ] **Step 1: Create AssetStatsCard component**

```jsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AssetStatsCard({ title, value, icon: Icon, iconColor, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3.5 border-l-4 border-l-[#0F2F44] dark:border-l-slate-600 bg-white dark:bg-card shadow-warm"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={cn("p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0", iconColor || "bg-[#0F2F44]")}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs leading-tight font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <p className="text-xl sm:text-2xl font-bold leading-tight tracking-tight text-foreground">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create AssetDashboard page**

```jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import {
  Monitor, Smartphone, Key, Car, Wrench, Package,
  Users, AlertTriangle, CheckCircle, Clock, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import AssetStatsCard from '@/components/assets/AssetStatsCard';
import { createPageUrl } from '@/utils';

const ASSET_TYPE_ICONS = {
  'IT Equipment': Monitor,
  'Mobile Device': Smartphone,
  'Software License': Key,
  'Vehicle': Car,
  'Physical Tool': Wrench,
};

const ASSET_TYPE_COLORS = {
  'IT Equipment': 'bg-blue-500',
  'Mobile Device': 'bg-purple-500',
  'Software License': 'bg-emerald-500',
  'Vehicle': 'bg-orange-500',
  'Physical Tool': 'bg-rose-500',
};

export default function AssetDashboard() {
  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('-created_date'),
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list('last_name'),
  });

  if (loadingAssets || loadingAssignments || loadingEmployees) return <CardGridSkeleton />;

  const totalAssets = assets.length;
  const assignedAssets = assets.filter(a => a.status === 'Assigned').length;
  const availableAssets = assets.filter(a => a.status === 'Available').length;
  const returnedAssets = assets.filter(a => a.status === 'Returned').length;

  // Group by type
  const byType = {};
  for (const asset of assets) {
    const type = asset.type || 'Other';
    byType[type] = (byType[type] || 0) + 1;
  }

  // Expiring licenses (within 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringLicenses = assets.filter(a =>
    a.type === 'Software License' && a.expiry_date &&
    new Date(a.expiry_date) <= thirtyDaysFromNow && new Date(a.expiry_date) >= now
  );

  // Overdue returns: inactive employees with active assignments
  const inactiveEmployeeIds = new Set(
    employees.filter(e => e.status === 'Inactive').map(e => e.id)
  );
  const overdueAssignments = assignments.filter(a =>
    !a.returned_date && inactiveEmployeeIds.has(a.employee_id)
  );

  // Recent assignments
  const recentAssignments = assignments.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30 shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">ManageIT</h1>
            <p className="text-xs text-muted-foreground">Asset Management</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <AssetStatsCard title="Total Assets" value={totalAssets} icon={Package} iconColor="bg-slate-600" />
          <AssetStatsCard title="Assigned" value={assignedAssets} icon={Users} iconColor="bg-blue-500" />
          <AssetStatsCard title="Available" value={availableAssets} icon={CheckCircle} iconColor="bg-emerald-500" />
          <AssetStatsCard title="Returned" value={returnedAssets} icon={Clock} iconColor="bg-amber-500" />
        </div>

        {/* Alerts */}
        {expiringLicenses.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/20 p-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                  {expiringLicenses.length} license{expiringLicenses.length !== 1 ? 's' : ''} expiring within 30 days
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70 truncate">
                  {expiringLicenses.slice(0, 3).map(l => l.name).join(', ')}
                </p>
              </div>
              <Link to={createPageUrl('AssetLicenses')} className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {overdueAssignments.length > 0 && (
          <div className="mb-4 rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/80 dark:bg-red-900/20 p-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-red-800 dark:text-red-300">
                  {overdueAssignments.length} asset{overdueAssignments.length !== 1 ? 's' : ''} assigned to inactive employees
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Assets by Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {Object.entries(byType).map(([type, count]) => {
            const TypeIcon = ASSET_TYPE_ICONS[type] || Package;
            const color = ASSET_TYPE_COLORS[type] || 'bg-slate-500';
            return (
              <AssetStatsCard key={type} title={type} value={count} icon={TypeIcon} iconColor={color} />
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-white dark:bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Assignments</h2>
            <Link to={createPageUrl('AssetInventory')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No assignments yet</p>
          ) : (
            <div className="space-y-2">
              {recentAssignments.map(assignment => {
                const asset = assets.find(a => a.id === assignment.asset_id);
                const employee = employees.find(e => e.id === assignment.employee_id);
                return (
                  <div key={assignment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{asset?.name || 'Unknown asset'}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown employee'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString() : ''}
                      </p>
                      {assignment.returned_date && (
                        <p className="text-[10px] text-emerald-600">Returned</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/assets/AssetStatsCard.jsx src/pages/AssetDashboard.jsx
git commit -m "feat: add ManageIT dashboard page with stats, alerts, and recent activity"
```

---

### Task 5: Asset Inventory Page (List + CRUD)

**Files:**
- Create: `src/pages/AssetInventory.jsx`
- Create: `src/components/assets/AssetModal.jsx`

- [ ] **Step 1: Create AssetModal component**

```jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const ASSET_TYPES = ['IT Equipment', 'Mobile Device', 'Software License', 'Vehicle', 'Physical Tool'];
const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged'];
const STATUSES = ['Available', 'Assigned', 'Returned'];

const EMPTY_FORM = {
  name: '', type: 'IT Equipment', serial_number: '', model: '', manufacturer: '',
  purchase_date: '', purchase_cost: '', status: 'Available', condition: 'New',
  location: '', license_key: '', expiry_date: '', notes: '',
};

export default function AssetModal({ open, onClose, asset, onSave }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        type: asset.type || 'IT Equipment',
        serial_number: asset.serial_number || '',
        model: asset.model || '',
        manufacturer: asset.manufacturer || '',
        purchase_date: asset.purchase_date || '',
        purchase_cost: asset.purchase_cost || '',
        status: asset.status || 'Available',
        condition: asset.condition || 'New',
        location: asset.location || '',
        license_key: asset.license_key || '',
        expiry_date: asset.expiry_date || '',
        notes: asset.notes || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [asset, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Asset name is required');
      return;
    }
    setSaving(true);
    try {
      if (asset) {
        await api.entities.Asset.update(asset.id, formData);
        toast.success('Asset updated');
      } else {
        await api.entities.Asset.create(formData);
        toast.success('Asset created');
      }
      onSave?.();
      onClose();
    } catch (error) {
      toast.error('Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const isSoftware = formData.type === 'Software License';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. MacBook Pro 16-inch" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={v => setFormData({ ...formData, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Main Office" />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={formData.purchase_date} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} />
            </div>
            <div>
              <Label>Purchase Cost</Label>
              <Input type="number" step="0.01" value={formData.purchase_cost} onChange={e => setFormData({ ...formData, purchase_cost: e.target.value })} placeholder="0.00" />
            </div>
          </div>

          {isSoftware && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/50 border border-border">
              <div>
                <Label>License Key</Label>
                <Input value={formData.license_key} onChange={e => setFormData({ ...formData, license_key: e.target.value })} />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
              </div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : asset ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create AssetInventory page**

```jsx
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import {
  Monitor, Smartphone, Key, Car, Wrench, Package, Plus,
  Search, MoreHorizontal, Pencil, Trash2, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import AssetModal from '@/components/assets/AssetModal';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const TYPE_ICONS = {
  'IT Equipment': Monitor,
  'Mobile Device': Smartphone,
  'Software License': Key,
  'Vehicle': Car,
  'Physical Tool': Wrench,
};

const STATUS_COLORS = {
  Available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Returned: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const CONDITION_COLORS = {
  New: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Damaged: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AssetInventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, asset: null });
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('-created_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
  });

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = !searchQuery ||
        asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.model?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || asset.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [assets, searchQuery, typeFilter, statusFilter]);

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.asset) return;
    try {
      await api.entities.Asset.delete(deleteConfirm.asset.id);
      toast.success('Asset deleted');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch (error) {
      toast.error('Failed to delete asset');
    }
    setDeleteConfirm({ open: false, asset: null });
  };

  const getAssignedEmployee = (assetId) => {
    const activeAssignment = assignments.find(a => a.asset_id === assetId && !a.returned_date);
    if (!activeAssignment) return null;
    return employees.find(e => e.id === activeAssignment.employee_id);
  };

  if (isLoading) return <CardGridSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30 shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground">Asset Inventory</h1>
              <p className="text-xs text-muted-foreground">{assets.length} assets</p>
            </div>
          </div>
          <Button onClick={() => { setEditingAsset(null); setShowModal(true); }} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Asset
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="IT Equipment">IT Equipment</SelectItem>
              <SelectItem value="Mobile Device">Mobile Device</SelectItem>
              <SelectItem value="Software License">Software License</SelectItem>
              <SelectItem value="Vehicle">Vehicle</SelectItem>
              <SelectItem value="Physical Tool">Physical Tool</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="Returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Asset List */}
        <div className="rounded-2xl bg-white dark:bg-card border border-border overflow-hidden">
          {filteredAssets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No assets found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredAssets.map(asset => {
                const TypeIcon = TYPE_ICONS[asset.type] || Package;
                const assignedEmployee = getAssignedEmployee(asset.id);
                return (
                  <div key={asset.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className={cn("p-2 rounded-lg shrink-0", STATUS_COLORS[asset.status]?.split(' ')[0] || 'bg-muted')}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={createPageUrl('AssetDetail') + `?id=${asset.id}`} className="text-sm font-medium text-foreground hover:underline truncate block">
                        {asset.name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {[asset.manufacturer, asset.model, asset.serial_number].filter(Boolean).join(' - ')}
                      </p>
                    </div>
                    {assignedEmployee && (
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {assignedEmployee.first_name} {assignedEmployee.last_name}
                      </p>
                    )}
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[asset.status])}>
                      {asset.status}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0 hidden sm:inline-flex', CONDITION_COLORS[asset.condition])}>
                      {asset.condition}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AssetDetail') + `?id=${asset.id}`}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(asset)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm({ open: true, asset })}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AssetModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingAsset(null); }}
        asset={editingAsset}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['assets'] })}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, asset: null })}
        onConfirm={handleDelete}
        title="Delete Asset"
        description={`Are you sure you want to delete "${deleteConfirm.asset?.name}"? This will also remove all assignment history.`}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AssetInventory.jsx src/components/assets/AssetModal.jsx
git commit -m "feat: add asset inventory page with CRUD, filtering, and search"
```

---

### Task 6: Asset Detail Page

**Files:**
- Create: `src/pages/AssetDetail.jsx`

- [ ] **Step 1: Create AssetDetail page**

```jsx
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/api/apiClient';
import {
  Monitor, Smartphone, Key, Car, Wrench, Package,
  ArrowLeft, Pencil, Clock, User, MapPin, DollarSign,
  Hash, Calendar, FileText, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import AssetModal from '@/components/assets/AssetModal';
import { createPageUrl } from '@/utils';

const TYPE_ICONS = {
  'IT Equipment': Monitor,
  'Mobile Device': Smartphone,
  'Software License': Key,
  'Vehicle': Car,
  'Physical Tool': Wrench,
};

const STATUS_COLORS = {
  Available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Returned: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function AssetDetail() {
  const [searchParams] = useSearchParams();
  const assetId = searchParams.get('id');
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list(),
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
  });

  const asset = assets.find(a => a.id === assetId);
  const assetAssignments = useMemo(() =>
    assignments.filter(a => a.asset_id === assetId).sort((a, b) =>
      new Date(b.assigned_date || b.created_date) - new Date(a.assigned_date || a.created_date)
    ),
    [assignments, assetId]
  );

  if (loadingAssets || loadingAssignments) return <CardGridSkeleton />;
  if (!asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-semibold text-foreground">Asset not found</p>
          <Link to={createPageUrl('AssetInventory')} className="text-sm text-primary hover:underline mt-2 inline-block">
            Back to inventory
          </Link>
        </div>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[asset.type] || Package;

  const detailFields = [
    { label: 'Serial Number', value: asset.serial_number, icon: Hash },
    { label: 'Model', value: asset.model, icon: Monitor },
    { label: 'Manufacturer', value: asset.manufacturer, icon: Package },
    { label: 'Location', value: asset.location, icon: MapPin },
    { label: 'Purchase Date', value: asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : null, icon: Calendar },
    { label: 'Purchase Cost', value: asset.purchase_cost ? `$${Number(asset.purchase_cost).toFixed(2)}` : null, icon: DollarSign },
  ];

  const licenseFields = asset.type === 'Software License' ? [
    { label: 'License Key', value: asset.license_key, icon: Key },
    { label: 'Expiry Date', value: asset.expiry_date ? new Date(asset.expiry_date).toLocaleDateString() : null, icon: Calendar },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Back link */}
        <Link to={createPageUrl('AssetInventory')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to inventory
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shrink-0">
              <TypeIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{asset.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[asset.status])}>{asset.status}</Badge>
                <span className="text-xs text-muted-foreground">{asset.type}</span>
                <span className="text-xs text-muted-foreground">Condition: {asset.condition}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
        </div>

        {/* Details Grid */}
        <div className="rounded-2xl bg-white dark:bg-card border border-border p-4 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...detailFields, ...licenseFields].filter(f => f.value).map(field => (
              <div key={field.label} className="flex items-center gap-2">
                <field.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-medium text-foreground">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
          {asset.notes && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground">{asset.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assignment History */}
        <div className="rounded-2xl bg-white dark:bg-card border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Assignment History ({assetAssignments.length})
          </h2>
          {assetAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No assignment history</p>
          ) : (
            <div className="space-y-3">
              {assetAssignments.map(assignment => {
                const employee = employees.find(e => e.id === assignment.employee_id);
                const isActive = !assignment.returned_date;
                return (
                  <div key={assignment.id} className={cn(
                    "rounded-xl border p-3",
                    isActive ? "border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10" : "border-border"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown'}
                        </span>
                        {isActive && <Badge className="text-[10px] bg-blue-500">Active</Badge>}
                      </div>
                      {assignment.acknowledged && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-[10px]">Acknowledged</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Assigned: {assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString() : '-'}
                      </span>
                      {assignment.returned_date && (
                        <span>Returned: {new Date(assignment.returned_date).toLocaleDateString()}</span>
                      )}
                      {assignment.condition_at_checkout && (
                        <span>Checkout: {assignment.condition_at_checkout}</span>
                      )}
                      {assignment.condition_at_return && (
                        <span>Return: {assignment.condition_at_return}</span>
                      )}
                    </div>
                    {assignment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{assignment.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AssetModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        asset={asset}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['assets'] })}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AssetDetail.jsx
git commit -m "feat: add asset detail page with info grid and assignment history"
```

---

### Task 7: Assign/Return Page with Digital Signature

**Files:**
- Create: `src/pages/AssetAssign.jsx`
- Create: `src/components/assets/SignatureCanvas.jsx`

- [ ] **Step 1: Create SignatureCanvas component**

```jsx
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

export default function SignatureCanvas({ onSignatureChange, width = 400, height = 150 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasSignature) {
      onSignatureChange?.(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange?.(null);
  };

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-border bg-white dark:bg-card overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/50 pointer-events-none">
            Sign here
          </p>
        )}
      </div>
      {hasSignature && (
        <Button variant="ghost" size="sm" onClick={clear} className="mt-1">
          <Eraser className="w-3 h-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create AssetAssign page**

```jsx
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  ArrowRight, ArrowLeft, Package, User, CheckCircle, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import SignatureCanvas from '@/components/assets/SignatureCanvas';
import { toast } from 'sonner';

const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged'];

export default function AssetAssign() {
  const [activeTab, setActiveTab] = useState('assign');
  const queryClient = useQueryClient();

  // Assign state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [checkoutCondition, setCheckoutCondition] = useState('Good');
  const [assignNotes, setAssignNotes] = useState('');
  const [signatureData, setSignatureData] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Return state
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning] = useState(false);

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('name'),
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list('last_name'),
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
  });

  const availableAssets = useMemo(() => assets.filter(a => a.status === 'Available'), [assets]);
  const activeAssignments = useMemo(() => assignments.filter(a => !a.returned_date), [assignments]);

  const handleAssign = async () => {
    if (!selectedAssetId || !selectedEmployeeId) {
      toast.error('Select both an asset and an employee');
      return;
    }
    setAssigning(true);
    try {
      await api.entities.AssetAssignment.create({
        asset_id: selectedAssetId,
        employee_id: selectedEmployeeId,
        assigned_date: new Date().toISOString(),
        condition_at_checkout: checkoutCondition,
        notes: assignNotes,
        acknowledged: !!signatureData,
        acknowledged_date: signatureData ? new Date().toISOString() : null,
        signature_data: signatureData,
      });
      await api.entities.Asset.update(selectedAssetId, {
        ...assets.find(a => a.id === selectedAssetId),
        status: 'Assigned',
      });
      toast.success('Asset assigned');
      setSelectedAssetId('');
      setSelectedEmployeeId('');
      setCheckoutCondition('Good');
      setAssignNotes('');
      setSignatureData(null);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assetAssignments'] });
    } catch (error) {
      toast.error('Failed to assign asset');
    } finally {
      setAssigning(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedAssignmentId) {
      toast.error('Select an assignment to return');
      return;
    }
    setReturning(true);
    try {
      const assignment = assignments.find(a => a.id === selectedAssignmentId);
      await api.entities.AssetAssignment.update(selectedAssignmentId, {
        ...assignment,
        returned_date: new Date().toISOString(),
        condition_at_return: returnCondition,
        notes: [assignment.notes, returnNotes].filter(Boolean).join(' | '),
      });
      const asset = assets.find(a => a.id === assignment.asset_id);
      if (asset) {
        await api.entities.Asset.update(asset.id, {
          ...asset,
          status: 'Available',
          condition: returnCondition,
        });
      }
      toast.success('Asset returned');
      setSelectedAssignmentId('');
      setReturnCondition('Good');
      setReturnNotes('');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assetAssignments'] });
    } catch (error) {
      toast.error('Failed to return asset');
    } finally {
      setReturning(false);
    }
  };

  if (loadingAssets || loadingEmployees || loadingAssignments) return <CardGridSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Assign / Return</h1>
            <p className="text-xs text-muted-foreground">Manage asset assignments</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="assign" className="flex-1 gap-1">
              <ArrowRight className="w-4 h-4" /> Assign
            </TabsTrigger>
            <TabsTrigger value="return" className="flex-1 gap-1">
              <RotateCcw className="w-4 h-4" /> Return
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assign">
            <div className="rounded-2xl bg-white dark:bg-card border border-border p-4 space-y-4">
              <div>
                <Label>Asset</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger><SelectValue placeholder="Select an available asset" /></SelectTrigger>
                  <SelectContent>
                    {availableAssets.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === 'Active').map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} - {e.department || 'No dept'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition at Checkout</Label>
                <Select value={checkoutCondition} onValueChange={setCheckoutCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={assignNotes} onChange={e => setAssignNotes(e.target.value)} rows={2} placeholder="Optional notes..." />
              </div>
              <div>
                <Label>Employee Signature</Label>
                <SignatureCanvas onSignatureChange={setSignatureData} />
              </div>
              <Button onClick={handleAssign} disabled={assigning} className="w-full">
                {assigning ? 'Assigning...' : 'Assign Asset'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="return">
            <div className="rounded-2xl bg-white dark:bg-card border border-border p-4 space-y-4">
              <div>
                <Label>Active Assignment</Label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                  <SelectTrigger><SelectValue placeholder="Select assignment to return" /></SelectTrigger>
                  <SelectContent>
                    {activeAssignments.map(a => {
                      const asset = assets.find(ast => ast.id === a.asset_id);
                      const employee = employees.find(e => e.id === a.employee_id);
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {asset?.name || 'Unknown'} - {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition at Return</Label>
                <Select value={returnCondition} onValueChange={setReturnCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Return Notes</Label>
                <Textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} rows={2} placeholder="Optional notes..." />
              </div>
              <Button onClick={handleReturn} disabled={returning} className="w-full">
                {returning ? 'Returning...' : 'Return Asset'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AssetAssign.jsx src/components/assets/SignatureCanvas.jsx
git commit -m "feat: add assign/return page with digital signature capture"
```

---

### Task 8: Employee Directory & Profile Pages

**Files:**
- Create: `src/pages/AssetEmployees.jsx`
- Create: `src/pages/AssetEmployeeDetail.jsx`

- [ ] **Step 1: Create AssetEmployees page**

```jsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import {
  Users, Search, RefreshCw, User, Briefcase, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const STATUS_COLORS = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AssetEmployees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list('last_name'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list(),
  });

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const getActiveAssignmentCount = (employeeId) =>
    assignments.filter(a => a.employee_id === employeeId && !a.returned_date).length;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/functions/sync-jumpcloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Synced: ${result.summary.created} new, ${result.summary.updated} updated, ${result.summary.deactivated} deactivated`);
        refetch();
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Failed to sync with JumpCloud');
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) return <CardGridSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Employees</h1>
              <p className="text-xs text-muted-foreground">{employees.length} employees from JumpCloud</p>
            </div>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            <RefreshCw className={cn("w-4 h-4 mr-1", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync JumpCloud'}
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        {/* Employee List */}
        <div className="rounded-2xl bg-white dark:bg-card border border-border overflow-hidden">
          {filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{employees.length === 0 ? 'No employees yet. Sync from JumpCloud to get started.' : 'No employees match your search'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredEmployees.map(employee => {
                const assignmentCount = getActiveAssignmentCount(employee.id);
                return (
                  <Link
                    key={employee.id}
                    to={createPageUrl('AssetEmployeeDetail') + `?id=${employee.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                      {employee.department && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {employee.department}
                        </span>
                      )}
                      {employee.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {employee.location}
                        </span>
                      )}
                    </div>
                    {assignmentCount > 0 && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {assignmentCount} asset{assignmentCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[employee.status])}>
                      {employee.status}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AssetEmployeeDetail page**

```jsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/api/apiClient';
import {
  User, ArrowLeft, Mail, Briefcase, MapPin, Clock,
  Package, CheckCircle, Monitor, Smartphone, Key, Car, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { createPageUrl } from '@/utils';

const TYPE_ICONS = {
  'IT Equipment': Monitor, 'Mobile Device': Smartphone,
  'Software License': Key, 'Vehicle': Car, 'Physical Tool': Wrench,
};

export default function AssetEmployeeDetail() {
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('id');

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list(),
  });

  const employee = employees.find(e => e.id === employeeId);
  const employeeAssignments = useMemo(() =>
    assignments.filter(a => a.employee_id === employeeId).sort((a, b) =>
      new Date(b.assigned_date || b.created_date) - new Date(a.assigned_date || a.created_date)
    ),
    [assignments, employeeId]
  );

  const currentAssignments = employeeAssignments.filter(a => !a.returned_date);
  const pastAssignments = employeeAssignments.filter(a => a.returned_date);

  if (loadingEmployees || loadingAssignments) return <CardGridSkeleton />;
  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-semibold">Employee not found</p>
          <Link to={createPageUrl('AssetEmployees')} className="text-sm text-primary hover:underline mt-2 inline-block">
            Back to employees
          </Link>
        </div>
      </div>
    );
  }

  const renderAssignmentList = (list, label) => (
    <div className="rounded-2xl bg-white dark:bg-card border border-border p-4 mb-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">{label} ({list.length})</h2>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 text-center">None</p>
      ) : (
        <div className="space-y-2">
          {list.map(assignment => {
            const asset = assets.find(a => a.id === assignment.asset_id);
            const TypeIcon = TYPE_ICONS[asset?.type] || Package;
            return (
              <Link
                key={assignment.id}
                to={createPageUrl('AssetDetail') + `?id=${assignment.asset_id}`}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <TypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{asset?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString() : ''}
                    {assignment.returned_date && ` - ${new Date(assignment.returned_date).toLocaleDateString()}`}
                  </p>
                </div>
                {assignment.acknowledged && (
                  <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Link to={createPageUrl('AssetEmployees')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to employees
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{employee.first_name} {employee.last_name}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {employee.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {employee.email}</span>}
              {employee.job_title && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {employee.job_title}</span>}
              {employee.department && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {employee.department}</span>}
              {employee.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {employee.location}</span>}
              <Badge variant="outline" className={cn('text-[10px]', {
                'bg-emerald-100 text-emerald-700': employee.status === 'Active',
                'bg-amber-100 text-amber-700': employee.status === 'Suspended',
                'bg-red-100 text-red-700': employee.status === 'Inactive',
              })}>{employee.status}</Badge>
            </div>
          </div>
        </div>

        {renderAssignmentList(currentAssignments, 'Current Assets')}
        {renderAssignmentList(pastAssignments, 'Past Assignments')}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AssetEmployees.jsx src/pages/AssetEmployeeDetail.jsx
git commit -m "feat: add employee directory and profile pages with JumpCloud sync"
```

---

### Task 9: Software Licenses Page

**Files:**
- Create: `src/pages/AssetLicenses.jsx`

- [ ] **Step 1: Create AssetLicenses page**

```jsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import {
  Key, Search, AlertTriangle, Calendar, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { createPageUrl } from '@/utils';

export default function AssetLicenses() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('name'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
  });

  const licenses = useMemo(() => {
    const filtered = assets.filter(a => a.type === 'Software License');
    if (!searchQuery) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(l =>
      l.name?.toLowerCase().includes(q) || l.license_key?.toLowerCase().includes(q)
    );
  }, [assets, searchQuery]);

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const d = new Date(expiryDate);
    if (d < now) return 'expired';
    if (d <= thirtyDays) return 'expiring';
    return 'valid';
  };

  const getAssignedTo = (assetId) => {
    const active = assignments.find(a => a.asset_id === assetId && !a.returned_date);
    if (!active) return null;
    return employees.find(e => e.id === active.employee_id);
  };

  if (isLoading) return <CardGridSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shrink-0">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Software Licenses</h1>
            <p className="text-xs text-muted-foreground">{licenses.length} licenses</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search licenses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <div className="rounded-2xl bg-white dark:bg-card border border-border overflow-hidden">
          {licenses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No software licenses found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {licenses.map(license => {
                const expiryStatus = getExpiryStatus(license.expiry_date);
                const assignedTo = getAssignedTo(license.id);
                return (
                  <Link
                    key={license.id}
                    to={createPageUrl('AssetDetail') + `?id=${license.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{license.name}</p>
                      {license.license_key && (
                        <p className="text-xs text-muted-foreground font-mono truncate">{license.license_key}</p>
                      )}
                    </div>
                    {assignedTo && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" /> {assignedTo.first_name} {assignedTo.last_name}
                      </span>
                    )}
                    {license.expiry_date && (
                      <div className="flex items-center gap-1 shrink-0">
                        {expiryStatus === 'expired' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        {expiryStatus === 'expiring' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        <Badge variant="outline" className={cn('text-[10px]', {
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': expiryStatus === 'expired',
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400': expiryStatus === 'expiring',
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400': expiryStatus === 'valid',
                        })}>
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(license.expiry_date).toLocaleDateString()}
                        </Badge>
                      </div>
                    )}
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', {
                      'bg-emerald-100 text-emerald-700': license.status === 'Available',
                      'bg-blue-100 text-blue-700': license.status === 'Assigned',
                    })}>
                      {license.status}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AssetLicenses.jsx
git commit -m "feat: add software licenses page with expiry tracking"
```

---

### Task 10: Reports Page

**Files:**
- Create: `src/pages/AssetReports.jsx`

- [ ] **Step 1: Create AssetReports page**

```jsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  PieChart, Package, Users, DollarSign, Clock,
  Monitor, Smartphone, Key, Car, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import AssetStatsCard from '@/components/assets/AssetStatsCard';

const TYPE_ICONS = {
  'IT Equipment': Monitor, 'Mobile Device': Smartphone,
  'Software License': Key, 'Vehicle': Car, 'Physical Tool': Wrench,
};

const TYPE_COLORS = {
  'IT Equipment': 'bg-blue-500', 'Mobile Device': 'bg-purple-500',
  'Software License': 'bg-emerald-500', 'Vehicle': 'bg-orange-500',
  'Physical Tool': 'bg-rose-500',
};

export default function AssetReports() {
  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list(),
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
  });

  const stats = useMemo(() => {
    const totalCost = assets.reduce((sum, a) => sum + (Number(a.purchase_cost) || 0), 0);
    const byType = {};
    const byStatus = { Available: 0, Assigned: 0, Returned: 0 };
    const byCondition = { New: 0, Good: 0, Fair: 0, Damaged: 0 };

    for (const asset of assets) {
      const type = asset.type || 'Other';
      byType[type] = (byType[type] || 0) + 1;
      byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;
      byCondition[asset.condition] = (byCondition[asset.condition] || 0) + 1;
    }

    // Top holders
    const holderCounts = {};
    for (const a of assignments) {
      if (!a.returned_date) {
        holderCounts[a.employee_id] = (holderCounts[a.employee_id] || 0) + 1;
      }
    }
    const topHolders = Object.entries(holderCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => {
        const emp = employees.find(e => e.id === id);
        return { name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown', count };
      });

    return { totalCost, byType, byStatus, byCondition, topHolders };
  }, [assets, assignments, employees]);

  if (loadingAssets || loadingAssignments) return <CardGridSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shrink-0">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Asset Reports</h1>
            <p className="text-xs text-muted-foreground">{assets.length} total assets</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <AssetStatsCard title="Total Assets" value={assets.length} icon={Package} iconColor="bg-slate-600" />
          <AssetStatsCard title="Total Value" value={`$${stats.totalCost.toLocaleString()}`} icon={DollarSign} iconColor="bg-emerald-500" />
          <AssetStatsCard title="Employees" value={employees.length} icon={Users} iconColor="bg-blue-500" />
          <AssetStatsCard title="Active Assignments" value={assignments.filter(a => !a.returned_date).length} icon={Clock} iconColor="bg-amber-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By Type */}
          <div className="rounded-2xl bg-white dark:bg-card border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Assets by Type</h2>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, count]) => {
                const TypeIcon = TYPE_ICONS[type] || Package;
                const pct = assets.length > 0 ? Math.round((count / assets.length) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <TypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{type}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", TYPE_COLORS[type] || 'bg-slate-400')} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Status */}
          <div className="rounded-2xl bg-white dark:bg-card border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Assets by Status</h2>
            <div className="space-y-2">
              {Object.entries(stats.byStatus).filter(([, c]) => c > 0).map(([status, count]) => {
                const pct = assets.length > 0 ? Math.round((count / assets.length) * 100) : 0;
                const colors = { Available: 'bg-emerald-500', Assigned: 'bg-blue-500', Returned: 'bg-amber-500' };
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{status}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", colors[status])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Condition */}
          <div className="rounded-2xl bg-white dark:bg-card border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Assets by Condition</h2>
            <div className="space-y-2">
              {Object.entries(stats.byCondition).filter(([, c]) => c > 0).map(([condition, count]) => {
                const pct = assets.length > 0 ? Math.round((count / assets.length) * 100) : 0;
                const colors = { New: 'bg-emerald-500', Good: 'bg-blue-500', Fair: 'bg-amber-500', Damaged: 'bg-red-500' };
                return (
                  <div key={condition}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{condition}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", colors[condition])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Asset Holders */}
          <div className="rounded-2xl bg-white dark:bg-card border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Top Asset Holders</h2>
            {stats.topHolders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">No active assignments</p>
            ) : (
              <div className="space-y-2">
                {stats.topHolders.map((holder, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{holder.name}</span>
                    <span className="text-sm font-semibold text-foreground">{holder.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AssetReports.jsx
git commit -m "feat: add asset reports page with type, status, condition, and holder stats"
```

---

### Task 11: My Assets Page (Employee View)

**Files:**
- Create: `src/pages/MyAssets.jsx`

- [ ] **Step 1: Create MyAssets page**

```jsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import {
  Package, Monitor, Smartphone, Key, Car, Wrench,
  Calendar, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

const TYPE_ICONS = {
  'IT Equipment': Monitor, 'Mobile Device': Smartphone,
  'Software License': Key, 'Vehicle': Car, 'Physical Tool': Wrench,
};

export default function MyAssets() {
  const { user } = useAuth();

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list(),
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list(),
  });

  // Match current user to employee by email
  const currentEmployee = useMemo(() =>
    employees.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase()),
    [employees, user]
  );

  const myAssignments = useMemo(() => {
    if (!currentEmployee) return [];
    return assignments.filter(a => a.employee_id === currentEmployee.id && !a.returned_date);
  }, [assignments, currentEmployee]);

  if (loadingAssets || loadingAssignments) return <CardGridSkeleton />;

  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-semibold text-foreground">No employee profile found</p>
          <p className="text-sm text-muted-foreground mt-1">Your email doesn't match any employee in the system</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">My Assets</h1>
            <p className="text-xs text-muted-foreground">{myAssignments.length} asset{myAssignments.length !== 1 ? 's' : ''} assigned to you</p>
          </div>
        </div>

        {myAssignments.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-card border border-border p-8 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No assets currently assigned to you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myAssignments.map(assignment => {
              const asset = assets.find(a => a.id === assignment.asset_id);
              if (!asset) return null;
              const TypeIcon = TYPE_ICONS[asset.type] || Package;
              return (
                <div key={assignment.id} className="rounded-2xl bg-white dark:bg-card border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <TypeIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{asset.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[asset.manufacturer, asset.model].filter(Boolean).join(' - ')}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{asset.type}</Badge>
                        {asset.serial_number && <span>SN: {asset.serial_number}</span>}
                        {assignment.assigned_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Since {new Date(assignment.assigned_date).toLocaleDateString()}
                          </span>
                        )}
                        {assignment.acknowledged && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle className="w-3 h-3" /> Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MyAssets.jsx
git commit -m "feat: add my assets page for employee self-service view"
```

---

### Task 12: Register Pages and Navigation

**Files:**
- Modify: `src/pages.config.js`
- Modify: `src/Layout.jsx:54-60`

- [ ] **Step 1: Register all new pages in pages.config.js**

Add imports at the top of `src/pages.config.js`:

```javascript
import AssetDashboard from './pages/AssetDashboard';
import AssetInventory from './pages/AssetInventory';
import AssetDetail from './pages/AssetDetail';
import AssetAssign from './pages/AssetAssign';
import AssetEmployees from './pages/AssetEmployees';
import AssetEmployeeDetail from './pages/AssetEmployeeDetail';
import AssetLicenses from './pages/AssetLicenses';
import AssetReports from './pages/AssetReports';
import MyAssets from './pages/MyAssets';
```

Add to the `PAGES` object:

```javascript
"AssetDashboard": AssetDashboard,
"AssetInventory": AssetInventory,
"AssetDetail": AssetDetail,
"AssetAssign": AssetAssign,
"AssetEmployees": AssetEmployees,
"AssetEmployeeDetail": AssetEmployeeDetail,
"AssetLicenses": AssetLicenses,
"AssetReports": AssetReports,
"MyAssets": MyAssets,
```

- [ ] **Step 2: Add ManageIT section to sidebar navigation**

In `src/Layout.jsx`, update the `navItems` array to include a ManageIT section. Add `HardDrive` to the lucide-react imports, then update:

```javascript
const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Activity', icon: ListTodo, page: 'AllTasks' },
  { name: 'Customers', icon: Users, page: 'Customers' },
  { name: 'Stock', icon: Package, page: 'Stock' },
  { name: 'Reports', icon: PieChart, page: 'Reports' },
  { type: 'separator', label: 'ManageIT' },
  { name: 'Assets', icon: HardDrive, page: 'AssetDashboard' },
  { name: 'Inventory', icon: Package, page: 'AssetInventory' },
  { name: 'Assign / Return', icon: ArrowDownUp, page: 'AssetAssign' },
  { name: 'Employees', icon: Users, page: 'AssetEmployees' },
  { name: 'Licenses', icon: Key, page: 'AssetLicenses' },
  { name: 'Asset Reports', icon: TrendingUp, page: 'AssetReports' },
];
```

Note: The sidebar rendering logic will need to handle `{ type: 'separator' }` items. Add this in the nav rendering section where navItems are mapped:

```jsx
{navItems.map((item, index) => {
  if (item.type === 'separator') {
    return (
      <div key={index} className="pt-4 pb-1 px-3">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{item.label}</p>
      </div>
    );
  }
  // ...existing nav item rendering
})}
```

- [ ] **Step 3: Add MyAssets to the user dropdown or as a non-admin nav item**

In the user dropdown section of Layout.jsx, add a "My Assets" link for non-admin users:

```jsx
<DropdownMenuItem asChild>
  <Link to={createPageUrl('MyAssets')} className="flex items-center gap-2">
    <Package className="w-4 h-4" /> My Assets
  </Link>
</DropdownMenuItem>
```

- [ ] **Step 4: Add `ArrowDownUp`, `Key`, and `HardDrive` to the lucide-react imports in Layout.jsx**

```javascript
import { 
  LayoutDashboard, ListTodo, Menu, X, Wrench, FileText,
  Package, Shield, User, Settings, LogOut, Search, Zap,
  Users, Activity, Clock, TrendingUp, PieChart, ChevronDown,
  Bell, Globe, Inbox, Calendar, HardDrive, ArrowDownUp, Key,
} from 'lucide-react';
```

- [ ] **Step 5: Commit**

```bash
git add src/pages.config.js src/Layout.jsx
git commit -m "feat: register ManageIT pages and add sidebar navigation section"
```

---

### Task 13: Apply Pro Max Design Polish

**Files:**
- Modify: All asset pages (AssetDashboard, AssetInventory, AssetAssign, etc.)

This task applies the UI/UX Pro Max design skill for final polish. Invoke the `ui-ux-pro-max` skill to review and enhance:

- [ ] **Step 1: Review all ManageIT pages with Pro Max design skill**

Run the `ui-ux-pro-max` skill against each page for design improvements:
- Consistent spacing and alignment with ProjectIT
- Micro-interactions (hover states, transitions)
- Empty states with helpful messaging
- Mobile responsiveness
- Dark mode consistency
- Loading skeleton states

- [ ] **Step 2: Apply design improvements**

Based on Pro Max review, update pages with recommended changes.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ src/components/assets/
git commit -m "feat: apply Pro Max design polish to ManageIT pages"
```

---

### Task 14: Deploy to Staging

- [ ] **Step 1: Verify all files are committed**

```bash
cd /Users/anielreyes/Developer/projectit
git status
```

- [ ] **Step 2: Push to staging branch**

```bash
git push origin staging
```

- [ ] **Step 3: Verify deployment on Railway staging**

Check Railway staging deployment logs and verify the migration runs successfully.

- [ ] **Step 4: Test in staging**

Verify:
- ManageIT nav section appears in sidebar
- Asset dashboard loads with empty state
- Can create an asset
- Can view asset detail
- Employee page shows sync button
- Assign/return flow works
- Licenses page filters correctly
- Reports page calculates stats
- My Assets works for non-admin users
