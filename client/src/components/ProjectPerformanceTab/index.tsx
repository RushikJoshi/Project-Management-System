import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  BarChart3, 
  Target, 
  Users, 
  AlertCircle, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  Trophy
} from 'lucide-react';
import { performanceService } from '../../services/api';
import { UserAvatar } from '../UserAvatar';
import { ProgressBar } from '../ui';
import { cn } from '../../utils/helpers';

interface ProjectPerformanceTabProps {
  projectId: string;
  memberIds: string[];
}

export const ProjectPerformanceTab: React.FC<ProjectPerformanceTabProps> = ({ projectId, memberIds }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // Fetch performance for each member assigned to this project
        const results = await Promise.all(
          memberIds.map(id => performanceService.getUser(id, days).catch(() => null))
        );
        setMetrics(results.filter(r => r !== null).map(r => r.data.data));
      } catch (err) {
        console.error('Failed to fetch project performance:', err);
      } finally {
        setLoading(true); // Wait, should be false
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [projectId, memberIds, days]);

  const avgProductivity = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + m.summary.productivityScore, 0) / metrics.length)
    : 0;

  const avgEfficiency = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.summary.efficiency, 0) / metrics.length)
    : 0;

  const totalTasks = metrics.reduce((sum, m) => sum + m.summary.tasksCompleted, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest animate-pulse">Analyzing Delivery Performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-900 rounded-3xl p-5 border border-surface-100 dark:border-surface-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center text-primary-500">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none">Project Health</p>
              <h4 className="text-xl font-black text-surface-900 dark:text-white tabular-nums">{avgProductivity}</h4>
            </div>
          </div>
          <ProgressBar value={avgProductivity} color="#3366ff" size="sm" />
          <p className="text-[9px] text-surface-400 font-bold mt-2 uppercase tracking-tighter">Avg. Productivity Score</p>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-3xl p-5 border border-surface-100 dark:border-surface-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none">Efficiency</p>
              <h4 className="text-xl font-black text-surface-900 dark:text-white tabular-nums">{avgEfficiency}%</h4>
            </div>
          </div>
          <ProgressBar value={avgEfficiency} color="#10b981" size="sm" />
          <p className="text-[9px] text-surface-400 font-bold mt-2 uppercase tracking-tighter">Actual vs Estimated Time</p>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-3xl p-5 border border-surface-100 dark:border-surface-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500">
              <Target size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none">Output</p>
              <h4 className="text-xl font-black text-surface-900 dark:text-white tabular-nums">{totalTasks}</h4>
            </div>
          </div>
          <p className="text-[9px] text-surface-400 font-bold mt-2 uppercase tracking-tighter">Total Tasks Completed (30D)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-black text-surface-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" /> Member Performance
          </h3>
          <div className="space-y-2">
            {metrics.sort((a,b) => b.summary.productivityScore - a.summary.productivityScore).map((m, idx) => (
              <div key={idx} className="bg-white dark:bg-surface-900/50 rounded-2xl border border-surface-100 dark:border-surface-800 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                     {/* We don't have the user object here, but we can assume metrics has userId if we update the service */}
                     {/* For now, just a placeholder or pass user down */}
                     <div className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-[10px] font-bold text-surface-500">
                        {idx + 1}
                     </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-surface-800 dark:text-surface-200 truncate">Resource ID: {idx + 1}</p>
                    <p className="text-[9px] text-surface-400 font-bold uppercase tracking-widest">Active Contribution</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-black text-surface-900 dark:text-white">{m.summary.productivityScore}</p>
                    <p className="text-[8px] font-bold text-surface-400 uppercase tracking-tighter">Score</p>
                  </div>
                  <div className="w-20">
                     <ProgressBar value={m.summary.productivityScore} size="sm" color="#3366ff" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary-500 rounded-[2.5rem] p-6 text-white shadow-xl shadow-primary-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <h4 className="text-sm font-black uppercase tracking-tight">Delivery Insight</h4>
          </div>
          <p className="text-sm font-medium leading-relaxed opacity-90 mb-6">
            {avgEfficiency < 80 
              ? "Project delivery efficiency is currently below targets. This often indicates underestimated task complexity or resource overallocation."
              : "Project delivery is trending positively. Team velocity is stable and time estimations are highly accurate."}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-2xl font-black leading-none">{metrics.reduce((sum, m) => sum + m.summary.tasksDelayed, 0)}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-70">Delayed Items</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-2xl font-black leading-none">{metrics.reduce((sum, m) => sum + m.summary.tasksActive, 0)}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-70">Ongoing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
