import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  BarChart3,
  Search,
  Filter,
  X,
  Briefcase
} from 'lucide-react';
import { cn, formatDate } from '../utils/helpers';
import { teamsService } from '../services/api';
import { UserAvatar } from './UserAvatar';
import { ProgressBar } from './ui';
import { useAppStore } from '../context/appStore';

interface MemberWorkload {
  member: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  assignedTasksCount: number;
  totalEstimatedHours: number;
  loggedHours: number;
  weeklyCapacityHours: number;
  capacityPercentage: number;
  status: 'overloaded' | 'at_capacity' | 'available';
}

interface WorkloadMatrixProps {
  teamId: string;
  teamName: string;
}

export const WorkloadMatrix: React.FC<WorkloadMatrixProps> = ({ teamId, teamName }) => {
  const { tasks, projects } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [workload, setWorkload] = useState<MemberWorkload[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkload = async () => {
      setLoading(true);
      try {
        const res = await teamsService.getWorkload(teamId);
        setWorkload(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch workload:', err);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) fetchWorkload();
  }, [teamId]);

  const filteredWorkload = workload.filter(w => 
    w.member.name.toLowerCase().includes(search.toLowerCase()) ||
    w.member.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMemberWorkload = workload.find(w => (w.member.id || w.member._id) === selectedMemberId);

  const memberTasks = useMemo(() => {
    if (!selectedMemberId) return [];
    return tasks.filter(t => 
      t.assigneeIds.includes(selectedMemberId) && 
      t.status !== 'done'
    );
  }, [tasks, selectedMemberId]);

  const STATUS_META: Record<string, { label: string; color: string }> = {
    todo: { label: 'To Do', color: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300' },
    in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30' },
    in_review: { label: 'In Review', color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30' },
    changes_requested: { label: 'Changes Requested', color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30' },
    done: { label: 'Done', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30' },
    backlog: { label: 'Backlog', color: 'bg-surface-50 text-surface-500 dark:bg-surface-800/40 dark:text-surface-400' },
  };

  const PRIORITY_META = {
    urgent: { bg: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30', label: 'Urgent' },
    high: { bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30', label: 'High' },
    medium: { bg: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30', label: 'Medium' },
    low: { bg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30', label: 'Low' },
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'overloaded':
        return { 
          icon: <AlertTriangle size={14} className="text-rose-500" />, 
          bg: 'bg-rose-50 dark:bg-rose-950/20', 
          text: 'text-rose-600 dark:text-rose-400',
          label: 'Overloaded' 
        };
      case 'at_capacity':
        return { 
          icon: <AlertTriangle size={14} className="text-amber-500" />, 
          bg: 'bg-amber-50 dark:bg-amber-950/20', 
          text: 'text-amber-600 dark:text-amber-400',
          label: 'At Capacity' 
        };
      default:
        return { 
          icon: <CheckCircle2 size={14} className="text-emerald-500" />, 
          bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
          text: 'text-emerald-600 dark:text-emerald-400',
          label: 'Available' 
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm font-bold text-surface-400 animate-pulse uppercase tracking-widest">Analyzing Team Capacity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-50/50 dark:bg-surface-900/30 p-4 rounded-[2rem] border border-surface-100 dark:border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-surface-800 flex items-center justify-center shadow-sm">
            <BarChart3 size={20} className="text-primary-500" />
          </div>
          <div>
            <h3 className="font-display font-bold text-surface-900 dark:text-white leading-tight">Capacity Insights</h3>
            <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">{teamName} Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter members..." 
              className="bg-white dark:bg-surface-800 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none ring-1 ring-surface-100 dark:ring-surface-700 focus:ring-primary-500 transition-all w-full sm:w-48"
            />
          </div>
          <button className="p-2 rounded-xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 hover:bg-surface-50 transition-colors">
            <Filter size={14} className="text-surface-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkload.map((w, idx) => {
          const config = getStatusConfig(w.status);
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={w.member.id || w.member._id || idx}
              className="group bg-white dark:bg-surface-900/50 rounded-[2rem] border border-surface-100 dark:border-surface-800 p-5 hover:shadow-xl hover:border-primary-500/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={w.member.name} avatar={w.member.avatar} size="md" className="ring-4 ring-surface-50 dark:ring-surface-800" />
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-surface-900 dark:text-white truncate">{w.member.name}</h4>
                    <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">{w.member.role}</p>
                  </div>
                </div>
                <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full", config.bg)}>
                  {config.icon}
                  <span className={cn("text-[10px] font-black uppercase tracking-tighter", config.text)}>{config.label}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-surface-50/50 dark:bg-surface-800/40 rounded-2xl p-2.5 text-center">
                    <p className="text-lg font-black text-surface-900 dark:text-white leading-none">{w.assignedTasksCount}</p>
                    <p className="text-[8px] font-black uppercase text-surface-400 mt-1">Open Tasks</p>
                  </div>
                  <div className="bg-surface-50/50 dark:bg-surface-800/40 rounded-2xl p-2.5 text-center border-x border-surface-100 dark:border-surface-700/50">
                    <p className="text-lg font-black text-surface-900 dark:text-white leading-none">{w.totalEstimatedHours}h</p>
                    <p className="text-[8px] font-black uppercase text-surface-400 mt-1">Est. Load</p>
                  </div>
                  <div className="bg-surface-50/50 dark:bg-surface-800/40 rounded-2xl p-2.5 text-center">
                    <p className="text-lg font-black text-primary-500 leading-none">{w.loggedHours.toFixed(1)}h</p>
                    <p className="text-[8px] font-black uppercase text-primary-400 mt-1">Logged</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Weekly Capacity Utilization</span>
                    <span className={cn("text-xs font-black", config.text)}>{w.capacityPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, w.capacityPercentage)}%` }}
                      className={cn("h-full rounded-full shadow-sm", 
                        w.capacityPercentage > 100 ? "bg-rose-500" : 
                        w.capacityPercentage > 80 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-surface-400 font-bold">
                    <span>0h</span>
                    <span>{w.weeklyCapacityHours}h (Base)</span>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setSelectedMemberId(w.member.id || w.member._id || null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 text-[10px] font-black text-surface-400 uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group-hover:bg-primary-500 group-hover:text-white cursor-pointer"
              >
                View Workload Details <ChevronRight size={12} />
              </button>
            </motion.div>
          );
        })}
      </div>

      {filteredWorkload.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-surface-50 dark:bg-surface-900 flex items-center justify-center text-surface-200">
            <Users size={32} />
          </div>
          <div>
            <h4 className="font-display font-bold text-surface-900 dark:text-white">No Members Found</h4>
            <p className="text-xs text-surface-400 max-w-[240px] mx-auto mt-1">We couldn't find any team members matching your search criteria.</p>
          </div>
        </div>
      )}

      {/* Member Workload Detail Modal */}
      <AnimatePresence>
        {selectedMemberId && selectedMemberWorkload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/60 backdrop-blur-[4px] p-4"
            onClick={() => setSelectedMemberId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="w-full max-w-2xl bg-white dark:bg-surface-900 rounded-[2rem] border border-surface-100 dark:border-surface-800 shadow-modal overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-center gap-3">
                  <UserAvatar 
                    name={selectedMemberWorkload.member.name} 
                    avatar={selectedMemberWorkload.member.avatar} 
                    size="md" 
                    className="ring-4 ring-surface-50 dark:ring-surface-800" 
                  />
                  <div>
                    <h3 className="font-display font-bold text-lg text-surface-900 dark:text-white leading-tight">
                      {selectedMemberWorkload.member.name}
                    </h3>
                    <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider mt-0.5">
                      {selectedMemberWorkload.member.role} &bull; Workload Analysis
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMemberId(null)}
                  className="p-1.5 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-surface-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Micro Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-surface-50/50 dark:bg-surface-800/40 rounded-2xl p-3.5 text-center">
                    <p className="text-xl font-black text-surface-900 dark:text-white leading-none">
                      {selectedMemberWorkload.assignedTasksCount}
                    </p>
                    <p className="text-[9px] font-black uppercase text-surface-400 mt-1">Open Tasks</p>
                  </div>
                  <div className="bg-surface-50/50 dark:bg-surface-800/40 rounded-2xl p-3.5 text-center">
                    <p className="text-xl font-black text-surface-900 dark:text-white leading-none">
                      {selectedMemberWorkload.totalEstimatedHours}h
                    </p>
                    <p className="text-[9px] font-black uppercase text-surface-400 mt-1">Estimated Load</p>
                  </div>
                  <div className="bg-surface-50/50 dark:bg-surface-800/40 rounded-2xl p-3.5 text-center">
                    <p className="text-xl font-black text-primary-500 leading-none">
                      {selectedMemberWorkload.loggedHours.toFixed(1)}h
                    </p>
                    <p className="text-[9px] font-black uppercase text-primary-400 mt-1">Hours Logged</p>
                  </div>
                  <div className="bg-surface-50/50 dark:bg-surface-800/40 rounded-2xl p-3.5 text-center">
                    <p className="text-xl font-black text-surface-900 dark:text-white leading-none">
                      {selectedMemberWorkload.weeklyCapacityHours}h
                    </p>
                    <p className="text-[9px] font-black uppercase text-surface-400 mt-1">Base Capacity</p>
                  </div>
                </div>

                {/* Capacity utilization indicator */}
                <div className="bg-surface-50/50 dark:bg-surface-800/20 rounded-2xl p-4 border border-surface-100/50 dark:border-surface-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                      Weekly Capacity Utilization Score
                    </span>
                    <span className={cn(
                      "text-xs font-black",
                      selectedMemberWorkload.capacityPercentage > 100 ? "text-rose-500" :
                      selectedMemberWorkload.capacityPercentage > 80 ? "text-amber-500" : "text-emerald-500"
                    )}>
                      {selectedMemberWorkload.capacityPercentage}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full shadow-sm transition-all duration-500", 
                        selectedMemberWorkload.capacityPercentage > 100 ? "bg-rose-500" : 
                        selectedMemberWorkload.capacityPercentage > 80 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, selectedMemberWorkload.capacityPercentage)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-surface-400 font-medium leading-normal mt-1">
                    {selectedMemberWorkload.capacityPercentage > 100 
                      ? "⚠️ Specialist is currently overloaded. Consider redistributing some open tasks to other team members." 
                      : selectedMemberWorkload.capacityPercentage > 80
                        ? "🔔 Specialist is near base weekly capacity. Avoid assigning high-load tasks."
                        : "✓ Specialist is available with healthy weekly capacity to pick up new assignments."
                    }
                  </p>
                </div>

                {/* Active Tasks Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black text-surface-400 uppercase tracking-widest pl-1 border-b border-surface-50 dark:border-surface-800 pb-2 flex items-center gap-1.5">
                    <Briefcase size={13} className="text-surface-400" /> Active Tasks Breakdown
                  </h4>
                  <div className="space-y-2.5">
                    {memberTasks.map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      const statusMeta = STATUS_META[task.status] || { label: task.status, color: 'bg-surface-100 text-surface-700' };
                      const priorityMeta = PRIORITY_META[task.priority] || { bg: 'bg-surface-50 text-surface-500', label: task.priority };

                      return (
                        <div 
                          key={task.id} 
                          className="p-3.5 rounded-2xl border border-surface-100 dark:border-surface-800 bg-surface-50/20 dark:bg-surface-900/30 hover:bg-surface-50/50 dark:hover:bg-surface-900/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-surface-900 dark:text-white leading-snug truncate">
                              {task.title}
                            </h5>
                            <div className="flex items-center gap-2 flex-wrap">
                              {project && (
                                <div className="flex items-center gap-1.5 text-[9px] text-surface-400 font-bold uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                                  <span className="truncate max-w-[120px]">{project.name}</span>
                                </div>
                              )}
                              {task.estimatedHours !== undefined && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-surface-200" />
                                  <span className="text-[9px] text-surface-400 font-bold">Est. load: {task.estimatedHours}h</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                            <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border", priorityMeta.bg)}>
                              {priorityMeta.label}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider", statusMeta.color)}>
                              {statusMeta.label}
                            </span>
                            {task.dueDate && (
                              <span className="text-[9px] text-surface-400 font-bold pl-2 border-l border-surface-100 dark:border-surface-800">
                                Due {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {memberTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-full text-emerald-500 mb-2">
                          <CheckCircle2 size={18} />
                        </div>
                        <h5 className="text-xs font-bold text-surface-900 dark:text-white">All Caught Up!</h5>
                        <p className="text-[10px] text-surface-400 mt-0.5">No active open tasks assigned to this specialist.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-surface-50 dark:border-surface-800 flex items-center justify-end bg-surface-50/10 dark:bg-surface-800/10">
                <button
                  onClick={() => setSelectedMemberId(null)}
                  className="px-5 py-2.5 bg-surface-900 hover:bg-surface-950 dark:bg-surface-800 dark:hover:bg-surface-750 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  Close Analysis
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
