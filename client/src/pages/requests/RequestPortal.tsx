import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Plus, Clock, AlertCircle, 
  CheckCircle2, MessageSquare, History, User,
  MoreVertical, Paperclip, Send, Shield, Zap,
  Activity, ArrowRight, ChevronRight, ChevronDown, LayoutGrid, List,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ticketsService, projectsService } from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import { useAppStore } from '../../context/appStore';
import { cn, formatDate } from '../../utils/helpers';
import { emitSuccessToast, emitErrorToast } from '../../context/toastBus';
import api from '../../services/api';
import { addDaysToDateKey } from '../../utils/helpers';
import { ProjectTaskCreateModal } from '../../components/ProjectTaskCreateModal';
import { timelineService } from '../../services/api';

const getEntityId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
};

const TICKET_TYPES = [
  { value: 'BUG', label: 'Bug', color: 'rose' },
  { value: 'CHANGE_REQUEST', label: 'Change Request', color: 'amber' },
  { value: 'NEW_FEATURE', label: 'New Feature', color: 'indigo' },
  { value: 'UI_CHANGE', label: 'UI Change', color: 'pink' },
  { value: 'URGENT_FIX', label: 'Urgent Fix', color: 'red' },
  { value: 'PERFORMANCE_ISSUE', label: 'Performance', color: 'orange' },
  { value: 'SECURITY_ISSUE', label: 'Security', color: 'emerald' },
  { value: 'OTHER', label: 'Other', color: 'surface' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'surface' },
  { value: 'MEDIUM', label: 'Medium', color: 'blue' },
  { value: 'HIGH', label: 'High', color: 'orange' },
  { value: 'CRITICAL', label: 'Critical', color: 'red' },
  { value: 'BLOCKER', label: 'Blocker', color: 'rose' },
];

const STATUS_MAP: Record<string, any> = {
  OPEN: { label: 'Open', color: 'blue', icon: Clock },
  UNDER_REVIEW: { label: 'Under Review', color: 'amber', icon: Search },
  APPROVED: { label: 'Approved', color: 'emerald', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'rose', icon: AlertCircle },
  ON_HOLD: { label: 'On Hold', color: 'surface', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'indigo', icon: Zap },
  TESTING: { label: 'Testing', color: 'purple', icon: Activity },
  CLIENT_REVIEW: { label: 'Client Review', color: 'orange', icon: User },
  REVISION_REQUIRED: { label: 'Revision', color: 'red', icon: AlertCircle },
  COMPLETED: { label: 'Completed', color: 'emerald', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', color: 'surface', icon: Shield },
};

const RequestPortal: React.FC = () => {
  const { user } = useAuthStore();
  const { users } = useAppStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'activity'>('messages');
  const [comment, setComment] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [phases, setPhases] = useState<any[]>([]);

  useEffect(() => {
    fetchTickets();
    fetchProjects();
  }, []);

  const [analytics, setAnalytics] = useState<any>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const [ticketsRes, analyticsRes] = await Promise.all([
        ticketsService.getAll(),
        ticketsService.getAnalytics()
      ]);
      setTickets(ticketsRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (error) {
      emitErrorToast('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectsService.getAll();
      setProjects(res.data.data || []);
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  };

  const [currentFilter, setCurrentFilter] = useState('ALL');
  
  const filteredTickets = tickets.filter(ticket => {
    if (currentFilter === 'ALL') return true;
    if (currentFilter === 'OPEN') return ticket.status === 'OPEN';
    if (currentFilter === 'IN_PROGRESS') return ['IN_PROGRESS', 'TESTING'].includes(ticket.status);
    if (currentFilter === 'COMPLETED') return ['COMPLETED', 'CLOSED'].includes(ticket.status);
    if (currentFilter === 'DELAYED') return ticket.sla?.isResolutionBreached || ticket.sla?.isResponseBreached;
    if (currentFilter === 'CLIENT_REVIEW') return ticket.status === 'CLIENT_REVIEW';
    return true;
  });

  const handleStatusUpdate = async (id: string, status: string, note?: string, taskId?: string) => {
    try {
      await ticketsService.updateStatus(id, status, note, taskId);
      emitSuccessToast(`Status updated to ${status}`);
      fetchTickets();
      if (selectedTicket?.id === id) {
        const res = await ticketsService.getById(id);
        setSelectedTicket(res.data.data);
      }
    } catch (error) {
      emitErrorToast('Failed to update status');
    }
  };

  const handleAddComment = async (id: string) => {
    if (!comment.trim()) return;
    try {
      await ticketsService.addComment(id, { content: comment });
      setComment('');
      const res = await ticketsService.getById(id);
      setSelectedTicket(res.data.data);
      emitSuccessToast('Comment added');
    } catch (error) {
      emitErrorToast('Failed to add comment');
    }
  };

  const isClient = user?.userType === 'client';
  const canApproveRequests = !isClient && ['super_admin', 'admin', 'manager'].includes(String(user?.role || ''));
  const canCreateRequest = !isClient || ['CLIENT_ADMIN', 'CLIENT_MANAGER'].includes(String(user?.role || ''));
  const approvalQueue = tickets.filter(ticket => ['OPEN', 'UNDER_REVIEW', 'ON_HOLD'].includes(ticket.status));

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [preFilledTaskName, setPreFilledTaskName] = useState('');
  const [currentTicket, setCurrentTicket] = useState<any>(null);

  const handleApprovalAction = async (ticket: any, status: string, note?: string) => {
    if (status === 'APPROVED') {
      console.log("Selected Request:", ticket);
      console.log("Request projectId:", ticket.projectId);
      const requestProjectId = getEntityId(ticket.projectId);
      if (!requestProjectId || requestProjectId === 'undefined') {
        emitErrorToast('This request has no project linked or the linked project is invalid.');
        return;
      }
      
      let targetProject = projects.find(p => 
        getEntityId(p) === requestProjectId ||
        getEntityId(p.id || p._id) === requestProjectId
      );
      
      if (!targetProject) {
        try {
          const response = await projectsService.getById(requestProjectId);
          targetProject = response.data?.data;
          if (targetProject) {
            setProjects((current) => [...current, targetProject]);
          }
        } catch (error) {
          console.error('Failed to load linked project', error);
        }
      }

      if (!targetProject) {
        emitErrorToast('Linked project deleted or you do not have access.');
        return;
      }
      
      setPreFilledTaskName(ticket.title);
      setCurrentTicket(ticket);
      
      // Fetch phases for the project
      void (async () => {
        try {
          const response = await timelineService.get(targetProject.id || targetProject._id);
          setPhases((response.data?.data?.phases || []).filter((p: any) => p.id !== 'ungrouped'));
        } catch {
          setPhases([]);
        }
      })();

      setIsTaskModalOpen(true);
    } else {
      await handleStatusUpdate(ticket.id, status, note);
    }
  };

  const handleTaskCreated = async (taskId: string) => {
    if (currentTicket) {
      await handleStatusUpdate(currentTicket.id, 'APPROVED', 'Approved by manager', taskId);
    }
  };

  const handleTaskSubmit = async (data: any) => {
    console.log("Selected Request:", currentTicket);
    console.log("Request projectId:", currentTicket?.projectId);
    const requestProjectId = getEntityId(currentTicket?.projectId);
    if (!requestProjectId) {
      emitErrorToast('This request has no project linked or the linked project is invalid.');
      return;
    }
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        taskType: data.taskType,
        priority: data.priority,
        status: data.status,
        projectId: requestProjectId,
        requestId: currentTicket.id || currentTicket._id,
        createdFromRequest: true,
        assigneeIds: data.assigneeIds,
        startDate: data.startDate,
        dueDate: data.dueDate,
        durationDays: data.durationDays,
        phaseId: data.phaseId || undefined,
        subcategoryId: data.subcategoryId || undefined,
        estimatedHours: data.estimatedHours || undefined,
        labels: data.labels,
        tags: data.tags,
      };
      console.log("Payload being sent:", payload);

      const res = await api.post('/tasks', payload);
      if (res.data?.success) {
        const createdTask = res.data.data;
        await handleTaskCreated(createdTask.id || createdTask._id);
        setIsTaskModalOpen(false);
        emitSuccessToast('Task created and request approved.');
      }
    } catch (err) {
      console.error('Create task failed:', err);
      emitErrorToast((err as any)?.response?.data?.error?.message || 'Failed to create task.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Request Portal</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
            <button 
              onClick={() => setView('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                view === 'list' ? "bg-white dark:bg-surface-700 shadow-sm text-brand-600" : "text-surface-500"
              )}
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setView('kanban')}
              className={cn(
                "p-2 rounded-lg transition-all",
                view === 'kanban' ? "bg-white dark:bg-surface-700 shadow-sm text-brand-600" : "text-surface-500"
              )}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          
          {canCreateRequest && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20"
            >
              <Plus size={18} />
              {isClient ? 'Raise Request' : 'Create Ticket'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex overflow-x-auto md:grid md:grid-cols-6 gap-3 py-2 scrollbar-thin scrollbar-thumb-surface-200 dark:scrollbar-thumb-surface-700">
        {[
          { label: 'Total Requests', value: analytics?.total || 0, color: 'blue', filter: 'ALL' },
          { label: 'Pending', value: analytics?.open || 0, color: 'amber', filter: 'OPEN' },
          { label: 'In Progress', value: analytics?.inProgress || 0, color: 'indigo', filter: 'IN_PROGRESS' },
          { label: 'Completed', value: analytics?.resolved || 0, color: 'emerald', filter: 'COMPLETED' },
          { label: 'Delayed', value: analytics?.delayed || 0, color: 'red', filter: 'DELAYED' },
          { label: 'Client Review', value: analytics?.clientReviewPending || 0, color: 'purple', filter: 'CLIENT_REVIEW' },
        ].map((stat, i) => (
          <div 
            key={i} 
            className={`flex-shrink-0 w-[130px] md:w-auto bg-white dark:bg-surface-900 p-3 rounded-2xl border border-surface-100 dark:border-surface-800 shadow-sm cursor-pointer hover:border-blue-500 transition-all ${currentFilter === stat.filter ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setCurrentFilter(stat.filter)}
          >
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {canApproveRequests && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-surface-100 dark:border-surface-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-surface-900 dark:text-white">Manager Approval Queue</h2>
              <p className="text-xs font-medium text-surface-500 mt-1">
                Review new client requests before task creation and delivery flow.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-wider">
              {approvalQueue.length} Pending
            </div>
          </div>

          {approvalQueue.length === 0 ? (
            <div className="px-6 py-8 text-sm font-medium text-surface-500">
              No requests are waiting for approval.
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {approvalQueue.map((ticket) => (
                <div key={ticket.id} className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className="text-left min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-md">
                        {ticket.ticketId}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">
                        {ticket.projectId?.name || 'Project'}
                      </span>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
                        ticket.priority === 'CRITICAL' || ticket.priority === 'BLOCKER'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
                      )}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-sm font-black text-surface-900 dark:text-white mt-2 truncate">
                      {ticket.title}
                    </p>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {ticket.status === 'OPEN' && (
                      <button
                        type="button"
                        onClick={() => handleApprovalAction(ticket, 'UNDER_REVIEW', 'Moved to manager review')}
                        className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-black hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                      >
                        Start Review
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApprovalAction(ticket, 'APPROVED', 'Approved by manager')}
                      className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovalAction(ticket, 'ON_HOLD', 'Put on hold by manager')}
                      className="px-3 py-2 rounded-xl bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200 text-xs font-black hover:bg-surface-200 dark:hover:bg-surface-700 transition-all"
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovalAction(ticket, 'REJECTED', 'Rejected by manager')}
                      className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-black hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-surface-500 font-medium animate-pulse">Loading your requests...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-surface-50 dark:bg-surface-800 rounded-full flex items-center justify-center mb-6">
              <Activity size={32} className="text-surface-300" />
            </div>
            <h3 className="text-xl font-bold text-surface-900 dark:text-white">No requests found</h3>
            <p className="text-surface-500 mt-2 max-w-sm mx-auto">
              {isClient 
                ? "You haven't raised any requests yet. Click the button above to get started."
                : "No active client requests found in this workspace."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-50/50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-800">
                  <th className="px-6 py-4 text-xs font-bold text-surface-400 uppercase tracking-wider">Ticket</th>
                  <th className="px-6 py-4 text-xs font-bold text-surface-400 uppercase tracking-wider">Request</th>
                  <th className="px-6 py-4 text-xs font-bold text-surface-400 uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-surface-400 uppercase tracking-wider hidden md:table-cell">Priority</th>
                  <th className="px-6 py-4 text-xs font-bold text-surface-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-surface-400 uppercase tracking-wider hidden md:table-cell">Created</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50 dark:divide-surface-800">
                {filteredTickets.map((ticket) => {
                  const status = STATUS_MAP[ticket.status] || STATUS_MAP.OPEN;
                  const type = TICKET_TYPES.find(t => t.value === ticket.type) || TICKET_TYPES[7];
                  const priority = PRIORITIES.find(p => p.value === ticket.priority) || PRIORITIES[1];
                  const StatusIcon = status.icon;

                  return (
                    <motion.tr 
                      key={ticket.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-surface-50/80 dark:hover:bg-surface-800/40 transition-all cursor-pointer border-b border-surface-50 dark:border-surface-800/50 last:border-0"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <td className="px-6 py-5">
                        <span className="font-mono text-[10px] font-black text-brand-600 bg-brand-50/50 dark:bg-brand-900/30 px-2 py-1 rounded-md tracking-tighter">
                          {ticket.ticketId}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-surface-900 dark:text-white truncate max-w-[240px] group-hover:text-brand-600 transition-colors">
                          {ticket.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-surface-300" />
                          <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">{ticket.projectId?.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          `bg-${type.color}-50 text-${type.color}-600 dark:bg-${type.color}-900/20 dark:text-${type.color}-400`
                        )}>
                          {type.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                           <div className={cn("w-2 h-2 rounded-full shadow-sm", `bg-${priority.color}-500`)} />
                           <span className="text-xs font-semibold text-surface-600 dark:text-surface-300">{priority.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-tight",
                          `bg-${status.color}-50 text-${status.color}-700 dark:bg-${status.color}-950/40 dark:text-${status.color}-300`
                        )}>
                          <StatusIcon size={12} className="opacity-70" />
                          {status.label}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-surface-400 font-medium hidden md:table-cell">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:text-brand-600 transition-all ml-auto">
                          <ChevronRight size={18} />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Detail Panel */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-surface-950/30 backdrop-blur-[2px]">
             <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 28, stiffness: 220 }}
               className="w-full max-w-2xl h-full bg-white dark:bg-surface-900 shadow-3xl overflow-hidden flex flex-col border-l border-surface-100 dark:border-surface-800"
             >
                {/* Panel Header */}
                <div className="px-8 py-6 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between bg-surface-50/30 dark:bg-surface-800/20">
                  <div className="flex items-center gap-5">
                    <button onClick={() => setSelectedTicket(null)} className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-surface-800 rounded-xl transition-all border border-transparent hover:border-surface-100 dark:hover:border-surface-700 shadow-sm">
                      <X size={20} className="text-surface-500" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded uppercase tracking-tighter">
                          {selectedTicket.ticketId}
                        </span>
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">{selectedTicket.projectId?.name}</span>
                      </div>
                      <h2 className="text-xl font-black text-surface-900 dark:text-white mt-1">Ticket Overview</h2>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                  {/* Status & Priority Bar */}
                  <div className="flex flex-wrap items-center gap-8 pb-8 border-b border-surface-100 dark:border-surface-800">
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.1em]">Status</p>
                        <div className="relative">
                          <button
                            onClick={() => !(isClient && selectedTicket.status === 'CLOSED') && setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            disabled={isClient && selectedTicket.status === 'CLOSED'}
                            className={cn(
                              "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-tight border-none focus:ring-4 focus:ring-brand-500/10 cursor-pointer transition-all",
                              `bg-${STATUS_MAP[selectedTicket.status]?.color}-50 text-${STATUS_MAP[selectedTicket.status]?.color}-700 dark:bg-${STATUS_MAP[selectedTicket.status]?.color}-950/40 dark:text-${STATUS_MAP[selectedTicket.status]?.color}-300`,
                              isClient && selectedTicket.status === 'CLOSED' ? 'opacity-50 cursor-not-allowed' : ''
                            )}
                          >
                            <span>{STATUS_MAP[selectedTicket.status]?.label}</span>
                            <ChevronDown size={14} className={cn("transition-transform opacity-70", isStatusDropdownOpen ? "rotate-180" : "")} />
                          </button>
                          
                          <AnimatePresence>
                            {isStatusDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                                <motion.div
                                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-surface-100 dark:border-surface-700 overflow-hidden z-50 py-2"
                                >
                                  {Object.keys(STATUS_MAP).map(key => {
                                    const st = STATUS_MAP[key];
                                    const Icon = st.icon;
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => {
                                          handleStatusUpdate(selectedTicket.id, key);
                                          setIsStatusDropdownOpen(false);
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors text-left",
                                          selectedTicket.status === key 
                                            ? `bg-${st.color}-50 text-${st.color}-700 dark:bg-${st.color}-900/30 dark:text-${st.color}-400` 
                                            : "text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700"
                                        )}
                                      >
                                        <Icon size={14} className={selectedTicket.status === key ? `text-${st.color}-600` : "text-surface-400"} />
                                        {st.label}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.1em]">Priority</p>
                        <div className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-tight",
                          `bg-${PRIORITIES.find(p => p.value === selectedTicket.priority)?.color}-50 text-${PRIORITIES.find(p => p.value === selectedTicket.priority)?.color}-700 dark:bg-${PRIORITIES.find(p => p.value === selectedTicket.priority)?.color}-950/40`
                        )}>
                          {PRIORITIES.find(p => p.value === selectedTicket.priority)?.label}
                        </div>
                     </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-4">
                    <h1 className="text-2xl font-black text-surface-900 dark:text-white leading-[1.2] break-words">
                      {selectedTicket.title}
                    </h1>
                    <div className="p-6 bg-surface-50/50 dark:bg-surface-800/30 rounded-3xl border border-surface-100/50 dark:border-surface-800/50 shadow-inner">
                      <p className="text-surface-700 dark:text-surface-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </div>

                  {canApproveRequests && ['OPEN', 'UNDER_REVIEW', 'ON_HOLD'].includes(selectedTicket.status) && (
                    <div className="p-5 rounded-3xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 space-y-4">
                      <div>
                        <h3 className="text-sm font-black text-surface-900 dark:text-white">Manager Review</h3>
                        <p className="text-xs font-medium text-surface-500 mt-1">
                          Approving this request will move it into the delivery flow and create the linked task through the existing task system.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedTicket.status === 'OPEN' && (
                          <button
                            type="button"
                            onClick={() => handleApprovalAction(selectedTicket, 'UNDER_REVIEW', 'Moved to manager review')}
                            className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-black hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                          >
                            Start Review
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApprovalAction(selectedTicket, 'APPROVED', 'Approved by manager')}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-all shadow-sm"
                        >
                          Approve Request
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprovalAction(selectedTicket, 'ON_HOLD', 'Put on hold by manager')}
                          className="px-4 py-2.5 rounded-xl bg-white text-surface-700 dark:bg-surface-800 dark:text-surface-200 text-xs font-black hover:bg-surface-100 dark:hover:bg-surface-700 transition-all border border-surface-200 dark:border-surface-700"
                        >
                          Hold
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprovalAction(selectedTicket, 'REJECTED', 'Rejected by manager')}
                          className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-black hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="space-y-8">
                    <div className="flex bg-surface-100/80 dark:bg-surface-800/50 p-1.5 rounded-2xl w-fit border border-surface-200/50 dark:border-surface-700/50 shadow-sm">
                      <button 
                        onClick={() => setActiveTab('messages')}
                        className={cn(
                          "px-8 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                          activeTab === 'messages' ? "bg-white dark:bg-surface-700 shadow-md text-brand-600 scale-[1.02]" : "text-surface-500 hover:text-surface-700"
                        )}
                      >
                        Discussions
                      </button>
                      <button 
                        onClick={() => setActiveTab('activity')}
                        className={cn(
                          "px-8 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                          activeTab === 'activity' ? "bg-white dark:bg-surface-700 shadow-md text-brand-600 scale-[1.02]" : "text-surface-500 hover:text-surface-700"
                        )}
                      >
                        Timeline
                      </button>
                    </div>

                    {activeTab === 'messages' ? (
                      <div className="space-y-8">
                        {selectedTicket.comments?.map((msg: any, i: number) => (
                          <div key={i} className={cn(
                            "flex gap-5",
                            msg.authorId?.id === user?.id ? "flex-row-reverse" : ""
                          )}>
                             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-700 flex-shrink-0 flex items-center justify-center font-black text-brand-600 uppercase text-lg shadow-sm">
                               {msg.authorId?.name?.[0] || 'U'}
                             </div>
                             <div className={cn("max-w-[85%] space-y-2", msg.authorId?.id === user?.id ? "text-right" : "")}>
                                <div className={cn("flex items-center gap-2 mb-1", msg.authorId?.id === user?.id ? "flex-row-reverse" : "")}>
                                  <span className="text-xs font-black text-surface-900 dark:text-white tracking-tight">{msg.authorId?.name}</span>
                                  <span className="text-[10px] font-bold text-surface-400 uppercase">{formatDate(msg.createdAt)}</span>
                                </div>
                                <div className={cn(
                                  "p-5 rounded-3xl text-sm leading-relaxed shadow-sm border break-words whitespace-pre-wrap",
                                  msg.authorId?.id === user?.id 
                                    ? "bg-brand-600 text-white rounded-tr-none border-brand-500 shadow-brand-500/10" 
                                    : "bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-tl-none border-surface-100 dark:border-surface-700"
                                )}>
                                  {msg.content}
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-8 pl-6 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-100 dark:before:bg-surface-800">
                        {selectedTicket.activities?.map((act: any, i: number) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[29px] top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-surface-900 border-[3px] border-brand-500 shadow-sm" />
                            <div>
                              <p className="text-xs font-black text-surface-900 dark:text-white uppercase tracking-tight">{act.action.replace('_', ' ')}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[11px] font-bold text-surface-500">By {act.actorId?.name}</p>
                                <span className="text-surface-200 text-[10px]">|</span>
                                <p className="text-[10px] font-medium text-surface-400">{formatDate(act.createdAt)}</p>
                              </div>
                              {act.details?.note && (
                                <div className="mt-3 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-100/50 dark:border-surface-800/50">
                                  <p className="text-xs italic text-surface-500 dark:text-surface-400">"{act.details.note}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Input */}
                {activeTab === 'messages' && (
                  <div className="p-8 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/20">
                    <div className="flex items-end gap-4 bg-white dark:bg-surface-900 p-3 pl-5 rounded-3xl border border-surface-200 dark:border-surface-700 shadow-xl shadow-surface-200/20 dark:shadow-none focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/5 transition-all">
                      <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Type your message here..." 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-40 min-h-[44px] custom-scrollbar font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(selectedTicket.id);
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl shadow-lg shadow-brand-500/20 transition-all active:scale-95 group" onClick={() => handleAddComment(selectedTicket.id)}>
                          <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-surface-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-surface-900 dark:text-white">Create New Request</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form className="p-8 space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  title: formData.get('title'),
                  description: formData.get('description'),
                  type: formData.get('type'),
                  priority: formData.get('priority'),
                  projectId: formData.get('projectId'),
                };
                console.log("Payload being sent:", data);
                try {
                  await ticketsService.create(data);
                  emitSuccessToast('Request raised successfully');
                  setIsCreateModalOpen(false);
                  fetchTickets();
                } catch (error) {
                  emitErrorToast('Failed to create request');
                }
              }}>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-surface-500 uppercase tracking-[0.08em]">Project</label>
                    <select 
                      name="projectId" 
                      required 
                      className="w-full bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm py-2.5 px-4 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none appearance-none"
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => (
                        <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-surface-500 uppercase tracking-[0.08em]">Title</label>
                    <input 
                      name="title" 
                      required 
                      type="text" 
                      placeholder="e.g., UI updates for dashboard" 
                      className="w-full bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm py-2.5 px-4 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none placeholder:text-surface-400" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-surface-500 uppercase tracking-[0.08em]">Type</label>
                      <select 
                        name="type" 
                        className="w-full bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm py-2.5 px-4 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none appearance-none"
                      >
                        {TICKET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-surface-500 uppercase tracking-[0.08em]">Priority</label>
                      <select 
                        name="priority" 
                        className="w-full bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm py-2.5 px-4 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none appearance-none"
                      >
                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-surface-500 uppercase tracking-[0.08em]">Description</label>
                    <textarea 
                      name="description" 
                      rows={5} 
                      placeholder="Provide clear details and steps to reproduce if applicable..." 
                      className="w-full bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm py-3 px-4 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none resize-none placeholder:text-surface-400 leading-relaxed" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)} 
                    className="flex-1 py-3 text-sm font-bold text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-brand-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 hover:shadow-brand-500/30 transition-all active:scale-95"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Task Modal for Approval */}
      {isTaskModalOpen && (() => {
        const targetProject = projects.find(p => 
          getEntityId(p) === getEntityId(currentTicket?.projectId) ||
          getEntityId(p.id || p._id) === getEntityId(currentTicket?.projectId)
        );
        const targetMembers = users.filter((u: any) => targetProject?.members.includes(u.id) && !['super_admin', 'admin'].includes(u.role));
        
        return targetProject ? (
          <ProjectTaskCreateModal
            open={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            onSubmit={handleTaskSubmit}
            project={targetProject}
            members={targetMembers}
            phases={phases}
            defaultStatus="todo"
            title="New Task"
            initialValues={{ title: preFilledTaskName }}
          />
        ) : null;
      })()}
    </div>
  );
};

export default RequestPortal;
