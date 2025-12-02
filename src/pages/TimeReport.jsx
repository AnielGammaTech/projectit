import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, User, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TimeReport() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectIdParam = urlParams.get('project_id');
  
  const [selectedProject, setSelectedProject] = useState(projectIdParam || 'all');
  const [dateRange, setDateRange] = useState('30');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date')
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  // Filter entries
  const startDate = subDays(new Date(), parseInt(dateRange));
  const filteredEntries = timeEntries.filter(entry => {
    const matchesProject = selectedProject === 'all' || entry.project_id === selectedProject;
    const matchesDate = new Date(entry.created_date) >= startDate;
    return matchesProject && matchesDate && !entry.is_running;
  });

  // Calculate totals
  const totalMinutes = filteredEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;

  // Group by project
  const entriesByProject = filteredEntries.reduce((acc, entry) => {
    const pid = entry.project_id;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(entry);
    return acc;
  }, {});

  // Group by user
  const entriesByUser = filteredEntries.reduce((acc, entry) => {
    const email = entry.user_email;
    if (!acc[email]) acc[email] = { name: entry.user_name, entries: [], totalMinutes: 0 };
    acc[email].entries.push(entry);
    acc[email].totalMinutes += entry.duration_minutes || 0;
    return acc;
  }, {});

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const getProjectName = (id) => {
    const project = projects.find(p => p.id === id);
    return project?.name || 'Unknown Project';
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const handleExport = () => {
    const csvRows = [
      ['Date', 'Project', 'User', 'Description', 'Duration (hours)'],
      ...filteredEntries.map(e => [
        format(new Date(e.start_time), 'yyyy-MM-dd'),
        getProjectName(e.project_id),
        e.user_name,
        e.description || '',
        ((e.duration_minutes || 0) / 60).toFixed(2)
      ])
    ];
    const csv = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        {selectedProject !== 'all' && selectedProjectData && (
          <Link to={createPageUrl('ProjectDetail') + `?id=${selectedProject}`} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {selectedProjectData.name}
          </Link>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[#0069AF] shadow-lg shadow-[#0069AF]/20">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Time Report</h1>
              <p className="text-slate-500">
                {formatDuration(totalMinutes)} total logged
                {selectedProjectData && ` for ${selectedProjectData.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36 bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Total Time</p>
              <p className="text-2xl font-bold text-[#133F5C]">{totalHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Entries</p>
              <p className="text-2xl font-bold text-[#133F5C]">{filteredEntries.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Avg per Entry</p>
              <p className="text-2xl font-bold text-[#133F5C]">
                {filteredEntries.length > 0 ? formatDuration(Math.round(totalMinutes / filteredEntries.length)) : '0h 0m'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Team Members</p>
              <p className="text-2xl font-bold text-[#133F5C]">{Object.keys(entriesByUser).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Time by User */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-[#0069AF]" />
                Time by Team Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(entriesByUser).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(entriesByUser)
                    .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
                    .map(([email, data]) => (
                      <div key={email} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{data.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#0069AF]" 
                              style={{ width: `${(data.totalMinutes / totalMinutes) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600 w-16 text-right">{formatDuration(data.totalMinutes)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">No time entries</p>
              )}
            </CardContent>
          </Card>

          {/* Entries List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0069AF]" />
                Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEntries.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 text-sm">{entry.description || 'No description'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{entry.user_name}</span>
                          <span>•</span>
                          <span>{getProjectName(entry.project_id)}</span>
                          <span>•</span>
                          <span>{format(new Date(entry.start_time), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {formatDuration(entry.duration_minutes)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No time entries for this period</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}