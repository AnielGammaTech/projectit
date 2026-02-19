import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Plus, Clock, CheckCircle2, Package, Truck, 
  Calendar, DollarSign, Building2, Search, Filter, 
  ChevronRight, Edit2, Trash2, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import QuoteRequestModal from '@/components/modals/QuoteRequestModal';
import QuoteRequestDetailModal from '@/components/modals/QuoteRequestDetailModal';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700', icon: Clock },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-700', icon: FileText },
  quoted: { label: 'Quoted', color: 'bg-purple-100 text-purple-700', icon: DollarSign },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  ordered: { label: 'Ordered', color: 'bg-amber-100 text-amber-700', icon: Package },
  received: { label: 'Received', color: 'bg-green-100 text-green-700', icon: Truck }
};

const priorityColors = {
  low: 'border-slate-200',
  medium: 'border-blue-200',
  high: 'border-orange-200',
  urgent: 'border-red-300 bg-red-50/50'
};

export default function QuoteRequests() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quoteRequests'],
    queryFn: () => api.entities.QuoteRequest.list('-created_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.QuoteRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quoteRequests'] })
  });

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'No Project';
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Separate pending/in-progress from completed
  const activeQuotes = filteredQuotes.filter(q => !['received'].includes(q.status));
  const completedQuotes = filteredQuotes.filter(q => ['received'].includes(q.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quote Requests</h1>
            <p className="text-slate-500 mt-1">Submit and track quote requests for projects</p>
          </div>
          <Button
            onClick={() => { setEditingQuote(null); setShowCreateModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {Object.entries(statusConfig).slice(0, 4).map(([key, config], idx) => {
            const count = quotes.filter(q => q.status === key).length;
            const Icon = config.icon;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    statusFilter === key && "ring-2 ring-indigo-500"
                  )}
                  onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", config.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                        <p className="text-xs text-slate-500">{config.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quote List */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : filteredQuotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl border border-slate-100"
          >
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No quote requests</h3>
            <p className="text-slate-500 mb-6">Submit your first quote request to get started</p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Active Requests */}
            {activeQuotes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Active Requests ({activeQuotes.length})
                </h3>
                <div className="grid gap-3">
                  <AnimatePresence>
                    {activeQuotes.map((quote, idx) => {
                      const status = statusConfig[quote.status] || statusConfig.pending;
                      const StatusIcon = status.icon;

                      return (
                        <motion.div
                          key={quote.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => setSelectedQuote(quote)}
                          className={cn(
                            "bg-white rounded-xl border-2 p-4 cursor-pointer hover:shadow-lg transition-all group",
                            priorityColors[quote.priority]
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn("p-2.5 rounded-xl shrink-0", status.color)}>
                              <StatusIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {quote.title}
                                  </h4>
                                  <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{quote.description}</p>
                                </div>
                                <Badge className={status.color}>{status.label}</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5" />
                                  {getProjectName(quote.project_id)}
                                </span>
                                {quote.quote_amount && (
                                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    ${quote.quote_amount.toLocaleString()}
                                  </span>
                                )}
                                {quote.install_date && (
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Install: {format(new Date(quote.install_date), 'MMM d')}
                                  </span>
                                )}
                                {quote.assigned_to_name && (
                                                                  <span className="flex items-center gap-1.5 text-indigo-600">
                                                                    <User className="w-3.5 h-3.5" />
                                                                    {quote.assigned_to_name}
                                                                  </span>
                                                                )}
                                                                <span className="text-slate-400">
                                                                  by {quote.requested_by_name}
                                                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Completed */}
            {completedQuotes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Completed ({completedQuotes.length})
                </h3>
                <div className="grid gap-2">
                  {completedQuotes.map((quote) => {
                    const status = statusConfig[quote.status];
                    return (
                      <div
                        key={quote.id}
                        onClick={() => setSelectedQuote(quote)}
                        className="bg-slate-50 rounded-lg border border-slate-100 p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-slate-700">{quote.title}</span>
                          {quote.quote_amount && (
                            <span className="text-sm text-slate-500">${quote.quote_amount.toLocaleString()}</span>
                          )}
                          <span className="text-xs text-slate-400 ml-auto">
                            {format(new Date(quote.created_date), 'MMM d')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <QuoteRequestModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingQuote(null); }}
        quote={editingQuote}
        projects={projects}
        currentUser={currentUser}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
          setShowCreateModal(false);
          setEditingQuote(null);
        }}
      />

      <QuoteRequestDetailModal
        open={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        quote={selectedQuote}
        projects={projects}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onEdit={(quote) => {
          setSelectedQuote(null);
          setEditingQuote(quote);
          setShowCreateModal(true);
        }}
        onDelete={(quote) => {
          deleteMutation.mutate(quote.id);
          setSelectedQuote(null);
        }}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ['quoteRequests'] })}
      />
    </div>
  );
}