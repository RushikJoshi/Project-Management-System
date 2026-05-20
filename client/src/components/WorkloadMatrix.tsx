import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  BarChart3,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { teamsService } from '../services/api';
import { UserAvatar } from './UserAvatar';
import { ProgressBar } from './ui';

interface MemberWorkload {
  member: {
    id: string;
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
  const [loading, setLoading] = useState(true);
  const [workload, setWorkload] = useState<MemberWorkload[]>([]);
  const [search, setSearch] = useState('');

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
              key={w.member.id}
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

              <button className="w-full mt-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 text-[10px] font-black text-surface-400 uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group-hover:bg-primary-500 group-hover:text-white">
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
    </div>
  );
};
