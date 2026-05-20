import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  BarChart3, 
  Target, 
  Users, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight,
  Search,
  FolderKanban,
  LayoutDashboard,
  Trophy,
  ArrowLeft,
  Calendar,
  Activity,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { performanceService } from '../../services/api';
import { useAppStore } from '../../context/appStore';
import { UserAvatar } from '../../components/UserAvatar';
import { ProgressBar, EmptyState } from '../../components/ui';
import { cn } from '../../utils/helpers';

type FlowStep = 'SELECT_PROJECT' | 'SELECT_TEAM' | 'DASHBOARD';

interface DiscoveryData {
  projects: any[];
  teams: any[];
}

export const TeamPerformance: React.FC = () => {
  const { users } = useAppStore();
  const [step, setStep] = useState<FlowStep>('SELECT_PROJECT');
  const [discovery, setDiscovery] = useState<DiscoveryData | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        const res = await performanceService.getDiscovery();
        setDiscovery(res.data.data);
      } catch (err) {
        console.error('Failed to fetch discovery data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDiscovery();
  }, []);

  useEffect(() => {
    if (step === 'DASHBOARD' && selectedTeamId) {
      const fetchPerformance = async () => {
        setLoading(true);
        try {
          const res = await performanceService.getTeam(selectedTeamId, days);
          setPerformance(res.data.data);
        } catch (err) {
          console.error('Failed to fetch performance:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchPerformance();
    }
  }, [step, selectedTeamId, days]);

  const filteredProjects = useMemo(() => {
    if (!discovery) return [];
    return discovery.projects.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [discovery, search]);

  const filteredTeams = useMemo(() => {
    if (!discovery || !selectedProjectId) return [];
    return discovery.teams.filter(t => 
      (t.linkedProjectId === selectedProjectId || t.projectIds.includes(selectedProjectId)) &&
      t.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [discovery, selectedProjectId, search]);

  const sortedMembers = useMemo(() => {
    if (!performance) return [];
    return performance.memberBreakdown.map((m: any) => ({
      user: users.find(u => u.id === m.userId),
      metrics: m.metrics
    })).sort((a: any, b: any) => (b.metrics?.productivityScore || 0) - (a.metrics?.productivityScore || 0));
  }, [performance, users]);
  if (loading && !discovery) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-[0.2em]">Initialising Enterprise Insights...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 -mt-2">
      <AnimatePresence mode="wait">
        {step === 'SELECT_PROJECT' && (
          <motion.div
            key="select-project"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Select Project</h1>
              <p className="text-sm text-surface-500">Choose a project to analyze team performance and delivery metrics.</p>
            </div>

            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
              <input 
                type="text"
                placeholder="Search projects by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setSearch('');
                    setStep('SELECT_TEAM');
                  }}
                  className="group relative bg-white dark:bg-surface-900 rounded-3xl p-6 border border-surface-100 dark:border-surface-800 shadow-sm hover:shadow-xl hover:border-primary-500/50 transition-all text-left"
                >
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-4 shadow-lg"
                    style={{ backgroundColor: project.color }}
                  >
                    {project.name[0]}
                  </div>
                  <h3 className="font-bold text-surface-900 dark:text-white mb-1">{project.name}</h3>
                  <p className="text-xs text-surface-400 font-medium">{project.memberCount} Team Members</p>
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={20} className="text-primary-500" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'SELECT_TEAM' && (
          <motion.div
            key="select-team"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setStep('SELECT_PROJECT')}
                className="flex items-center gap-2 text-xs font-bold text-surface-400 hover:text-primary-500 transition-colors uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Back to Projects
              </button>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={14} />
                   <input 
                     type="text"
                     placeholder="Search teams..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="w-full bg-surface-50 dark:bg-surface-800 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                   />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Choose a Team</h2>
              <p className="text-sm text-surface-500">Showing teams linked to {discovery?.projects.find(p => p.id === selectedProjectId)?.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map(team => (
                <div
                  key={team.id}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setStep('DASHBOARD');
                  }}
                  className="group cursor-pointer bg-white dark:bg-surface-900 rounded-[2rem] p-6 border border-surface-100 dark:border-surface-800 shadow-sm hover:shadow-xl hover:border-primary-500/30 transition-all overflow-hidden relative"
                >
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: team.color }} />
                  <div className="flex items-start justify-between mb-6">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name[0]}
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-surface-300 uppercase tracking-widest">Efficiency</p>
                       <p className="text-lg font-bold text-emerald-500">92%</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">{team.name}</h3>
                  
                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <Users size={14} className="text-surface-400" />
                        <span className="text-xs font-bold text-surface-600 dark:text-surface-400">{team.memberCount} Specialists</span>
                     </div>
                     <div className="pt-4 border-t border-surface-50 dark:border-surface-800">
                        <div className="flex justify-between mb-2">
                           <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Workload</span>
                           <span className="text-[10px] font-bold text-surface-900 dark:text-white">Normal</span>
                        </div>
                        <ProgressBar value={65} color={team.color} size="sm" />
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'DASHBOARD' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep('SELECT_TEAM')}
                  className="p-2 rounded-xl bg-surface-50 dark:bg-surface-800 text-surface-500 hover:text-primary-500 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-surface-900 dark:text-white">
                    {performance?.teamName} Overview
                  </h1>
                  <p className="text-xs text-surface-400 font-medium">Enterprise performance & delivery health</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select 
                   value={days}
                   onChange={(e) => setDays(Number(e.target.value))}
                   className="bg-surface-50 dark:bg-surface-800 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
                <div className="h-8 w-[1px] bg-surface-100 dark:bg-surface-800 mx-2" />
                <button className="btn-primary btn-sm px-4">Export Analysis</button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-3">
                <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Aggregating Team Data...</p>
              </div>
            ) : performance && (
              <div className="space-y-6 pb-10">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                   <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-100 dark:border-surface-800">
                      <div className="flex items-center justify-between mb-2">
                         <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Total Tasks</p>
                         <FolderKanban size={14} className="text-primary-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-surface-900 dark:text-white">{performance.metrics.totalTasks || 0}</h3>
                      <p className="text-[9px] text-surface-400 font-bold mt-1 tracking-tight">Assigned in period</p>
                   </div>
                   <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-100 dark:border-surface-800">
                      <div className="flex items-center justify-between mb-2">
                         <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Completed</p>
                         <CheckCircle2 size={14} className="text-emerald-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-surface-900 dark:text-white">{performance.metrics.completedTasks || 0}</h3>
                      <p className="text-[9px] text-emerald-500 font-bold mt-1 tracking-tight">Successfully done</p>
                   </div>
                   <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-100 dark:border-surface-800">
                      <div className="flex items-center justify-between mb-2">
                         <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Pending</p>
                         <Activity size={14} className="text-amber-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-surface-900 dark:text-white">{(performance.metrics.activeTasks || 0) + (performance.metrics.delayedTasks || 0)}</h3>
                      <p className="text-[9px] text-amber-500 font-bold mt-1 tracking-tight">{performance.metrics.delayedTasks || 0} delayed</p>
                   </div>
                   <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-100 dark:border-surface-800">
                      <div className="flex items-center justify-between mb-2">
                         <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Success Rate</p>
                         <Zap size={14} className="text-purple-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-surface-900 dark:text-white">
                        {performance.metrics.totalTasks > 0 ? Math.round((performance.metrics.completedTasks / performance.metrics.totalTasks) * 100) : 0}%
                      </h3>
                      <p className="text-[9px] text-surface-400 font-bold mt-1 tracking-tight">Completion percentage</p>
                   </div>
                </div>

                {/* Simplified Members List */}
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                     <Trophy size={16} className="text-amber-500" /> Team Members Performance
                  </h2>
                  <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden">
                     <table className="w-full text-left">
                       <thead className="bg-surface-50 dark:bg-surface-800/50 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                         <tr>
                           <th className="px-6 py-4">Member</th>
                           <th className="px-6 py-4 text-center">Completed</th>
                           <th className="px-6 py-4 text-center">Active</th>
                           <th className="px-6 py-4 text-center">Delayed</th>
                           <th className="px-6 py-4">Progress</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                         {sortedMembers.map((m: any) => {
                           const memberTotal = (m.metrics?.tasksCompleted || 0) + (m.metrics?.tasksActive || 0) + (m.metrics?.tasksDelayed || 0);
                           const memberProgress = memberTotal > 0 ? Math.round((m.metrics?.tasksCompleted || 0) / memberTotal * 100) : 0;
                           return (
                             <tr key={m.user?.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/20 transition-all">
                               <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                   <UserAvatar name={m.user?.name || ''} color={m.user?.color} size="xs" />
                                   <div className="min-w-0">
                                      <p className="text-xs font-bold text-surface-900 dark:text-white truncate">{m.user?.name}</p>
                                      <p className="text-[10px] text-surface-400 font-medium truncate">{m.user?.jobTitle || 'Team Member'}</p>
                                   </div>
                                 </div>
                               </td>
                               <td className="px-6 py-4 text-center text-xs font-bold text-emerald-500">
                                 {m.metrics?.tasksCompleted || 0}
                               </td>
                               <td className="px-6 py-4 text-center text-xs font-bold text-amber-500">
                                 {m.metrics?.tasksActive || 0}
                               </td>
                               <td className="px-6 py-4 text-center text-xs font-bold text-rose-500">
                                 {m.metrics?.tasksDelayed || 0}
                               </td>
                               <td className="px-6 py-4 min-w-[140px]">
                                 <div className="flex items-center gap-3">
                                    <ProgressBar value={memberProgress} size="sm" color="bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-surface-400 w-8">{memberProgress}%</span>
                                 </div>
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
