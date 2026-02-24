import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl, resolveUploadUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ProcessingOverlay from '@/components/ui/ProcessingOverlay';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { 
  ArrowLeft,
  Calendar,
  Edit2,
  CheckCircle2,
  ListTodo,
  Package,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  FileText,
  Clock,
  GanttChart,
  Truck,
  CircleDot,
  Folder,
  File,
  Users,
  Globe,
  RotateCcw,
  Tag,
  Crown,
  Activity,
  ChevronDown,
  ShoppingCart,
  PackageCheck,
  Wrench,
  Check,
  UserPlus,
  ImagePlus,
  Eye,
  X,
  ClipboardCheck,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isToday, isPast } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import ProgressNeedle from '@/components/project/ProgressNeedle';
import TeamAvatars from '@/components/project/TeamAvatars';
import TaskModal from '@/components/modals/TaskModal';
import TaskDetailModal from '@/components/modals/TaskDetailModal';
import TasksViewModal from '@/components/modals/TasksViewModal';
import PartModal from '@/components/modals/PartModal';
import PartsViewModal from '@/components/modals/PartsViewModal';
import NotesViewModal from '@/components/modals/NotesViewModal';
import ProjectModal from '@/components/modals/ProjectModal';
import GroupModal from '@/components/modals/GroupModal';
import FilesViewModal from '@/components/modals/FilesViewModal';
import ProjectActivityFeed from '@/components/project/ProjectActivityFeed';
import UpcomingDueDates from '@/components/project/UpcomingDueDates';
import TimeTracker from '@/components/project/TimeTracker';
import HaloPSATicketLink from '@/components/project/HaloPSATicketLink';
import ProjectSidebar from '@/components/project/ProjectSidebar';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';
import { logActivity, ActivityActions } from '@/components/project/ActivityLogger';
import { sendTaskAssignmentNotification, sendTaskCompletionNotification } from '@/utils/notifications';
import ArchiveProjectModal from '@/components/modals/ArchiveProjectModal';
import OnHoldReasonModal from '@/components/modals/OnHoldReasonModal';
import CompleteProjectModal from '@/components/modals/CompleteProjectModal';
import { cn } from '@/lib/utils';

const statusColors = {
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  on_hold: 'bg-slate-50 text-slate-700 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' }
];

// Paginated Tasks Overview Card for Project Detail
function TasksOverviewCard({ tasks, taskGroups, taskProgress, completedTasks, projectId, onAddTask, teamMembers = [] }) {
  const [taskPage, setTaskPage] = React.useState(0);
  const TASKS_PER_PAGE = 5;
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const totalPages = Math.max(1, Math.ceil(activeTasks.length / TASKS_PER_PAGE));
  const pagedTasks = activeTasks.slice(taskPage * TASKS_PER_PAGE, (taskPage + 1) * TASKS_PER_PAGE);

  const priorityColors = {
    high: 'bg-red-100 text-red-600',
    urgent: 'bg-red-100 text-red-600',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-500',
  };

  const getDueDateLabel = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-500' };
    if (diffDays === 0) return { text: 'Today', color: 'text-orange-500' };
    if (diffDays === 1) return { text: 'Tomorrow', color: 'text-amber-500' };
    if (diffDays <= 7) return { text: `${diffDays}d`, color: 'text-blue-500' };
    return { text: format(due, 'MMM d'), color: 'text-slate-400' };
  };

  return (
    <Link to={createPageUrl('ProjectTasks') + `?id=${projectId}`} className="sm:col-start-1 sm:row-start-1 lg:col-span-1 group">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 h-full max-h-[320px] border border-blue-100/60 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
        <div className="p-3.5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50">
                <ListTodo className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Tasks</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">{completedTasks} of {tasks.length}</span>
                  {tasks.length > 0 && (
                    <div className="w-12 h-1.5 rounded-full bg-blue-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${taskProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddTask(); }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-200/40 h-7 w-7 p-0 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="px-3 pb-2 space-y-0.5">
          {pagedTasks.length > 0 ? pagedTasks.map(t => {
            const group = t.group_id ? taskGroups.find(g => g.id === parseInt(t.group_id)) : null;
            const assignee = t.assigned_to ? teamMembers.find(m => m.email === t.assigned_to) : null;
            const assigneeName = assignee?.name || (t.assigned_to ? t.assigned_to.split('@')[0] : null);
            const dueInfo = getDueDateLabel(t.due_date);
            return (
              <div key={t.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-blue-50/60 transition-colors">
                <div className={cn("w-3 h-3 rounded border-2 flex items-center justify-center shrink-0",
                  t.status === 'in_progress' ? "border-blue-400 bg-blue-50" : t.status === 'review' ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white")}>
                  {t.status === 'in_progress' && <div className="w-1.5 h-1.5 rounded-sm bg-blue-500" />}
                  {t.status === 'review' && <div className="w-1.5 h-1.5 rounded-sm bg-amber-500" />}
                </div>
                <span className="text-xs text-slate-700 font-medium truncate flex-1 min-w-0">{t.title}</span>
                {assigneeName && (
                  <span className="text-[9px] text-slate-400 shrink-0">{assigneeName.split(' ')[0]}</span>
                )}
                {t.priority && t.priority !== 'none' && (
                  <span className={cn("text-[8px] px-1 py-0 rounded font-semibold uppercase shrink-0 leading-tight", priorityColors[t.priority] || priorityColors.low)}>{t.priority}</span>
                )}
                {dueInfo && (
                  <span className={cn("text-[9px] font-semibold shrink-0", dueInfo.color)}>{dueInfo.text}</span>
                )}
              </div>
            );
          }) : (
            <p className="text-xs text-slate-400 text-center py-3">No active tasks</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-3 pb-3" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTaskPage(p => Math.max(0, p - 1)); }}
              disabled={taskPage === 0}
              className="px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-[10px] text-slate-400">{taskPage + 1}/{totalPages}</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTaskPage(p => Math.min(totalPages - 1, p + 1)); }}
              disabled={taskPage >= totalPages - 1}
              className="px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </motion.div>
    </Link>
  );
}

const partStatusConfig = {
  needed: { label: 'Needed', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  received: { label: 'Received', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  ready_to_install: { label: 'Ready', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  installed: { label: 'Installed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
};

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];
const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// Paginated Parts Overview Card for Project Detail
function PartsOverviewCard({ parts, projectId, projectMembers = [], onAddPart, onPartStatusChange, refetchParts }) {
  const [partPage, setPartPage] = React.useState(0);
  const PARTS_PER_PAGE = 5;
  const activeParts = parts.filter(p => p.status !== 'installed');
  const installedCount = parts.filter(p => p.status === 'installed').length;
  const totalPages = Math.max(1, Math.ceil(activeParts.length / PARTS_PER_PAGE));
  const pagedParts = activeParts.slice(partPage * PARTS_PER_PAGE, (partPage + 1) * PARTS_PER_PAGE);

  // Order dialog state
  const [orderDialog, setOrderDialog] = React.useState({ open: false, part: null, screenshot: null, eta: null, notes: '' });
  const [orderScreenshotPreview, setOrderScreenshotPreview] = React.useState(null);
  const [viewingProof, setViewingProof] = React.useState(null);
  // Receive dialog state
  const [receiveDialog, setReceiveDialog] = React.useState({ open: false, part: null, installer: '', location: '', createTask: false });

  const openOrderDialog = (part) => {
    setOrderDialog({ open: true, part, screenshot: null, eta: null, notes: '' });
    setOrderScreenshotPreview(null);
  };

  const handleOrderScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setOrderDialog(prev => ({ ...prev, screenshot: ev.target.result }));
      setOrderScreenshotPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleOrderPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => {
          setOrderDialog(prev => ({ ...prev, screenshot: ev.target.result }));
          setOrderScreenshotPreview(ev.target.result);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleConfirmOrder = async () => {
    const { part, screenshot, eta, notes } = orderDialog;
    if (!part) return;
    const updateData = {
      status: 'ordered',
      order_proof: screenshot || null,
      order_date: format(new Date(), 'yyyy-MM-dd'),
    };
    if (eta) updateData.est_delivery_date = format(eta, 'yyyy-MM-dd');
    if (notes) updateData.notes = part.notes ? `${part.notes}\n📦 Order notes: ${notes}` : `📦 Order notes: ${notes}`;
    await api.entities.Part.update(part.id, updateData);
    if (onPartStatusChange) onPartStatusChange(part, 'ordered');
    else refetchParts?.();
    setOrderDialog({ open: false, part: null, screenshot: null, eta: null, notes: '' });
    setOrderScreenshotPreview(null);
  };

  const handleSetDeliveryDate = async (part, date) => {
    await api.entities.Part.update(part.id, { est_delivery_date: format(date, 'yyyy-MM-dd') });
    refetchParts?.();
  };

  const openReceiveDialog = (part, installerEmail) => {
    setReceiveDialog({ open: true, part, installer: installerEmail, location: '', createTask: false });
  };

  const handleConfirmReceive = async () => {
    const { part, installer, location, createTask } = receiveDialog;
    if (!part || !installer) return;
    const member = projectMembers.find(m => m.email === installer);
    await api.entities.Part.update(part.id, {
      status: 'ready_to_install',
      installer_email: installer,
      installer_name: member?.name || installer,
      received_date: format(new Date(), 'yyyy-MM-dd'),
      notes: location ? `${part.notes || ''}\n📍 Location: ${location}`.trim() : part.notes
    });
    if (createTask) {
      await api.entities.Task.create({
        title: `Install: ${part.name}`,
        description: `Install part${part.part_number ? ` #${part.part_number}` : ''}${location ? `\n📍 Location: ${location}` : ''}`,
        project_id: projectId,
        assigned_to: installer,
        assigned_name: member?.name || installer,
        status: 'todo',
        priority: 'medium'
      });
    }
    refetchParts?.();
    setReceiveDialog({ open: false, part: null, installer: '', location: '', createTask: false });
  };

  const handleMarkInstalled = async (part) => {
    await api.entities.Part.update(part.id, { status: 'installed', installed_date: format(new Date(), 'yyyy-MM-dd') });
    refetchParts?.();
  };

  const getDateLabel = (dateStr) => {
    if (!dateStr) return null;
    const date = parseLocalDate(dateStr);
    if (!date) return null;
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d late`, color: 'text-red-500' };
    if (diffDays === 0) return { text: 'Today', color: 'text-orange-500' };
    if (diffDays === 1) return { text: 'Tomorrow', color: 'text-amber-500' };
    if (diffDays <= 7) return { text: `${diffDays}d`, color: 'text-blue-500' };
    return { text: format(date, 'MMM d'), color: 'text-slate-400' };
  };

  const partsProgress = parts.length > 0 ? Math.round((installedCount / parts.length) * 100) : 0;

  return (
    <>
      <Link to={createPageUrl('ProjectParts') + `?id=${projectId}`} className="lg:col-start-1 lg:row-start-2 group">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 h-full max-h-[320px] border border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 hover:shadow-lg hover:shadow-emerald-100/50 hover:-translate-y-0.5"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />
        <div className="p-3.5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/50">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Parts</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">{installedCount} of {parts.length}</span>
                  {parts.length > 0 && (
                    <div className="w-12 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${partsProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddPart(); }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-200/40 h-7 w-7 p-0 rounded-lg flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="px-3 pb-2 space-y-0.5">
          {pagedParts.length > 0 ? pagedParts.map(p => {
            const etaInfo = getDateLabel(p.est_delivery_date);
            const dueInfo = !etaInfo ? getDateLabel(p.due_date) : null;
            const dateInfo = etaInfo || dueInfo;
            return (
              <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-emerald-50/60 transition-colors group/part">
                {/* Status badge */}
                <Badge variant="outline" className={cn("text-[8px] px-1 py-0 shrink-0 leading-tight", partStatusConfig[p.status]?.color)}>
                  {partStatusConfig[p.status]?.label || p.status}
                </Badge>
                {/* Name */}
                <span className="text-xs text-slate-700 font-medium truncate flex-1 min-w-0">{p.name}</span>
                {/* Assignee */}
                {p.assigned_name && (
                  <div className="flex items-center gap-0.5 shrink-0" title={p.assigned_name}>
                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold", getColorForEmail(p.assigned_to))}>
                      {getInitials(p.assigned_name)}
                    </div>
                  </div>
                )}
                {/* Order proof mini indicator */}
                {p.order_proof && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewingProof(p); }}
                    className="w-4 h-4 rounded border border-blue-200 overflow-hidden shrink-0"
                    title="View order proof"
                  >
                    <img src={p.order_proof} alt="" className="w-full h-full object-cover" />
                  </button>
                )}
                {/* ETA / Due date */}
                {dateInfo && (
                  <span className={cn("text-[9px] font-semibold shrink-0", dateInfo.color)}>
                    {etaInfo && <Truck className="w-2 h-2 inline mr-0.5" />}
                    {dateInfo.text}
                  </span>
                )}
                {/* Hover actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/part:opacity-100 transition-opacity shrink-0">
                  {p.status === 'needed' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openOrderDialog(p); }}
                      className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                      title="Order"
                    >
                      <ShoppingCart className="w-2.5 h-2.5 inline mr-0.5" />Order
                    </button>
                  )}
                  {p.status === 'ordered' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          title="Receive"
                        >
                          <PackageCheck className="w-2.5 h-2.5 inline mr-0.5" />Receive
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <div className="px-2 py-1 text-[10px] text-slate-500 font-medium">Assign installer:</div>
                        {projectMembers.map(m => (
                          <DropdownMenuItem key={m.id} onClick={() => openReceiveDialog(p, m.email)}>
                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] mr-1.5", getColorForEmail(m.email))}>{getInitials(m.name)}</div>
                            {m.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {p.status === 'ordered' && !p.est_delivery_date && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="px-1 py-0.5 text-[9px] rounded text-slate-500 hover:bg-slate-100 transition-colors"
                          title="Set ETA"
                        >
                          <Truck className="w-2.5 h-2.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
                        <CalendarPicker mode="single" selected={undefined} onSelect={(date) => date && handleSetDeliveryDate(p, date)} />
                      </PopoverContent>
                    </Popover>
                  )}
                  {p.status === 'received' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                          title="Assign Install"
                        >
                          <Wrench className="w-2.5 h-2.5 inline mr-0.5" />Install
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <div className="px-2 py-1 text-[10px] text-slate-500 font-medium">Assign installer:</div>
                        {projectMembers.map(m => (
                          <DropdownMenuItem key={m.id} onClick={() => openReceiveDialog(p, m.email)}>
                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] mr-1.5", getColorForEmail(m.email))}>{getInitials(m.name)}</div>
                            {m.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {p.status === 'ready_to_install' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkInstalled(p); }}
                      className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      title="Mark Installed"
                    >
                      <Check className="w-2.5 h-2.5 inline mr-0.5" />Done
                    </button>
                  )}
                </div>
              </div>
            );
          }) : (
            <p className="text-xs text-slate-400 text-center py-3">No active parts</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-3 pb-3" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPartPage(p => Math.max(0, p - 1)); }}
              disabled={partPage === 0}
              className="px-2 py-0.5 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-[10px] text-slate-400">{partPage + 1}/{totalPages}</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPartPage(p => Math.min(totalPages - 1, p + 1)); }}
              disabled={partPage >= totalPages - 1}
              className="px-2 py-0.5 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </motion.div>
      </Link>

      {/* Order Part Dialog */}
      <AlertDialog open={orderDialog.open} onOpenChange={(open) => { if (!open) { setOrderDialog({ open: false, part: null, screenshot: null, eta: null, notes: '' }); setOrderScreenshotPreview(null); } }}>
        <AlertDialogContent className="max-w-md" onPaste={handleOrderPaste}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Order Part
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span className="font-medium text-slate-900">{orderDialog.part?.name}</span>
                {orderDialog.part?.part_number && <span className="text-slate-500"> (#{orderDialog.part?.part_number})</span>}
                {orderDialog.part?.supplier && <span className="text-slate-500"> · {orderDialog.part?.supplier}</span>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <ImagePlus className="w-4 h-4" />
                Order Screenshot (optional)
              </label>
              {orderScreenshotPreview ? (
                <div className="relative rounded-lg border border-blue-200 overflow-hidden bg-slate-50">
                  <img src={orderScreenshotPreview} alt="Order proof" className="w-full max-h-48 object-contain" />
                  <button onClick={() => { setOrderScreenshotPreview(null); setOrderDialog(prev => ({ ...prev, screenshot: null })); }} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-colors">
                  <ImagePlus className="w-6 h-6 text-blue-400 mb-1.5" />
                  <span className="text-xs text-blue-600 font-medium">Click to upload or paste</span>
                  <span className="text-[10px] text-blue-400 mt-0.5">Ctrl+V to paste</span>
                  <input type="file" accept="image/*" onChange={handleOrderScreenshot} className="hidden" />
                </label>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4" />
                Estimated Delivery (optional)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    {orderDialog.eta ? format(orderDialog.eta, 'MMMM d, yyyy') : <span className="text-slate-400">Pick a date...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker mode="single" selected={orderDialog.eta} onSelect={(date) => setOrderDialog(prev => ({ ...prev, eta: date }))} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Order Notes (optional)</label>
              <Textarea value={orderDialog.notes} onChange={(e) => setOrderDialog(prev => ({ ...prev, notes: e.target.value }))} placeholder="Order #, tracking info..." className="h-16" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOrder} className="bg-blue-600 hover:bg-blue-700">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Mark as Ordered
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receive Part Dialog */}
      <AlertDialog open={receiveDialog.open} onOpenChange={(open) => !open && setReceiveDialog({ open: false, part: null, installer: '', location: '', createTask: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-amber-600" />
              Receive Part
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-slate-900">{receiveDialog.part?.name}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2"><MapPin className="w-4 h-4" />Where stored? (optional)</label>
              <Textarea value={receiveDialog.location} onChange={(e) => setReceiveDialog(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g., Warehouse shelf B3..." className="h-20" />
            </div>
            <div className="flex items-center space-x-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <Checkbox id="createTaskPD" checked={receiveDialog.createTask} onCheckedChange={(checked) => setReceiveDialog(prev => ({ ...prev, createTask: checked }))} />
              <Label htmlFor="createTaskPD" className="text-sm font-medium text-indigo-900 cursor-pointer">Create installation task</Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReceive} className="bg-amber-600 hover:bg-amber-700">
              <PackageCheck className="w-4 h-4 mr-2" />
              Confirm Received
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Proof Viewer */}
      <AlertDialog open={!!viewingProof} onOpenChange={(open) => !open && setViewingProof(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Order Proof
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span className="font-medium text-slate-900">{viewingProof?.name}</span>
                {viewingProof?.order_date && <span className="text-slate-500"> · Ordered {format(parseLocalDate(viewingProof.order_date) || new Date(), 'MMM d, yyyy')}</span>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {viewingProof?.order_proof && (
            <div className="rounded-lg border overflow-hidden bg-slate-50">
              <img src={viewingProof.order_proof} alt="Order proof" className="w-full max-h-96 object-contain" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showTasksView, setShowTasksView] = useState(false);
  const [showPartsView, setShowPartsView] = useState(false);
  const [showNotesView, setShowNotesView] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showFilesView, setShowFilesView] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, item: null });
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState(null);

  const { data: project, isLoading: loadingProject, refetch: refetchProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await api.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  // Check if user has access to this project
  const hasAccess = () => {
    if (!project || !currentUser) return false; // Deny by default while loading
    if (currentUser.role === 'admin') return true;
    if (!project.team_members || project.team_members.length === 0) return false; // No members = admin only
    return project.team_members.includes(currentUser.email);
  };

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: taskGroups = [], refetch: refetchGroups } = useQuery({
    queryKey: ['taskGroups', projectId],
    queryFn: () => api.entities.TaskGroup.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: parts = [], refetch: refetchParts } = useQuery({
    queryKey: ['parts', projectId],
    queryFn: () => api.entities.Part.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  // Filter teamMembers to only those on this project (for assignment dropdowns)
  const projectMembers = useProjectMembers(teamMembers, project);

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.entities.ProjectTemplate.list()
  });

  const { data: projectNotes = [] } = useQuery({
    queryKey: ['projectNotes', projectId],
    queryFn: () => api.entities.ProjectNote.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: projectFiles = [] } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => api.entities.ProjectFile.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: fileFolders = [] } = useQuery({
    queryKey: ['fileFolders', projectId],
    queryFn: () => api.entities.FileFolder.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: progressUpdates = [] } = useQuery({
    queryKey: ['progressUpdates', projectId],
    queryFn: () => api.entities.ProgressUpdate.filter({ project_id: projectId }, '-created_date', 10),
    enabled: !!projectId
  });

  const { data: integrationSettings } = useQuery({
    queryKey: ['integrationSettings'],
    queryFn: async () => {
      const settings = await api.entities.IntegrationSettings.filter({ setting_key: 'main' });
      return settings[0] || {};
    }
  });

  const { data: linkedQuote } = useQuery({
    queryKey: ['linkedQuote', project?.incoming_quote_id],
    queryFn: async () => {
      if (!project?.incoming_quote_id) return null;
      const quotes = await api.entities.IncomingQuote.filter({ id: project.incoming_quote_id });
      return quotes[0];
    },
    enabled: !!project?.incoming_quote_id
  });

  const { data: appSettings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const settings = await api.entities.ProposalSettings.filter({ setting_key: 'main' });
      return settings[0] || {};
    }
  });

  const { data: projectTags = [], refetch: refetchTags } = useQuery({
    queryKey: ['projectTags'],
    queryFn: () => api.entities.ProjectTag.list()
  });

  const appLogoUrl = appSettings?.app_logo_url;

  const tagColors = {
    slate: 'bg-slate-100 text-slate-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    amber: 'bg-amber-100 text-amber-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    lime: 'bg-lime-100 text-lime-700',
    green: 'bg-green-100 text-green-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    teal: 'bg-teal-100 text-teal-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    sky: 'bg-sky-100 text-sky-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    violet: 'bg-violet-100 text-violet-700',
    purple: 'bg-purple-100 text-purple-700',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-700',
    pink: 'bg-pink-100 text-pink-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  const getProjectTags = () => {
    if (!project?.tags || project.tags.length === 0) return [];
    return project.tags.map(tagId => projectTags.find(t => t.id === tagId)).filter(Boolean);
  };

  // Handle putting project on hold with reason
  const handleOnHold = async (reason) => {
    try {
      const onHoldTag = projectTags.find(t => t.name === 'On Hold');
      const inProgressTag = projectTags.find(t => t.name === 'In Progress');
      const completedTag = projectTags.find(t => t.name === 'Completed');
      
      // Remove In Progress/Completed tags, add On Hold (if tag exists)
      let newTags = (project.tags || []).filter(id => 
        id !== inProgressTag?.id && id !== completedTag?.id
      );
      if (onHoldTag && !newTags.includes(onHoldTag.id)) {
        newTags.push(onHoldTag.id);
      }
      
      await api.entities.Project.update(projectId, { 
        tags: newTags,
        status: 'on_hold',
        on_hold_reason: reason
      });
      
      // Add the reason as a project note
      await api.entities.ProjectNote.create({
        project_id: projectId,
        type: 'note',
        content: `🔸 **Project put on hold:** ${reason}`,
        created_by: currentUser?.email,
        created_by_name: currentUser?.full_name || currentUser?.email
      });
      
      await logActivity(projectId, 'project_on_hold', `put project on hold: ${reason}`, currentUser);
      setShowOnHoldModal(false);
      refetchProject();
      queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] });
    } catch (err) {
      console.error('Failed to put project on hold:', err);
    }
  };

  // Handle completing project
  const handleCompleteProject = async (notes) => {
    const completedTag = projectTags.find(t => t.name === 'Completed');
    const inProgressTag = projectTags.find(t => t.name === 'In Progress');
    const onHoldTag = projectTags.find(t => t.name === 'On Hold');
    
    // Remove In Progress/On Hold tags, add Completed
    let newTags = (project.tags || []).filter(id => 
      id !== inProgressTag?.id && id !== onHoldTag?.id
    );
    if (completedTag && !newTags.includes(completedTag.id)) {
      newTags.push(completedTag.id);
    }
    
    await api.entities.Project.update(projectId, { 
      tags: newTags,
      status: 'completed'
    });
    
    // Add completion notes if provided
    if (notes?.trim()) {
      await api.entities.ProjectNote.create({
        project_id: projectId,
        type: 'note',
        content: `✅ **Project completed:** ${notes}`,
        created_by: currentUser?.email,
        created_by_name: currentUser?.full_name || currentUser?.email
      });
    }
    
    await logActivity(projectId, 'project_completed', `completed project${notes ? ': ' + notes : ''}`, currentUser);
    refetchProject();
    queryClient.invalidateQueries({ queryKey: ['projectNotes', projectId] });
    setShowCompleteModal(false);
  };

  // Resume project from On Hold
  const handleResumeProject = async () => {
    const inProgressTag = projectTags.find(t => t.name === 'In Progress');
    const onHoldTag = projectTags.find(t => t.name === 'On Hold');
    
    let newTags = (project.tags || []).filter(id => id !== onHoldTag?.id);
    if (inProgressTag && !newTags.includes(inProgressTag.id)) {
      newTags.push(inProgressTag.id);
    }
    
    await api.entities.Project.update(projectId, { 
      tags: newTags,
      status: 'planning',
      on_hold_reason: ''
    });
    
    await logActivity(projectId, 'project_resumed', 'resumed project from on hold', currentUser);
    refetchProject();
  };

  // Tasks
    const handleSaveTask = async (data) => {
      const wasAssigned = editingTask?.assigned_to;
      const isNewlyAssigned = data.assigned_to && data.assigned_to !== 'unassigned' && data.assigned_to !== wasAssigned;

      if (editingTask) {
        await api.entities.Task.update(editingTask.id, data);
        await logActivity(projectId, ActivityActions.TASK_UPDATED, `updated task "${data.title}"`, currentUser, 'task', editingTask.id);
      } else {
        const newTask = await api.entities.Task.create(data);
        await logActivity(projectId, ActivityActions.TASK_CREATED, `created task "${data.title}"`, currentUser, 'task', newTask.id);
      }

      // Send notification if task is newly assigned to someone
      if (isNewlyAssigned) {
        await sendTaskAssignmentNotification({
          assigneeEmail: data.assigned_to,
          taskTitle: data.title,
          projectId,
          projectName: project?.name,
          currentUser,
        });
      }

      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
      setShowTaskModal(false);
      setEditingTask(null);
    };

  const handleTaskStatusChange = async (task, status) => {
    await api.entities.Task.update(task.id, { ...task, status });
    if (status === 'completed') {
      await logActivity(projectId, ActivityActions.TASK_COMPLETED, `completed task "${task.title}"`, currentUser, 'task', task.id);

      // Notify people who should be notified on task completion
      await sendTaskCompletionNotification({
        task,
        projectId,
        projectName: project?.name,
        currentUser,
      });
    } else {
      await logActivity(projectId, ActivityActions.TASK_UPDATED, `changed task "${task.title}" status to ${status.replace('_', ' ')}`, currentUser, 'task', task.id);
    }
    refetchTasks();
    queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
  };

  // Groups
  const handleCreateGroup = async (data) => {
    await api.entities.TaskGroup.create({ ...data, project_id: projectId });
    refetchGroups();
  };

  const handleSaveGroup = async (data) => {
    if (editingGroup) {
      await api.entities.TaskGroup.update(editingGroup.id, data);
    } else {
      await api.entities.TaskGroup.create(data);
    }
    refetchGroups();
    setShowGroupModal(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (group) => {
    await api.entities.TaskGroup.delete(group.id);
    // Ungroup tasks
    const groupTasks = tasks.filter(t => t.group_id === group.id);
    for (const task of groupTasks) {
      await api.entities.Task.update(task.id, { ...task, group_id: '' });
    }
    refetchGroups();
    refetchTasks();
  };

  // Parts
  const handleSavePart = async (data) => {
    if (editingPart) {
      await api.entities.Part.update(editingPart.id, data);
      await logActivity(projectId, ActivityActions.PART_UPDATED, `updated part "${data.name}"`, currentUser, 'part', editingPart.id);
    } else {
      const newPart = await api.entities.Part.create(data);
      await logActivity(projectId, ActivityActions.PART_CREATED, `added part "${data.name}"`, currentUser, 'part', newPart.id);
    }
    refetchParts();
    queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
    setShowPartModal(false);
    setEditingPart(null);
  };

  const handlePartStatusChange = async (part, status) => {
    await api.entities.Part.update(part.id, { ...part, status });
    const actionMap = {
      ordered: ActivityActions.PART_ORDERED,
      received: ActivityActions.PART_RECEIVED,
      installed: ActivityActions.PART_INSTALLED
    };
    await logActivity(projectId, actionMap[status] || ActivityActions.PART_UPDATED, `changed part "${part.name}" status to ${status}`, currentUser, 'part', part.id);

    // Notify assigned installer when part is ready to install
    if (status === 'ready_to_install' && part.installer_email && part.installer_email !== currentUser?.email) {
      try {
        await api.entities.UserNotification.create({
          user_email: part.installer_email,
          type: 'part_status',
          title: 'Part ready for installation',
          message: `"${part.name}" is now ready to be installed`,
          project_id: projectId,
          project_name: project?.name,
          from_user_email: currentUser?.email,
          from_user_name: currentUser?.full_name || currentUser?.email,
          link: `/ProjectDetail?id=${projectId}`,
          is_read: false
        });

        await api.functions.invoke('sendNotificationEmail', {
          to: part.installer_email,
          type: 'part_status',
          title: 'Part ready for installation',
          message: `"${part.name}" is now ready to be installed`,
          projectId: projectId,
          projectName: project?.name,
          fromUserName: currentUser?.full_name || currentUser?.email,
          link: `${window.location.origin}/ProjectDetail?id=${projectId}`
        });
      } catch (err) {
        console.error('Failed to send part notification:', err);
      }
    }

    refetchParts();
    queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
  };

  // Project
  const handleUpdateProject = async (data) => {
    await api.entities.Project.update(projectId, data);
    // Auto-archive when completed
    if (data.status === 'completed') {
      await api.entities.Project.update(projectId, { ...data, status: 'archived' });
    }
    refetchProject();
    setShowProjectModal(false);
  };

  // Quick inline update
  const handleQuickUpdate = async (field, value) => {
    await api.entities.Project.update(projectId, { ...project, [field]: value });
    refetchProject();
  };

  const handleTeamUpdate = async (emails) => {
    const previousMembers = project?.team_members || [];
    const newMembers = emails.filter(e => !previousMembers.includes(e));
    await api.entities.Project.update(projectId, { ...project, team_members: emails });
    refetchProject();

    // Send notifications to newly added team members
    for (const memberEmail of newMembers) {
      if (memberEmail !== currentUser?.email) {
        try {
          await api.entities.UserNotification.create({
            user_email: memberEmail,
            type: 'project_assigned',
            title: 'You have been added to a project',
            message: `${currentUser?.full_name || currentUser?.email} added you to "${project?.name}"`,
            project_id: projectId,
            project_name: project?.name,
            from_user_email: currentUser?.email,
            from_user_name: currentUser?.full_name || currentUser?.email,
            link: `/ProjectDetail?id=${projectId}`,
            is_read: false
          });
          await api.functions.invoke('sendNotificationEmail', {
            to: memberEmail,
            type: 'project_assigned',
            title: 'You have been added to a project',
            message: `${currentUser?.full_name || currentUser?.email} added you to "${project?.name}"`,
            projectId: projectId,
            projectName: project?.name,
            fromUserName: currentUser?.full_name || currentUser?.email,
            link: `${window.location.origin}/ProjectDetail?id=${projectId}`
          });
        } catch (notifErr) {
          console.error('Failed to send project assignment notification:', notifErr);
        }
      }
    }
  };

  // Save as Template
  const handleSaveAsTemplate = async () => {
    const templateData = {
      name: `${project.name} Template`,
      description: project.description || '',
      default_tasks: tasks.map(t => ({
        title: t.title,
        description: t.description || '',
        priority: t.priority || 'medium'
      })),
      default_parts: parts.map(p => ({
        name: p.name,
        part_number: p.part_number || '',
        quantity: p.quantity || 1
      }))
    };
    await api.entities.ProjectTemplate.create(templateData);
    alert('Project saved as template!');
  };

  // Archive project
  const handleArchiveProject = async (archiveData) => {
    setShowArchiveModal(false);
    setIsProcessing(true);
    setProcessingType('archive');
    try {
      await api.entities.Project.update(projectId, {
        ...project,
        status: 'archived',
        archive_reason: archiveData.reason,
        archive_type: archiveData.archiveType,
        archived_date: new Date().toISOString()
      });
      await logActivity(projectId, 'project_archived', `archived project: ${archiveData.reason}`, currentUser);
      toast.success('Project archived successfully');
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error archiving project:', error);
      toast.error('Failed to archive project. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  // Permanently delete project and all associated data
  const handleDeleteProject = async () => {
    setShowDeleteConfirm(false);
    setIsProcessing(true);
    setProcessingType('delete');
    try {
      await api.entities.Project.delete(projectId);
      toast.success('Project permanently deleted');
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  // Progress update
  const handleProgressUpdate = async (progressValue) => {
    await api.entities.Project.update(projectId, { ...project, progress: progressValue });
    await logActivity(projectId, ActivityActions.PROGRESS_UPDATED, `updated progress to ${progressValue}%`, currentUser);
    refetchProject();
    queryClient.invalidateQueries({ queryKey: ['projectActivity', projectId] });
  };

  // Delete
  const handleDelete = async () => {
    const { type, item } = deleteConfirm;
    if (type === 'task') {
      await api.entities.Task.delete(item.id);
      refetchTasks();
    } else if (type === 'part') {
      await api.entities.Part.delete(item.id);
      refetchParts();
    }
    setDeleteConfirm({ open: false, type: null, item: null });
  };

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Project not found</h2>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading project...</div>
      </div>
    );
  }

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">You don't have access to this project.</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
    }

    // Block access to archived or deleted projects
    if (project.status === 'archived' || project.status === 'deleted') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
          <ProcessingOverlay isVisible={isProcessing} type={processingType} />
          <ProjectNavHeader project={project} currentPage="ProjectDetail" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8"
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
              project.status === 'archived'
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-200/50'
                : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-200/50'
            }`}>
              {project.status === 'archived' ? (
                <Archive className="w-10 h-10 text-white" />
              ) : (
                <Trash2 className="w-10 h-10 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {project.status === 'archived' ? 'Project Archived' : 'Project Deleted'}
            </h2>
            <p className="text-slate-500 text-center max-w-md">
              {project.status === 'archived'
                ? 'This project has been archived and is no longer active. You can restore it from the Dashboard or click below.'
                : 'This project has been deleted.'}
            </p>
            {project.archive_reason && (
              <p className="text-sm text-slate-400 italic">Reason: {project.archive_reason}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              {project.status === 'archived' && (
                <Button
                  onClick={async () => {
                    setIsProcessing(true);
                    setProcessingType('archive');
                    try {
                      await api.entities.Project.update(projectId, {
                        status: 'planning',
                        archive_reason: '',
                        archive_type: '',
                        archived_date: ''
                      });
                      toast.success('Project restored successfully');
                      refetchProject();
                    } catch (error) {
                      toast.error('Failed to restore project');
                    } finally {
                      setIsProcessing(false);
                      setProcessingType(null);
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Project
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      );
    }

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#74C7FF]/10 dark:from-[#151d2b] dark:via-[#1a2332] dark:to-[#151d2b]">
      <ProcessingOverlay isVisible={isProcessing} type={processingType} />
      <ProjectNavHeader project={project} currentPage="ProjectDetail" />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* On Hold Banner */}
        {project.status === 'on_hold' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <p className="text-sm text-amber-800">
                <span className="font-medium">On Hold</span>
                {project.on_hold_reason && <span className="text-amber-600"> — {project.on_hold_reason}</span>}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResumeProject}
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7 text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Resume
            </Button>
          </motion.div>
        )}

        {/* ── Project Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-4 mb-5"
        >
          {/* Row 1: Title + Actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Project number + tags inline with title */}
              <div className="flex items-center gap-2 flex-wrap">
                {project.project_number && (
                  <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-xs font-mono font-semibold">
                    #{project.project_number}
                  </span>
                )}
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{project.name}</h1>
                {getProjectTags().map(tag => (
                  <span
                    key={tag.id}
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                      tagColors[tag.color] || tagColors.slate
                    )}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>

              {/* Meta row: client, lead, quote link */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {project.client && (
                  <Link
                    to={createPageUrl('Customers') + (project.customer_id ? `?view=${project.customer_id}` : '')}
                    className="text-[#0069AF] hover:underline text-sm"
                  >
                    {project.client} →
                  </Link>
                )}
                {project.project_lead && (
                  <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span className="font-medium">
                      {teamMembers.find(m => m.email === project.project_lead)?.name || project.project_lead.split('@')[0]}
                    </span>
                  </div>
                )}
                {(integrationSettings?.quoteit_api_url && (project.quoteit_quote_id || linkedQuote?.quoteit_id)) && (
                  <a
                    href={`${integrationSettings.quoteit_api_url}/QuoteView?id=${project.quoteit_quote_id || linkedQuote?.quoteit_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors border border-orange-200"
                  >
                    <FileText className="w-3 h-3" />
                    QuoteIT
                  </a>
                )}
                {project.status !== 'archived' && project.status !== 'completed' && (
                  <TeamAvatars
                    members={project.team_members || []}
                    teamMembers={teamMembers}
                    onUpdate={handleTeamUpdate}
                  />
                )}
              </div>
            </div>

            {/* Right: actions — timer + ticket + edit + more */}
            <div className="flex items-center gap-1.5 shrink-0">
              <TimeTracker
                projectId={projectId}
                currentUser={currentUser}
                timeBudgetHours={project.time_budget_hours || 0}
              />
              <HaloPSATicketLink
                project={project}
                onUpdate={refetchProject}
              />
              <Button variant="outline" size="sm" onClick={() => setShowProjectModal(true)} className="h-8 px-2.5 touch-manipulation">
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 touch-manipulation">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(createPageUrl('TimeReport') + `?project_id=${projectId}`)}>
                    <Clock className="w-4 h-4 mr-2" />
                    Time Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSaveAsTemplate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Save as Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowArchiveModal(true)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Project
                  </DropdownMenuItem>
                  {currentUser?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Move to Trash
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {project.description && <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 line-clamp-2">{project.description}</p>}

          {/* Row 2: Progress bar + status actions */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex-1 min-w-0">
              <ProgressNeedle
                projectId={projectId}
                value={project.progress || 0}
                onSave={handleProgressUpdate}
                currentUser={currentUser}
                onStatusChange={(status) => handleQuickUpdate('status', status)}
                halopsaTicketId={project.halopsa_ticket_id}
                hasUpdates={progressUpdates.length > 0}
                lastUpdateNote={progressUpdates[0]?.note}
              />
            </div>

            {project.status !== 'archived' && project.status !== 'completed' && (
              <div className="flex items-center gap-1.5 shrink-0">
                {project.status === 'on_hold' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResumeProject}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 h-7 text-xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowOnHoldModal(true)}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 h-7 text-xs"
                  >
                    On Hold
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setShowCompleteModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 text-xs"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Complete
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Tool Cards Grid + Sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Main Cards — 2x2 grid + Due Dates right column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_240px] gap-3 auto-rows-min">

            {/* Upcoming Due Dates — spans right column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="sm:col-start-2 sm:row-span-3 lg:col-start-3 lg:row-start-1 lg:row-span-3"
            >
              <UpcomingDueDates tasks={tasks} parts={parts} projectId={projectId} teamMembers={teamMembers} />
            </motion.div>

            {/* ─── Tasks Card (with pagination) ─── */}
            <TasksOverviewCard
              tasks={tasks}
              taskGroups={taskGroups}
              taskProgress={taskProgress}
              completedTasks={completedTasks}
              projectId={projectId}
              teamMembers={teamMembers}
              onAddTask={() => { setEditingTask(null); setShowTaskModal(true); }}
            />

            {/* ─── Messages Card ─── */}
            <Link to={createPageUrl('ProjectNotes') + `?id=${projectId}`} className="sm:col-start-1 sm:row-start-2 lg:col-start-2 lg:row-start-1 group">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 h-full max-h-[320px] border border-violet-100/60 bg-gradient-to-br from-white via-violet-50/30 to-purple-50/40 hover:shadow-lg hover:shadow-violet-100/50 hover:-translate-y-0.5"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
                <div className="p-3.5 pb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200/50">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Messages</h3>
                        <span className="text-[11px] text-slate-500 font-medium">{projectNotes.length} total</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Recent messages preview — compact with type + author */}
                <div className="px-3 pb-3 space-y-0.5 max-h-[160px] overflow-y-auto">
                  {projectNotes.length > 0 ? (
                    [...projectNotes].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5).map(note => {
                      const authorName = note.created_by_name || (note.author_email ? note.author_email.split('@')[0] : 'System');
                      const typeLabel = note.type === 'update' ? 'Update' : note.type === 'message' ? 'Message' : 'Note';
                      const typeBg = note.type === 'update' ? 'bg-amber-100 text-amber-700' : note.type === 'message' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600';
                      return (
                        <div key={note.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-violet-50/60 transition-colors">
                          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0", typeBg)}>{typeLabel}</span>
                          <p className="text-xs text-slate-600 truncate flex-1 min-w-0 leading-tight">{(note.title?.trim() || note.content)?.replace(/[#*_]/g, '').slice(0, 50)}</p>
                          <span className="text-[10px] text-violet-500 font-medium shrink-0">{authorName.split(' ')[0]}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-3">No messages yet</p>
                  )}
                </div>
              </motion.div>
            </Link>

            {/* ─── Parts Card ─── */}
            <PartsOverviewCard
              parts={parts}
              projectId={projectId}
              projectMembers={projectMembers}
              onAddPart={() => { setEditingPart(null); setShowPartModal(true); }}
              onPartStatusChange={handlePartStatusChange}
              refetchParts={refetchParts}
            />

            {/* ─── Files Card ─── */}
            <Link to={createPageUrl('ProjectFiles') + `?id=${projectId}`} className="lg:col-start-2 lg:row-start-2 group">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 h-full max-h-[320px] border border-amber-100/60 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40 hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-0.5"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400" />
                <div className="p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-200/50">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-none">Files</h3>
                        <span className="text-[11px] text-slate-500 font-medium">{projectFiles.length} files</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      {fileFolders.length > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                          <Folder className="w-3 h-3" />{fileFolders.length}
                        </span>
                      )}
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 font-semibold border border-orange-100">
                        <File className="w-3 h-3" />{projectFiles.length}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* ─── Recent Activity ─── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="sm:col-span-2 lg:col-span-3"
            >
              <button
                onClick={() => setShowActivity(!showActivity)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white dark:from-[#1e2a3a] dark:to-[#1e2a3a] rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-100">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold">Recent Activity</span>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-slate-400 transition-transform duration-200",
                  showActivity && "rotate-180"
                )} />
              </button>
              {showActivity && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white dark:bg-[#1e2a3a] rounded-b-2xl border border-t-0 border-slate-100 dark:border-slate-700/50 p-4 max-h-[250px] overflow-y-auto -mt-1"
                >
                  <ProjectActivityFeed projectId={projectId} progressUpdates={progressUpdates} compact />
                </motion.div>
              )}
            </motion.div>

          </div>

          {/* Sidebar — Calendar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:block"
          >
            <ProjectSidebar projectId={projectId} tasks={tasks} parts={parts} projectMembers={projectMembers} project={project} progressUpdates={progressUpdates} />
          </motion.div>
        </div>


      {/* Modals */}
      <ProjectModal
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        project={project}
        templates={templates}
        onSave={handleUpdateProject}
      />

      <TaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        task={editingTask}
        projectId={projectId}
        teamMembers={projectMembers}
        groups={taskGroups}
        onSave={handleSaveTask}
      />

      <PartModal
        open={showPartModal}
        onClose={() => { setShowPartModal(false); setEditingPart(null); }}
        part={editingPart}
        projectId={projectId}
        teamMembers={projectMembers}
        onSave={handleSavePart}
      />

      <PartsViewModal
        open={showPartsView}
        onClose={() => setShowPartsView(false)}
        parts={parts}
        projectId={projectId}
        onAdd={() => { setShowPartsView(false); setEditingPart(null); setShowPartModal(true); }}
        onEdit={(part) => { setShowPartsView(false); setEditingPart(part); setShowPartModal(true); }}
        onDelete={(part) => setDeleteConfirm({ open: true, type: 'part', item: part })}
        onStatusChange={handlePartStatusChange}
        onPartsExtracted={refetchParts}
      />

      <NotesViewModal
        open={showNotesView}
        onClose={() => setShowNotesView(false)}
        projectId={projectId}
        currentUser={currentUser}
        teamMembers={projectMembers}
        onTasksCreated={refetchTasks}
      />

      <TasksViewModal
        open={showTasksView}
        onClose={() => setShowTasksView(false)}
        tasks={tasks}
        groups={taskGroups}
        projectId={projectId}
        projectName={project?.name}
        teamMembers={projectMembers}
        currentUser={currentUser}
        onStatusChange={handleTaskStatusChange}
        onEdit={(task) => { setShowTasksView(false); setEditingTask(task); setShowTaskModal(true); }}
        onDelete={(task) => setDeleteConfirm({ open: true, type: 'task', item: task })}
        onTaskClick={(task) => { setShowTasksView(false); setSelectedTask(task); }}
        onCreateGroup={handleCreateGroup}
        onEditGroup={(group) => { setEditingGroup(group); setShowGroupModal(true); }}
        onDeleteGroup={handleDeleteGroup}
        onAddTask={() => { setShowTasksView(false); setEditingTask(null); setShowTaskModal(true); }}
        onTasksRefresh={refetchTasks}
        currentUserEmail={currentUser?.email}
      />

      <GroupModal
        open={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
        group={editingGroup}
        projectId={projectId}
        onSave={handleSaveGroup}
      />

      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        teamMembers={projectMembers}
        currentUser={currentUser}
        onEdit={(task) => { setSelectedTask(null); setEditingTask(task); setShowTaskModal(true); }}
      />

      <FilesViewModal
        open={showFilesView}
        onClose={() => setShowFilesView(false)}
        projectId={projectId}
        currentUser={currentUser}
      />

      {/* Archive Project Modal */}
      <ArchiveProjectModal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        project={project}
        onConfirm={handleArchiveProject}
      />

      {/* On Hold Modal */}
      <OnHoldReasonModal
        open={showOnHoldModal}
        onClose={() => setShowOnHoldModal(false)}
        project={project}
        onConfirm={handleOnHold}
      />

      {/* Complete Project Modal */}
      <CompleteProjectModal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        project={project}
        incompleteTasks={tasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length}
        onConfirm={handleCompleteProject}
      />

      {/* Delete Task/Part Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">This will permanently delete <strong>"{project?.name}"</strong> and ALL associated data including:</span>
              <span className="block text-sm text-slate-500">• All tasks and comments ({tasks?.length || 0} tasks)</span>
              <span className="block text-sm text-slate-500">• All parts ({parts?.length || 0} parts)</span>
              <span className="block text-sm text-slate-500">• All notes, files, time entries, and proposals</span>
              <span className="block font-semibold text-red-600 mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      </div>
      );
      }