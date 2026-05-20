import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanban, Clock, CheckCircle2, AlertTriangle,
  Plus, MessageSquare, ExternalLink, Zap
} from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { useAppStore } from '../../context/appStore';
import { cn, formatDate } from '../../utils/helpers';
import { ProgressBar } from '../../components/ui';
import { ticketsService } from '../../services/api';

const ClientDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { projects, tasks } = useAppStore();
  const [ticketStats, setTicketStats] = useState({ total: 0, open: 0 });

  useEffect(() => {
    ticketsService.getAll().then(res => {
      const all = res.data.data || [];
      setTicketStats({
        total: all.length,
        open: all.filter((t: any) => t.status === 'OPEN').length
      });
    }).catch(() => { });
  }, []);

  // Filter projects assigned to this client
  const clientProjects = projects.filter(p => p.clientId === user?.clientId || p.visibleToClient);

  // Stats
  const activeProjects = clientProjects.filter(p => p.status === 'active');
  const completedProjects = clientProjects.filter(p => p.status === 'completed');

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">
            Welcome back, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Here's an overview of your projects and progress.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/requests'}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-semibold shadow-md hover:bg-brand-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>New Request</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={<FolderKanban size={20} />}
          label="Total Projects"
          value={clientProjects.length}
          color="#3366ff"
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Active Projects"
          value={activeProjects.length}
          color="#f59e0b"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Completed"
          value={completedProjects.length}
          color="#10b981"
        />
        <StatCard
          icon={<MessageSquare size={20} />}
          label="Open Requests"
          value={ticketStats.open}
          color="#8b5cf6"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <ActivityIcon className="text-brand-500" />
              Project Progress
            </h2>
            <button className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {clientProjects.length > 0 ? (
              clientProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="card p-5 hover:shadow-card-hover transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: project.color || '#3366ff' }}
                      >
                        {project.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-surface-900 dark:text-white group-hover:text-brand-600 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">
                          {project.clientCode || 'PROJ-001'}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      project.status === 'active' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {project.status}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-500">Overall Progress</span>
                      <span className="font-bold text-surface-900 dark:text-white">{project.progress || 0}%</span>
                    </div>
                    <ProgressBar value={project.progress || 0} color={project.color} />
                  </div>

                  <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {/* Avatars of team members would go here */}
                      <div className="w-6 h-6 rounded-full bg-surface-200 border-2 border-white dark:border-surface-900" />
                      <div className="w-6 h-6 rounded-full bg-surface-300 border-2 border-white dark:border-surface-900" />
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-bold text-brand-600 group-hover:gap-2 transition-all">
                      Details <ExternalLink size={12} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="card p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-surface-50 dark:bg-surface-800 flex items-center justify-center text-surface-300">
                  <FolderKanban size={32} />
                </div>
                <div>
                  <p className="font-bold text-surface-900 dark:text-white">No projects found</p>
                  <p className="text-sm text-surface-500 mt-1">When we start a project for you, it will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="space-y-6">
          <h2 className="text-lg font-display font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Clock size={20} className="text-indigo-500" />
            Recent Updates
          </h2>

          <div className="space-y-4">
            <div className="card p-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <p className="text-sm text-surface-900 dark:text-white font-medium">Milestone Completed</p>
                  <p className="text-xs text-surface-500 mt-0.5">The 'UI/UX Design' phase of Acme Website is complete.</p>
                  <p className="text-[10px] text-surface-400 mt-1">2 hours ago</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex-shrink-0 flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <p className="text-sm text-surface-900 dark:text-white font-medium">New Message</p>
                  <p className="text-xs text-surface-500 mt-0.5">Admin posted a comment on your recent request.</p>
                  <p className="text-[10px] text-surface-400 mt-1">Yesterday at 4:30 PM</p>
                </div>
              </div>
            </div>

            <div className="card p-4 bg-gradient-to-br from-brand-600 to-indigo-700 text-white space-y-3">
              <p className="font-bold">Need Help?</p>
              <p className="text-sm text-brand-100 leading-relaxed">
                Our support team is available 24/7 to assist with your project needs.
              </p>
              <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all backdrop-blur-sm">
                Contact Account Manager
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-5"
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}18` }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <p className="text-2xl font-display font-bold text-surface-900 dark:text-white">{value}</p>
    <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{label}</p>
  </motion.div>
);

const ActivityIcon = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

export default ClientDashboard;
