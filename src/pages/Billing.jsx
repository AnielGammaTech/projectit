import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  DollarSign, Clock, Package, CheckCircle2, Search, History,
  Calendar, ChevronRight, X, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ready_to_bill');
  const [selectedProject, setSelectedProject] = useState(null);
  const [billingNotes, setBillingNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: timeEntries = [], refetch: refetchTime } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date')
  });

  const { data: parts = [], refetch: refetchParts } = useQuery({
    queryKey: ['allParts'],
    queryFn: () => base44.entities.Part.list('-created_date')
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  // Calculate project billing data
  const getProjectBillingData = (projectId) => {
    const projectTime = timeEntries.filter(e => e.project_id === projectId);
    const projectParts = parts.filter(p => p.project_id === projectId);
    
    const totalMinutes = projectTime.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const itemCount = projectParts.length;
    const itemCost = projectParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
    
    const readyToBillTime = projectTime.filter(e => e.billing_status === 'ready_to_bill');
    const readyToBillParts = projectParts.filter(p => p.billing_status === 'ready_to_bill');
    const hasReadyToBill = readyToBillTime.length > 0 || readyToBillParts.length > 0;
    
    const delayedTime = projectTime.filter(e => e.billing_status === 'delayed');
    const delayedParts = projectParts.filter(p => p.billing_status === 'delayed');
    const hasDelayed = delayedTime.length > 0 || delayedParts.length > 0;
    
    const billedTime = projectTime.filter(e => e.billing_status === 'invoiced' || e.billing_status === 'paid');
    const billedParts = projectParts.filter(p => p.billing_status === 'invoiced' || p.billing_status === 'paid');
    const hasBilled = billedTime.length > 0 || billedParts.length > 0;

    return {
      totalHours,
      itemCount,
      itemCost,
      hasReadyToBill,
      hasDelayed,
      hasBilled,
      readyToBillCount: readyToBillTime.length + readyToBillParts.length,
      timeEntries: projectTime,
      parts: projectParts
    };
  };

  // Get projects by billing status
  const projectsWithBilling = projects.map(p => ({
    ...p,
    billing: getProjectBillingData(p.id),
    customer: customers.find(c => c.id === p.customer_id)
  }));

  const readyToBillProjects = projectsWithBilling.filter(p => p.billing.hasReadyToBill);
  const delayedProjects = projectsWithBilling.filter(p => p.billing.hasDelayed);
  const historyProjects = projectsWithBilling.filter(p => p.billing.hasBilled);

  // Filter by search
  const filterProjects = (list) => list.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate totals
  const pendingItemCost = parts.filter(p => p.billing_status === 'ready_to_bill')
    .reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_cost || 0)), 0);
  
  const pendingItemPrice = parts.filter(p => p.billing_status === 'ready_to_bill')
    .reduce((sum, p) => sum + ((p.quantity || 1) * (p.sell_price || p.unit_cost || 0)), 0);

  const handleMarkAsBilled = async () => {
    if (!selectedProject) return;
    
    // Update all ready_to_bill items to invoiced
    for (const entry of selectedProject.billing.timeEntries.filter(e => e.billing_status === 'ready_to_bill')) {
      await base44.entities.TimeEntry.update(entry.id, { billing_status: 'invoiced' });
    }
    for (const part of selectedProject.billing.parts.filter(p => p.billing_status === 'ready_to_bill')) {
      await base44.entities.Part.update(part.id, { billing_status: 'invoiced' });
    }
    
    refetchTime();
    refetchParts();
    setSelectedProject(null);
    setBillingNotes('');
  };

  const handleDelayBilling = async () => {
    if (!selectedProject) return;
    
    for (const entry of selectedProject.billing.timeEntries.filter(e => e.billing_status === 'ready_to_bill')) {
      await base44.entities.TimeEntry.update(entry.id, { billing_status: 'delayed' });
    }
    for (const part of selectedProject.billing.parts.filter(p => p.billing_status === 'ready_to_bill')) {
      await base44.entities.Part.update(part.id, { billing_status: 'delayed' });
    }
    
    refetchTime();
    refetchParts();
    setSelectedProject(null);
    setBillingNotes('');
  };

  const handleDoNotBill = async () => {
    if (!selectedProject) return;
    
    for (const entry of selectedProject.billing.timeEntries.filter(e => e.billing_status === 'ready_to_bill')) {
      await base44.entities.TimeEntry.update(entry.id, { billing_status: 'pending' });
    }
    for (const part of selectedProject.billing.parts.filter(p => p.billing_status === 'ready_to_bill')) {
      await base44.entities.Part.update(part.id, { billing_status: 'pending' });
    }
    
    refetchTime();
    refetchParts();
    setSelectedProject(null);
    setBillingNotes('');
  };

  const ProjectCard = ({ project }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setSelectedProject(project)}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">{project.name}</span>
            {project.status && (
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{project.status}</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">{project.customer?.name || project.client}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>
      
      <div className="flex gap-4 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-bold text-slate-900">{project.billing.readyToBillCount}</p>
          <p className="text-[10px] text-slate-500">Items</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <Package className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-bold text-slate-900">{project.billing.itemCount}</p>
          <p className="text-[10px] text-slate-500">Parts</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-bold text-slate-900">{project.billing.totalHours}h</p>
          <p className="text-[10px] text-slate-500">Man Hours</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-sm text-emerald-600 font-medium">Item Price</span>
        <span className="font-bold text-emerald-600">${project.billing.itemCost.toLocaleString()}</span>
      </div>
      
      {project.created_date && (
        <p className="text-[10px] text-slate-400 mt-2">Created: {format(new Date(project.created_date), 'MMM d, yyyy')}</p>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
              <DollarSign className="w-7 h-7" />
              Billing
            </h1>
            <p className="text-slate-500">Manage project billing and invoicing</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Audit Unbilled Projects
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              <DollarSign className="w-4 h-4 mr-2" />
              Create Billing Event
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
            <p className="text-3xl font-bold text-emerald-500">{readyToBillProjects.length}</p>
            <p className="text-sm text-slate-500">Ready to Bill</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-orange-500 mb-2" />
            <p className="text-3xl font-bold text-orange-500">{delayedProjects.length}</p>
            <p className="text-sm text-slate-500">Delayed</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-slate-500 mb-2" />
            <p className="text-3xl font-bold text-slate-700">{historyProjects.length}</p>
            <p className="text-sm text-slate-500">History</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <Package className="w-6 h-6 mx-auto text-slate-500 mb-2" />
            <p className="text-3xl font-bold text-slate-700">${pendingItemCost.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Pending Item Cost</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto text-slate-500 mb-2" />
            <p className="text-3xl font-bold text-slate-700">${pendingItemPrice.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Pending Item Price</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('ready_to_bill')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'ready_to_bill' 
                ? "bg-white border-2 border-slate-200 text-slate-900" 
                : "text-slate-600 hover:bg-white/50"
            )}
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Ready to Bill ({readyToBillProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('delayed')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'delayed' 
                ? "bg-white border-2 border-slate-200 text-slate-900" 
                : "text-slate-600 hover:bg-white/50"
            )}
          >
            <Clock className="w-4 h-4 text-orange-500" />
            Delayed ({delayedProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'history' 
                ? "bg-white border-2 border-slate-200 text-slate-900" 
                : "text-slate-600 hover:bg-white/50"
            )}
          >
            <History className="w-4 h-4" />
            History ({historyProjects.length})
          </button>
        </div>

        {/* Project List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'ready_to_bill' && filterProjects(readyToBillProjects).map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
          {activeTab === 'delayed' && filterProjects(delayedProjects).map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
          {activeTab === 'history' && filterProjects(historyProjects).map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
          
          {((activeTab === 'ready_to_bill' && readyToBillProjects.length === 0) ||
            (activeTab === 'delayed' && delayedProjects.length === 0) ||
            (activeTab === 'history' && historyProjects.length === 0)) && (
            <div className="col-span-full text-center py-12 text-slate-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No projects in this category</p>
            </div>
          )}
        </div>
      </div>

      {/* Billing Modal */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <DollarSign className="w-5 h-5" />
              Process Billing: {selectedProject?.name}
            </DialogTitle>
            <p className="text-sm text-slate-500">{selectedProject?.customer?.name || selectedProject?.client}</p>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6 mt-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-5 gap-3">
                <div className="border rounded-lg p-3 text-center">
                  <Calendar className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <p className="text-xl font-bold">{selectedProject.billing.readyToBillCount}</p>
                  <p className="text-[10px] text-slate-500">Items</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <Package className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                  <p className="text-xl font-bold">{selectedProject.billing.itemCount}</p>
                  <p className="text-[10px] text-slate-500">Parts</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <Clock className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <p className="text-xl font-bold">{selectedProject.billing.totalHours}h</p>
                  <p className="text-[10px] text-slate-500">Man Hours</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <DollarSign className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <p className="text-xl font-bold">${selectedProject.billing.itemCost.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">Item Cost</p>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <DollarSign className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <p className="text-xl font-bold">${selectedProject.billing.itemCost.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">Item Price</p>
                </div>
              </div>

              {/* Billing Stage */}
              <div>
                <Label className="text-emerald-600">Billing Stage</Label>
                <Select defaultValue={selectedProject.status || 'planning'}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabs for Items */}
              <Tabs defaultValue="parts">
                <TabsList>
                  <TabsTrigger value="parts">Parts ({selectedProject.billing.parts.length})</TabsTrigger>
                  <TabsTrigger value="time">Time ({selectedProject.billing.timeEntries.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="parts" className="mt-3">
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedProject.billing.parts.filter(p => p.billing_status === 'ready_to_bill').map(part => (
                      <div key={part.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{part.name}</p>
                            <p className="text-xs text-slate-500">
                              {part.quantity || 1} × ${(part.unit_cost || 0).toFixed(2)}
                            </p>
                          </div>
                          <Badge variant="outline">{part.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {selectedProject.billing.parts.filter(p => p.billing_status === 'ready_to_bill').length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">No parts ready to bill</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="time" className="mt-3">
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedProject.billing.timeEntries.filter(e => e.billing_status === 'ready_to_bill').map(entry => (
                      <div key={entry.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{entry.user_name || entry.user_email}</p>
                            <p className="text-xs text-slate-500">
                              {entry.start_time && format(new Date(entry.start_time), 'MMM d, yyyy')} • {((entry.duration_minutes || 0) / 60).toFixed(1)}h
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedProject.billing.timeEntries.filter(e => e.billing_status === 'ready_to_bill').length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">No time entries ready to bill</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Billing Notes */}
              <div>
                <Label>Billing Notes</Label>
                <Textarea
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  placeholder="Add any notes about this billing..."
                  className="mt-1"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedProject(null)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={handleDoNotBill}>
                  <X className="w-4 h-4 mr-2" />
                  Do Not Bill
                </Button>
                <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={handleDelayBilling}>
                  <Clock className="w-4 h-4 mr-2" />
                  Delay Billing
                </Button>
                <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleMarkAsBilled}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Billed
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}