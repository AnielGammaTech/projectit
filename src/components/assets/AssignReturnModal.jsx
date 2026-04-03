import { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, RotateCcw, Search, User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import SignatureCanvas from '@/components/assets/SignatureCanvas';

const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged'];

function getEmployeeName(emp) {
  if (!emp) return 'Unknown';
  if (emp.first_name || emp.last_name) return `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
  return emp.full_name || emp.name || emp.email || 'Unknown';
}

function getActiveAssignment(assetId, assignments) {
  if (!assetId || !assignments) return null;
  return assignments.find((a) => a.asset_id === assetId && !a.returned_date) ?? null;
}

export default function AssignReturnModal({ open, onClose, asset, employees, assignments, onSave }) {
  const [employeeId, setEmployeeId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [condition, setCondition] = useState('Good');
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState(null);
  const [saving, setSaving] = useState(false);

  const activeAssignment = getActiveAssignment(asset?.id, assignments);
  const isReturn = !!activeAssignment;

  useEffect(() => {
    if (open) {
      setEmployeeId('');
      setEmployeeSearch('');
      setCondition('Good');
      setNotes('');
      setSignature(null);
      setSaving(false);
    }
  }, [open]);

  const activeEmployees = useMemo(() =>
    (employees ?? []).filter(e => e.status === 'Active' || e.status === 'active'),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return activeEmployees;
    const q = employeeSearch.toLowerCase();
    return activeEmployees.filter(e => {
      const name = getEmployeeName(e).toLowerCase();
      const email = (e.email || '').toLowerCase();
      const dept = (e.department || '').toLowerCase();
      return name.includes(q) || email.includes(q) || dept.includes(q);
    });
  }, [activeEmployees, employeeSearch]);

  const selectedEmployee = employees?.find(e => e.id === employeeId);
  const assignedEmployee = isReturn
    ? employees?.find(e => e.id === activeAssignment.employee_id)
    : null;

  const handleAssign = async () => {
    if (!employeeId) {
      toast.error('Please select an employee');
      return;
    }
    setSaving(true);
    try {
      await api.entities.AssetAssignment.create({
        asset_id: asset.id,
        employee_id: employeeId,
        assigned_date: new Date().toISOString().split('T')[0],
        condition_at_checkout: condition,
        notes,
        signature_data: signature,
      });
      await api.entities.Asset.update(asset.id, { ...asset, status: 'Assigned' });
      toast.success(`Assigned to ${getEmployeeName(selectedEmployee)}`);
      onSave?.();
      onClose();
    } catch (error) {
      toast.error('Failed to assign asset');
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    setSaving(true);
    try {
      await api.entities.AssetAssignment.update(activeAssignment.id, {
        ...activeAssignment,
        returned_date: new Date().toISOString().split('T')[0],
        condition_at_return: condition,
        notes: notes || activeAssignment.notes,
      });
      await api.entities.Asset.update(asset.id, { ...asset, status: 'Available' });
      toast.success('Asset returned successfully');
      onSave?.();
      onClose();
    } catch (error) {
      toast.error('Failed to return asset');
    } finally {
      setSaving(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReturn ? (
              <RotateCcw className="w-5 h-5 text-amber-500" />
            ) : (
              <UserPlus className="w-5 h-5 text-emerald-500" />
            )}
            {isReturn ? 'Return' : 'Assign'} — {asset.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isReturn ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                  {getEmployeeName(assignedEmployee).charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{getEmployeeName(assignedEmployee)}</p>
                  <p className="text-xs text-muted-foreground">{assignedEmployee?.email || ''}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Condition at Return</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Return notes..." rows={2} />
              </div>
            </>
          ) : (
            <>
              {/* Searchable employee picker */}
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={employeeSearch}
                    onChange={e => setEmployeeSearch(e.target.value)}
                    placeholder="Search by name, email, or department..."
                    className="pl-9"
                  />
                </div>

                {/* Selected employee preview */}
                {selectedEmployee && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                      {getEmployeeName(selectedEmployee).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{getEmployeeName(selectedEmployee)}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedEmployee.email}</p>
                    </div>
                    <button onClick={() => setEmployeeId('')} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                  </div>
                )}

                {/* Employee list */}
                {!selectedEmployee && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {filteredEmployees.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {activeEmployees.length === 0
                          ? 'No employees synced. Go to Employees tab and sync from JumpCloud.'
                          : 'No employees match your search'}
                      </div>
                    ) : (
                      filteredEmployees.map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => { setEmployeeId(emp.id); setEmployeeSearch(''); }}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                            {getEmployeeName(emp).charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{getEmployeeName(emp)}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="truncate">{emp.email}</span>
                              {emp.department && (
                                <span className="flex items-center gap-0.5 shrink-0">
                                  <Briefcase className="w-3 h-3" /> {emp.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Condition at Checkout</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Assignment notes..." rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label>Acknowledgment Signature</Label>
                <SignatureCanvas onSignatureChange={setSignature} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          {isReturn ? (
            <Button onClick={handleReturn} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              <RotateCcw className="w-4 h-4 mr-1" />
              {saving ? 'Returning...' : 'Return Asset'}
            </Button>
          ) : (
            <Button onClick={handleAssign} disabled={saving || !employeeId} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <UserPlus className="w-4 h-4 mr-1" />
              {saving ? 'Assigning...' : 'Assign Asset'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
