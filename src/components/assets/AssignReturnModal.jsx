import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, RotateCcw } from 'lucide-react';
import SignatureCanvas from '@/components/assets/SignatureCanvas';

const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged'];

function getActiveAssignment(assetId, assignments) {
  if (!assetId || !assignments) return null;
  return assignments.find((a) => a.asset_id === assetId && !a.returned_date) ?? null;
}

export default function AssignReturnModal({ open, onClose, asset, employees, assignments, onSave }) {
  const [employeeId, setEmployeeId] = useState('');
  const [condition, setCondition] = useState('Good');
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState(null);
  const [saving, setSaving] = useState(false);

  const activeAssignment = getActiveAssignment(asset?.id, assignments);
  const isReturn = !!activeAssignment;

  useEffect(() => {
    if (open) {
      setEmployeeId('');
      setCondition('Good');
      setNotes('');
      setSignature(null);
      setSaving(false);
    }
  }, [open]);

  const activeEmployees = (employees ?? []).filter(
    (e) => e.status === 'Active' || e.status === 'active'
  );

  const assignedEmployee = isReturn
    ? employees?.find((e) => e.id === activeAssignment.employee_id)
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

      await api.entities.Asset.update(asset.id, {
        ...asset,
        status: 'Assigned',
      });

      toast.success('Asset assigned successfully');
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

      await api.entities.Asset.update(asset.id, {
        ...asset,
        status: 'Available',
      });

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
              <UserPlus className="w-5 h-5 text-blue-500" />
            )}
            {isReturn ? 'Return' : 'Assign'} — {asset.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isReturn ? (
            <>
              <div>
                <Label className="text-sm text-muted-foreground">Assigned to</Label>
                <p className="font-medium text-sm mt-1">
                  {assignedEmployee?.full_name || assignedEmployee?.name || 'Unknown'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Condition at Return</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Return notes..."
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name || emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Condition at Checkout</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Assignment notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Acknowledgment Signature</Label>
                <SignatureCanvas onSignatureChange={setSignature} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {isReturn ? (
            <Button onClick={handleReturn} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-1" />
              {saving ? 'Returning...' : 'Return'}
            </Button>
          ) : (
            <Button onClick={handleAssign} disabled={saving}>
              <UserPlus className="w-4 h-4 mr-1" />
              {saving ? 'Assigning...' : 'Assign'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
