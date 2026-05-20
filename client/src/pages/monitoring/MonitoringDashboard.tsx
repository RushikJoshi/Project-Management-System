import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Calendar, MessageSquare, Clipboard, TrendingUp,
  Filter, Download, Search, ChevronDown, Check, X,
  AlertTriangle, CheckCircle, Info, Eye, ExternalLink,
  User, Briefcase, ListTodo, BarChart3
} from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../utils/helpers';
import { useAuthStore } from '../../context/authStore';

interface MonitoringDashboardProps {
  tab: 'pending' | 'extensions' | 'completion' | 'logs' | 'productivity';
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ tab }) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    projectId: '',
    employeeId: '',
    search: ''
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Fetch employees and projects for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [empRes, projRes] = await Promise.all([
          api.get('/users'), // Assuming this gets all users or hierarchy
          api.get('/projects')
        ]);
        setEmployees(empRes.data || []);
        setProjects(projRes.data || []);
      } catch (error) {
        console.error('Failed to fetch filter data', error);
      }
    };
    fetchFilterData();
  }, []);

  // Fetch data based on tab and filters
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let endpoint = `/monitoring/${tab}`;
        const params = { ...filters };
        
        // Remove empty filters
        Object.keys(params).forEach(key => {
          if (!params[key as keyof typeof params]) {
            delete params[key as keyof typeof params];
          }
        });

        const response = await api.get(endpoint, { params });
        setData(response.data.data || []);
        setStats(response.data.stats || {});
      } catch (error) {
        console.error(`Failed to fetch ${tab} data`, error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tab, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'pending', label: 'Pending Tasks', icon: Clock, path: '/monitoring/pending' },
    { id: 'extensions', label: 'Extensions', icon: Calendar, path: '/monitoring/extensions' },
    { id: 'completion', label: 'Completions', icon: MessageSquare, path: '/monitoring/completion-remarks' },
    { id: 'logs', label: 'Daily Logs', icon: Clipboard, path: '/monitoring/daily-logs' },
    { id: 'productivity', label: 'Productivity', icon: TrendingUp, path: '/monitoring/productivity' },
  ];

  return (
    <div className="p-6 space-y-6 bg-surface-50 dark:bg-surface-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Eye className="text-brand-500" size={24} />
            Employee Monitoring
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Track accountability, productivity, and task lifecycles.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary flex items-center gap-2">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Pending" 
          value={stats.totalPending || 0} 
          icon={Clock} 
          color="amber"
          trend="+5% from yesterday"
        />
        <StatCard 
          title="Active Extensions" 
          value={stats.activeExtensions || 0} 
          icon={Calendar} 
          color="purple"
          trend="2 pending approval"
        />
        <StatCard 
          title="Completed Today" 
          value={stats.completedToday || 0} 
          icon={CheckCircle} 
          color="green"
          trend="Good pace"
        />
        <StatCard 
          title="Avg Productivity" 
          value={`${stats.avgProductivity || 0}%`} 
          icon={TrendingUp} 
          color="blue"
          trend="On track"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-surface-800 p-4 rounded-xl shadow-sm border border-surface-100 dark:border-surface-700 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
            <input
              type="text"
              placeholder="Search employee or task..."
              className="form-input pl-10"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1 block">Start Date</label>
          <input
            type="date"
            className="form-input"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1 block">End Date</label>
          <input
            type="date"
            className="form-input"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1 block">Employee</label>
          <select
            className="form-input"
            value={filters.employeeId}
            onChange={(e) => handleFilterChange('employeeId', e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1 block">Project</label>
          <select
            className="form-input"
            value={filters.projectId}
            onChange={(e) => handleFilterChange('projectId', e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map(proj => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </select>
        </div>

        <button 
          className="btn btn-secondary flex items-center gap-2 h-[42px]"
          onClick={() => setFilters({ startDate: '', endDate: '', projectId: '', employeeId: '', search: '' })}
        >
          Reset
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => navigate(t.path)}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-[2px] flex items-center gap-2 whitespace-nowrap",
              tab === t.id
                ? "border-brand-500 text-brand-600 dark:text-brand-400 font-bold"
                : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-surface-500 dark:text-surface-400">
            <Info size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No data found</p>
            <p className="text-sm">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'pending' && <PendingTasksTable data={data} />}
            {tab === 'extensions' && <ExtensionsTable data={data} />}
            {tab === 'completion' && <CompletionTable data={data} />}
            {tab === 'logs' && <DailyLogsTable data={data} />}
            {tab === 'productivity' && <ProductivityTable data={data} />}
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-components

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => {
  const colors = {
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  };

  return (
    <div className="bg-white dark:bg-surface-800 p-6 rounded-xl shadow-sm border border-surface-100 dark:border-surface-700 flex justify-between items-start">
      <div>
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-surface-900 dark:text-white mt-1">{value}</p>
        <p className="text-xs text-surface-400 mt-2 flex items-center gap-1">
          <Info size={12} />
          {trend}
        </p>
      </div>
      <div className={cn("p-3 rounded-xl", colors[color as keyof typeof colors])}>
        <Icon size={24} />
      </div>
    </div>
  );
};

const PendingTasksTable = ({ data }: { data: any[] }) => (
  <table className="w-full text-left">
    <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-700">
      <tr>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Employee</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Task</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Reason</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Date/Time</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
      {data.map(row => (
        <tr key={row._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
          <td className="px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
              {row.employee?.name?.[0] || 'E'}
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">{row.employee?.name}</p>
              <p className="text-xs text-surface-500">{row.employee?.role}</p>
            </div>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm font-medium text-surface-900 dark:text-white">{row.task?.title}</p>
            <p className="text-xs text-surface-500">{row.project?.name}</p>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-700 dark:text-surface-300">{row.pendingReason}</p>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{new Date(row.createdAt).toLocaleDateString()}</p>
            <p className="text-xs text-surface-500">{new Date(row.createdAt).toLocaleTimeString()}</p>
          </td>
          <td className="px-6 py-4">
            <button className="btn btn-secondary btn-sm flex items-center gap-1">
              <Eye size={14} />
              View
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ExtensionsTable = ({ data }: { data: any[] }) => {
  const handleApprove = async (id: string) => {
    try {
      await api.post(`/monitoring/extensions/${id}/approve`, { approved: true });
      // Refresh or show toast
    } catch (error) {
      console.error('Failed to approve extension', error);
    }
  };

  return (
    <table className="w-full text-left">
      <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-700">
        <tr>
          <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Employee</th>
          <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Task</th>
          <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Requested New Date</th>
          <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Reason</th>
          <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
        {data.map(row => (
          <tr key={row._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
            <td className="px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                {row.employee?.name?.[0] || 'E'}
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">{row.employee?.name}</p>
              </div>
            </td>
            <td className="px-6 py-4">
              <p className="text-sm font-medium text-surface-900 dark:text-white">{row.task?.title}</p>
            </td>
            <td className="px-6 py-4">
              <p className="text-sm text-surface-900 dark:text-white">{new Date(row.requestedNewDate).toLocaleDateString()}</p>
            </td>
            <td className="px-6 py-4">
              <p className="text-sm text-surface-700 dark:text-surface-300">{row.pendingReason}</p>
            </td>
            <td className="px-6 py-4">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium",
                row.managerApproved === true ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                row.managerApproved === false ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {row.managerApproved === true ? 'Approved' : row.managerApproved === false ? 'Rejected' : 'Pending'}
              </span>
            </td>
            <td className="px-6 py-4 flex items-center gap-2">
              {row.managerApproved === null && (
                <>
                  <button onClick={() => handleApprove(row._id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400">
                    <Check size={16} />
                  </button>
                  <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                    <X size={16} />
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const CompletionTable = ({ data }: { data: any[] }) => (
  <table className="w-full text-left">
    <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-700">
      <tr>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Employee</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Task</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Remarks</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Testing Status</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Date</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
      {data.map(row => (
        <tr key={row._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
          <td className="px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
              {row.assignee?.name?.[0] || 'E'}
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">{row.assignee?.name}</p>
            </div>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm font-medium text-surface-900 dark:text-white">{row.title}</p>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-700 dark:text-surface-300">{row.completionReview?.remarks}</p>
          </td>
          <td className="px-6 py-4">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium",
              row.completionReview?.testedOk ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            )}>
              {row.completionReview?.testedOk ? 'Tested OK' : 'Self Tested'}
            </span>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{new Date(row.updatedAt).toLocaleDateString()}</p>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const DailyLogsTable = ({ data }: { data: any[] }) => (
  <table className="w-full text-left">
    <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-700">
      <tr>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Employee</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Log Date</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Total Duration</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Tasks Done</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
      {data.map(row => (
        <tr key={row._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
          <td className="px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
              {row.employee?.name?.[0] || 'E'}
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">{row.employee?.name}</p>
            </div>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{new Date(row.logDate).toLocaleDateString()}</p>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{Math.round(row.totalDuration / 60)} hrs</p>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{row.tasksCompleted?.length || 0}</p>
          </td>
          <td className="px-6 py-4">
            <button className="btn btn-secondary btn-sm">View Timeline</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ProductivityTable = ({ data }: { data: any[] }) => (
  <table className="w-full text-left">
    <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-700">
      <tr>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Employee</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Efficiency</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Punctuality</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Completed Tasks</th>
        <th className="px-6 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider">Missed Deadlines</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
      {data.map(row => (
        <tr key={row.employee?._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
          <td className="px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
              {row.employee?.name?.[0] || 'E'}
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">{row.employee?.name}</p>
            </div>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{row.efficiency}%</p>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{row.punctuality}%</p>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{row.completedTasksCount}</p>
          </td>
          <td className="px-6 py-4">
            <p className="text-sm text-surface-900 dark:text-white">{row.missedDeadlinesCount}</p>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default MonitoringDashboard;
