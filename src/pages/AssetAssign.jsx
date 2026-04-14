import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, RotateCcw, Loader2 } from 'lucide-react';
import SignatureCanvas from '@/components/assets/SignatureCanvas';
import ManageITShell from '@/components/assets/ManageITShell';

const CONDITION_OPTIONS = ['New', 'Good', 'Fair', 'Damaged'];

const INITIAL_ASSIGN_FORM = {
  asset_id: '',
  employee_id: '',
  condition_at_checkout: '',
  notes: '',
  signature_data: null,
};

const INITIAL_RETURN_FORM = {
  assignment_id: '',
  condition_at_return: '',
  notes: '',
};

export default function AssetAssign() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('assign');
  const [assignForm, setAssignForm] = useState(INITIAL_ASSIGN_FORM);
  const [returnForm, setReturnForm] = useState(INITIAL_RETURN_FORM);
  const [submitting, setSubmitting] = useState(false);

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.entities.Asset.list('name'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.entities.Employee.list('last_name'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assetAssignments'],
    queryFn: () => api.entities.AssetAssignment.list('-assigned_date'),
  });

  const availableAssets = useMemo(
    () => assets.filter((a) => a.status === 'Available'),
    [assets]
  );

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'Active'),
    [employees]
  );

  const activeAssignments = useMemo(
    () => assignments.filter((a) => !a.returned_date),
    [assignments]
  );

  const assignmentDisplayMap = useMemo(() => {
    const assetMap = Object.fromEntries(assets.map((a) => [a.id, a.name]));
    const empMap = Object.fromEntries(
      employees.map((e) => [e.id, `${e.first_name} ${e.last_name}`])
    );
    return Object.fromEntries(
      activeAssignments.map((a) => [
        a.id,
        `${assetMap[a.asset_id] || 'Unknown Asset'} - ${empMap[a.employee_id] || 'Unknown Employee'}`,
      ])
    );
  }, [activeAssignments, assets, employees]);

  const updateAssignField = useCallback((field, value) => {
    setAssignForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateReturnField = useCallback((field, value) => {
    setReturnForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['assetAssignments'] });
  }, [queryClient]);

  const handleAssign = async () => {
    if (!assignForm.asset_id || !assignForm.employee_id || !assignForm.condition_at_checkout) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const hasSignature = Boolean(assignForm.signature_data);

      await api.entities.AssetAssignment.create({
        asset_id: assignForm.asset_id,
        employee_id: assignForm.employee_id,
        assigned_date: now,
        condition_at_checkout: assignForm.condition_at_checkout,
        notes: assignForm.notes,
        acknowledged: hasSignature,
        acknowledged_date: hasSignature ? now : null,
        signature_data: assignForm.signature_data,
      });

      await api.entities.Asset.update(assignForm.asset_id, {
        status: 'Assigned',
      });

      setAssignForm(INITIAL_ASSIGN_FORM);
      invalidateAll();
      toast.success('Asset assigned successfully');
    } catch (error) {
      toast.error('Failed to assign asset. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!returnForm.assignment_id || !returnForm.condition_at_return) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const assignment = activeAssignments.find((a) => a.id === returnForm.assignment_id);

      if (!assignment) {
        toast.error('Assignment not found');
        setSubmitting(false);
        return;
      }

      const updatedNotes = returnForm.notes
        ? assignment.notes
          ? `${assignment.notes}\n\nReturn notes: ${returnForm.notes}`
          : `Return notes: ${returnForm.notes}`
        : assignment.notes;

      await api.entities.AssetAssignment.update(returnForm.assignment_id, {
        returned_date: now,
        condition_at_return: returnForm.condition_at_return,
        notes: updatedNotes,
      });

      await api.entities.Asset.update(assignment.asset_id, {
        status: 'Available',
        condition: returnForm.condition_at_return,
      });

      setReturnForm(INITIAL_RETURN_FORM);
      invalidateAll();
      toast.success('Asset returned successfully');
    } catch (error) {
      toast.error('Failed to return asset. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ManageITShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="assign" className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Assign
            </TabsTrigger>
            <TabsTrigger value="return" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Return
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="assign-asset">Asset *</Label>
              <Select
                value={assignForm.asset_id}
                onValueChange={(val) => updateAssignField('asset_id', val)}
              >
                <SelectTrigger id="assign-asset">
                  <SelectValue placeholder="Select an available asset" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assign-employee">Employee *</Label>
              <Select
                value={assignForm.employee_id}
                onValueChange={(val) => updateAssignField('employee_id', val)}
              >
                <SelectTrigger id="assign-employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                      {emp.department ? ` - ${emp.department}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assign-condition">Condition at Checkout *</Label>
              <Select
                value={assignForm.condition_at_checkout}
                onValueChange={(val) => updateAssignField('condition_at_checkout', val)}
              >
                <SelectTrigger id="assign-condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assign-notes">Notes</Label>
              <Textarea
                id="assign-notes"
                placeholder="Optional notes..."
                value={assignForm.notes}
                onChange={(e) => updateAssignField('notes', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Employee Signature</Label>
              <SignatureCanvas
                onSignatureChange={(dataUrl) => updateAssignField('signature_data', dataUrl)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Assign Asset
            </Button>
          </TabsContent>

          <TabsContent value="return" className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="return-assignment">Active Assignment *</Label>
              <Select
                value={returnForm.assignment_id}
                onValueChange={(val) => updateReturnField('assignment_id', val)}
              >
                <SelectTrigger id="return-assignment">
                  <SelectValue placeholder="Select an active assignment" />
                </SelectTrigger>
                <SelectContent>
                  {activeAssignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {assignmentDisplayMap[a.id] || a.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-condition">Condition at Return *</Label>
              <Select
                value={returnForm.condition_at_return}
                onValueChange={(val) => updateReturnField('condition_at_return', val)}
              >
                <SelectTrigger id="return-condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-notes">Return Notes</Label>
              <Textarea
                id="return-notes"
                placeholder="Optional return notes..."
                value={returnForm.notes}
                onChange={(e) => updateReturnField('notes', e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleReturn}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Return Asset
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </ManageITShell>
  );
}
