import React, { useState, useEffect } from 'react';
import { 
  Shield, ShieldAlert, Monitor, Smartphone, Tablet, Globe, 
  Activity, CheckCircle2, AlertOctagon, Clock, Power, 
  User, Calendar, Filter, Search, Download, RefreshCw, X, ArrowRight, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginActivityService } from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import { cn } from '../../utils/helpers';
import { emitSuccessToast, emitErrorToast } from '../../context/toastBus';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const LOGIN_TYPES = ['Email Password', 'Google Login', 'Microsoft Login', 'SSO', 'OTP Login'];
const STATUSES = ['Success', 'Failed', 'Logged Out', 'Session Expired'];
const DEVICES = ['Desktop', 'Mobile', 'Tablet'];

export const LoginActivity: React.FC = () => {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active'>('all');

  // Query state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loginType, setLoginType] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [isSuspicious, setIsSuspicious] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const isAdminOrManager = ['super_admin', 'admin', 'manager'].includes(user?.role || '');

  useEffect(() => {
    fetchData();
  }, [page, status, loginType, deviceType, isSuspicious, startDate, endDate, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
        search: search.trim() || undefined,
        status: activeTab === 'active' ? 'Success' : (status || undefined),
        loginType: loginType || undefined,
        deviceType: deviceType || undefined,
        isSuspicious: isSuspicious === '' ? undefined : isSuspicious,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const [logsRes, analyticsRes] = await Promise.all([
        loginActivityService.getAll(params),
        loginActivityService.getAnalytics()
      ]);

      if (logsRes.data?.success) {
        setLogs(logsRes.data.data.logs || []);
        setTotalPages(logsRes.data.data.totalPages || 1);
        setTotalLogs(logsRes.data.data.total || 0);
      }
      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load login logs:', error);
      emitErrorToast('Failed to load login activity data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setLoginType('');
    setDeviceType('');
    setIsSuspicious('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleForceLogout = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to terminate this active session? The user will be logged out instantly.')) return;
    try {
      const res = await loginActivityService.forceLogout(sessionId);
      if (res.data?.success) {
        emitSuccessToast('Session terminated successfully');
        fetchData();
        if (selectedLog && selectedLog.sessionId === sessionId) {
          setSelectedLog({
            ...selectedLog,
            status: 'Session Expired',
            logoutTime: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      emitErrorToast('Failed to terminate session');
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      emitErrorToast('No logs to export');
      return;
    }

    const headers = [
      'Log ID', 'Email', 'User Name', 'Role', 'Status', 'Login Type', 
      'IP Address', 'Location', 'Browser', 'OS', 'Device', 'Login Time', 
      'Logout Time', 'Duration (Seconds)', 'Suspicious', 'Failure Reason'
    ];

    const rows = logs.map(log => [
      log.id,
      log.email || '',
      log.userName || '',
      log.role || '',
      log.status,
      log.loginType,
      log.ipAddress || '',
      log.location || '',
      log.browser || '',
      log.operatingSystem || '',
      log.deviceType || '',
      log.loginTime ? new Date(log.loginTime).toLocaleString() : '',
      log.logoutTime ? new Date(log.logoutTime).toLocaleString() : '',
      log.sessionDuration || '',
      log.isSuspicious ? 'YES' : 'NO',
      log.failureReason || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Security_Login_Activity_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    emitSuccessToast('CSV Log file exported successfully');
  };

  const formatDuration = (sec: number | undefined) => {
    if (!sec) return 'N/A';
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    if (mins < 60) return `${mins}m ${remainingSecs}s`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'Mobile': return <Smartphone size={16} className="text-indigo-500" />;
      case 'Tablet': return <Tablet size={16} className="text-emerald-500" />;
      default: return <Monitor size={16} className="text-blue-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
      case 'Failed': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400';
      case 'Logged Out': return 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400';
      default: return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'; // Session Expired
    }
  };

  // Recharts color mapper
  const barColors = ['#3b82f6', '#6366f1', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Shield className="text-brand-600 dark:text-brand-400" size={26} />
            Security & Login Activity Monitor
          </h1>
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mt-1">
            Enterprise security audit portal for access session tracking, geo-IP monitoring, and brute-force mitigation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2.5 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 rounded-xl transition-all border border-surface-150 dark:border-surface-700 shadow-sm"
            title="Refresh Logs"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-98"
          >
            <Download size={18} />
            Export Logs (CSV)
          </button>
        </div>
      </div>

      {/* Analytics widgets */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Logs', value: analytics.metrics.totalLogins, icon: Globe, color: 'blue', desc: 'Total authentication requests' },
            { label: 'Failed Attempts', value: analytics.metrics.failedLogins, icon: ShieldAlert, color: 'rose', desc: 'Blocked invalid attempts' },
            { label: 'Active Sessions', value: analytics.metrics.activeSessions, icon: Activity, color: 'emerald', desc: 'Currently connected devices' },
            { label: 'Suspicious Activities', value: analytics.metrics.suspiciousActivities, icon: AlertOctagon, color: 'amber', desc: 'Brute-force/unknown browser triggers' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-white dark:bg-surface-900 p-4 rounded-3xl border border-surface-100 dark:border-surface-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{card.label}</p>
                  <p className="text-3xl font-black text-surface-900 dark:text-white mt-1.5">{card.value}</p>
                  <p className="text-[10px] font-medium text-surface-400 mt-1 truncate">{card.desc}</p>
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                  card.color === 'blue' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400',
                  card.color === 'rose' && 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400',
                  card.color === 'emerald' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400',
                  card.color === 'amber' && 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                )}>
                  <Icon size={24} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advanced analytics charts (Recharts) */}
      {analytics && analytics.trends?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Linear Login Trend Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-surface-900 p-5 rounded-3xl border border-surface-100 dark:border-surface-800 shadow-sm">
            <h2 className="text-sm font-black text-surface-900 dark:text-white uppercase tracking-wider mb-4">Login Audit Timeline Trends</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trends.filter((t: any) => t.status === 'Success' || t.status === 'Failed')}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-surface-100 dark:stroke-surface-800" />
                  <XAxis dataKey="date" className="text-[10px] text-surface-400 font-semibold" />
                  <YAxis className="text-[10px] text-surface-400 font-semibold" />
                  <Tooltip contentStyle={{ borderRadius: '16px', background: '#fff', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" name="Authentications" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart Device Distribution */}
          <div className="bg-white dark:bg-surface-900 p-5 rounded-3xl border border-surface-100 dark:border-surface-800 shadow-sm flex flex-col">
            <h2 className="text-sm font-black text-surface-900 dark:text-white uppercase tracking-wider mb-4">Authentication Device Metrics</h2>
            <div className="h-48 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.devices}>
                  <XAxis dataKey="device" className="text-[10px] text-surface-400 font-semibold" />
                  <Tooltip contentStyle={{ borderRadius: '16px', background: '#fff', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[12, 12, 0, 0]} name="Logins">
                    {analytics.devices.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-around mt-4 pt-3 border-t border-surface-50 dark:border-surface-800">
              {analytics.devices.map((d: any, index: number) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: barColors[index % barColors.length] }} />
                  <span className="text-xs font-bold text-surface-600 dark:text-surface-400">{d.device}: {d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs list (All Logs / Active Sessions) */}
      <div className="flex bg-surface-100/80 dark:bg-surface-800/40 p-1.5 rounded-2xl w-fit border border-surface-200/50 dark:border-surface-700/50 shadow-inner">
        <button 
          onClick={() => { setActiveTab('all'); setPage(1); }}
          className={cn(
            "px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
            activeTab === 'all' ? "bg-white dark:bg-surface-700 shadow-md text-brand-600 dark:text-brand-400 scale-[1.02]" : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-white"
          )}
        >
          <Globe size={14} />
          Full Audit History
        </button>
        <button 
          onClick={() => { setActiveTab('active'); setPage(1); }}
          className={cn(
            "px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
            activeTab === 'active' ? "bg-white dark:bg-surface-700 shadow-md text-brand-600 dark:text-brand-400 scale-[1.02]" : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-white"
          )}
        >
          <Activity size={14} className="animate-pulse" />
          Active Live Sessions
        </button>
      </div>

      {/* Main List Box */}
      <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-100 dark:border-surface-800 shadow-sm overflow-hidden">
        {/* Filters Panel */}
        {activeTab === 'all' && (
          <div className="p-5 border-b border-surface-50 dark:border-surface-800 bg-surface-50/20 dark:bg-surface-800/10 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-stretch">
              {/* Search */}
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
                <input 
                  type="text"
                  placeholder="Search user name, email, IP, browser, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 pl-11 pr-4 py-2.5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white placeholder:text-surface-400 transition-all font-medium shadow-sm"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-surface-900 hover:bg-surface-950 dark:bg-surface-800 dark:hover:bg-surface-700 text-white dark:text-white rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 shrink-0"
                >
                  <Filter size={16} />
                  Filter
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2.5 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 border border-surface-150 dark:border-surface-700 text-surface-600 dark:text-surface-300 rounded-2xl text-sm font-bold shadow-sm transition-all shrink-0"
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Filter selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-surface-400 uppercase tracking-widest pl-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white dark:bg-surface-800 border border-surface-150 dark:border-surface-700 rounded-xl text-xs py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white font-semibold transition-all shadow-sm"
                >
                  <option value="">All Statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Login Type */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-surface-400 uppercase tracking-widest pl-1">Login Type</label>
                <select
                  value={loginType}
                  onChange={(e) => setLoginType(e.target.value)}
                  className="w-full bg-white dark:bg-surface-800 border border-surface-150 dark:border-surface-700 rounded-xl text-xs py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white font-semibold transition-all shadow-sm"
                >
                  <option value="">All Methods</option>
                  {LOGIN_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Device */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-surface-400 uppercase tracking-widest pl-1">Device</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full bg-white dark:bg-surface-800 border border-surface-150 dark:border-surface-700 rounded-xl text-xs py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white font-semibold transition-all shadow-sm"
                >
                  <option value="">All Devices</option>
                  {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Suspicious flag */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-surface-400 uppercase tracking-widest pl-1">Security Flags</label>
                <select
                  value={isSuspicious}
                  onChange={(e) => setIsSuspicious(e.target.value)}
                  className="w-full bg-white dark:bg-surface-800 border border-surface-150 dark:border-surface-700 rounded-xl text-xs py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white font-semibold transition-all shadow-sm"
                >
                  <option value="">Security Level</option>
                  <option value="true">⚠️ Suspicious Only</option>
                  <option value="false">🛡️ Secure Only</option>
                </select>
              </div>

              {/* Date Start */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-surface-400 uppercase tracking-widest pl-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-surface-800 border border-surface-150 dark:border-surface-700 rounded-xl text-xs py-1.5 px-3 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white font-semibold transition-all shadow-sm"
                />
              </div>

              {/* Date End */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-surface-400 uppercase tracking-widest pl-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white dark:bg-surface-800 border border-surface-150 dark:border-surface-700 rounded-xl text-xs py-1.5 px-3 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white font-semibold transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50/50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-800">
                <th className="px-6 py-4 text-xs font-bold text-surface-400 dark:text-surface-300 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-400 dark:text-surface-300 uppercase tracking-wider">Access Status</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-400 dark:text-surface-300 uppercase tracking-wider">Device & Browser</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-400 dark:text-surface-300 uppercase tracking-wider">IP & Location</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-400 dark:text-surface-300 uppercase tracking-wider">Session Time</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-400 dark:text-surface-300 uppercase tracking-wider text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50 dark:divide-surface-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-surface-500 dark:text-surface-400 font-bold animate-pulse text-sm">Querying activity logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="w-16 h-16 bg-surface-50 dark:bg-surface-800/40 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="text-surface-300 dark:text-surface-600" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-surface-900 dark:text-white">No activity records found</h3>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-sm mx-auto">
                      Adjust your query filters or search terms and refresh the monitor.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr 
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="group hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-all cursor-pointer border-b border-surface-50 dark:border-surface-800/50 last:border-0"
                  >
                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-700 flex items-center justify-center font-bold text-surface-700 dark:text-white shadow-inner uppercase text-sm">
                          {log.userName ? log.userName[0] : <User size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-surface-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {log.userName || 'Failed Attempt'}
                          </p>
                          <p className="text-[11px] font-semibold text-surface-450 dark:text-surface-400">{log.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Access Status */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm",
                          getStatusBadgeClass(log.status)
                        )}>
                          {log.status}
                        </span>
                        {log.isSuspicious && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-450 px-2 py-0.5 rounded-md">
                            ⚠️ Suspicious Action
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Device & Browser */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(log.deviceType)}
                        <div>
                          <p className="text-xs font-bold text-surface-800 dark:text-surface-200">
                            {log.browser || 'Unknown'}
                          </p>
                          <p className="text-[10px] font-semibold text-surface-450 dark:text-surface-400">
                            {log.operatingSystem || 'OS'} ({log.deviceType || 'Desktop'})
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* IP & Location */}
                    <td className="px-6 py-4 text-xs font-bold text-surface-700 dark:text-surface-300">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-surface-400" />
                        <div>
                          <p className="font-mono tracking-tight text-surface-900 dark:text-white">{log.ipAddress}</p>
                          <p className="text-[10px] font-semibold text-surface-450 dark:text-surface-400">{log.location}</p>
                        </div>
                      </div>
                    </td>

                    {/* Session Time */}
                    <td className="px-6 py-4 text-xs text-surface-500 dark:text-surface-400">
                      <div>
                        <p className="font-bold text-surface-700 dark:text-surface-300">
                          {new Date(log.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] font-semibold">
                          {new Date(log.loginTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </td>

                    {/* Audit Arrow */}
                    <td className="px-6 py-4 text-right">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-all ml-auto">
                        <ArrowRight size={16} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {logs.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-surface-50 dark:border-surface-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">
              Showing logs {(page - 1) * limit + 1} - {Math.min(page * limit, totalLogs)} of {totalLogs}
            </span>
            
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 border border-surface-150 dark:border-surface-700 text-surface-700 dark:text-white rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg transition-all",
                      page === i + 1 
                        ? "bg-brand-600 text-white" 
                        : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 border border-surface-150 dark:border-surface-700 text-surface-700 dark:text-white rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Slide Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-surface-950/40 backdrop-blur-[2px]">
            <div className="fixed inset-0" onClick={() => setSelectedLog(null)} />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="w-full max-w-md h-full bg-white dark:bg-surface-900 shadow-2xl relative overflow-hidden flex flex-col border-l border-surface-100 dark:border-surface-800 z-50"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between bg-surface-50/40 dark:bg-surface-800/20">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all border border-transparent hover:border-surface-150 dark:hover:border-surface-700">
                    <X size={18} className="text-surface-500" />
                  </button>
                  <h2 className="text-base font-black text-surface-900 dark:text-white uppercase tracking-wider">Log Detail Profile</h2>
                </div>
                {selectedLog.status === 'Success' && selectedLog.sessionId && (
                  <button
                    onClick={() => handleForceLogout(selectedLog.sessionId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-[10px] font-black uppercase rounded-lg transition-colors border border-rose-100 dark:border-rose-900/30 shadow-sm"
                  >
                    <Power size={11} />
                    Force Sign Out
                  </button>
                )}
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-surface-800 dark:text-surface-200">
                {/* Status and User Summary */}
                <div className="flex flex-col items-center text-center pb-6 border-b border-surface-50 dark:border-surface-800">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950/20 dark:to-brand-900/40 flex items-center justify-center font-bold text-brand-600 dark:text-brand-400 uppercase text-2xl shadow-inner mb-3">
                    {selectedLog.userName ? selectedLog.userName[0] : '?'}
                  </div>
                  <h3 className="text-lg font-black text-surface-900 dark:text-white leading-tight">{selectedLog.userName || 'Failed Credentials'}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">{selectedLog.email}</p>
                  
                  <span className={cn(
                    "inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase mt-3 shadow-inner",
                    getStatusBadgeClass(selectedLog.status)
                  )}>
                    {selectedLog.status}
                  </span>
                </div>

                {/* Audit Grid */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-surface-400 uppercase tracking-widest pl-1 border-b border-surface-50 dark:border-surface-800 pb-2">Session Parameters</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 p-3 bg-surface-50/50 dark:bg-surface-950/20 rounded-2xl border border-surface-100/50 dark:border-surface-800/50">
                      <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest">Login Type</p>
                      <p className="text-xs font-bold dark:text-white">{selectedLog.loginType}</p>
                    </div>
                    <div className="space-y-1 p-3 bg-surface-50/50 dark:bg-surface-950/20 rounded-2xl border border-surface-100/50 dark:border-surface-800/50">
                      <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest">Role Claim</p>
                      <p className="text-xs font-bold dark:text-white uppercase tracking-wider">{selectedLog.role || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 p-3 bg-surface-50/50 dark:bg-surface-950/20 rounded-2xl border border-surface-100/50 dark:border-surface-800/50 col-span-2">
                      <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest">IP Address</p>
                      <p className="text-xs font-mono font-bold dark:text-white">{selectedLog.ipAddress}</p>
                    </div>
                    <div className="space-y-1 p-3 bg-surface-50/50 dark:bg-surface-950/20 rounded-2xl border border-surface-100/50 dark:border-surface-800/50 col-span-2">
                      <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest">Client Location</p>
                      <p className="text-xs font-bold dark:text-white flex items-center gap-1.5">
                        <Globe size={14} className="text-brand-500" />
                        {selectedLog.location}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Device Profile */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-surface-400 uppercase tracking-widest pl-1 border-b border-surface-50 dark:border-surface-800 pb-2">Device Profile</h4>
                  
                  <div className="p-4 bg-surface-50/50 dark:bg-surface-950/20 rounded-2xl border border-surface-100/50 dark:border-surface-800/50 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-surface-400">Device Type</span>
                      <span className="font-bold text-surface-800 dark:text-surface-200 flex items-center gap-1">
                        {getDeviceIcon(selectedLog.deviceType)}
                        {selectedLog.deviceType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-surface-400">Browser Name</span>
                      <span className="font-bold text-surface-800 dark:text-surface-200">{selectedLog.browser || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-surface-400">Operating System</span>
                      <span className="font-bold text-surface-800 dark:text-surface-200">{selectedLog.operatingSystem || 'Unknown'}</span>
                    </div>
                    {selectedLog.userAgent && (
                      <div className="pt-2 border-t border-surface-100 dark:border-surface-800/40">
                        <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest">User Agent Header</p>
                        <p className="text-[10px] font-mono text-surface-500 dark:text-surface-400 break-words mt-1 leading-relaxed">{selectedLog.userAgent}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Timeline */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-surface-400 uppercase tracking-widest pl-1 border-b border-surface-50 dark:border-surface-800 pb-2">Audit Timestamp Lifecycle</h4>
                  
                  <div className="space-y-6 pl-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-100 dark:before:bg-surface-800">
                    {/* Event 1: Login */}
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-white dark:bg-surface-900 border-[3.5px] border-brand-500 shadow-sm" />
                      <div className="text-xs">
                        <p className="font-bold text-surface-900 dark:text-white uppercase tracking-wider">Access Connection Requested</p>
                        <p className="text-[10px] font-semibold text-surface-500 mt-0.5">
                          {selectedLog.loginTime ? new Date(selectedLog.loginTime).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Event 2: Status Outcome */}
                    <div className="relative">
                      <div className={cn(
                        "absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-white dark:bg-surface-900 border-[3.5px] shadow-sm",
                        selectedLog.status === 'Success' ? 'border-emerald-500' : 'border-rose-500'
                      )} />
                      <div className="text-xs">
                        <p className="font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                          {selectedLog.status === 'Success' ? 'Authorization Verified' : 'Authentication Rejected'}
                        </p>
                        {selectedLog.failureReason && (
                          <div className="mt-1.5 p-2 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-100/50 dark:border-rose-900/25">
                            <p className="text-[10px] text-rose-700 dark:text-rose-450 italic font-bold">"Reason: {selectedLog.failureReason}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event 3: Logout/Expiration */}
                    {selectedLog.status !== 'Success' && selectedLog.status !== 'Failed' && (
                      <div className="relative">
                        <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-white dark:bg-surface-900 border-[3.5px] border-slate-400 dark:border-slate-600 shadow-sm" />
                        <div className="text-xs">
                          <p className="font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                            {selectedLog.status === 'Logged Out' ? 'Client Logout Executed' : 'Token Session Invalidated'}
                          </p>
                          <p className="text-[10px] font-semibold text-surface-500 mt-0.5">
                            {selectedLog.logoutTime ? new Date(selectedLog.logoutTime).toLocaleString() : 'N/A'}
                          </p>
                          {selectedLog.sessionDuration && (
                            <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold mt-1">
                              Duration Active: {formatDuration(selectedLog.sessionDuration)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Security Flags */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-surface-400 uppercase tracking-widest pl-1 border-b border-surface-50 dark:border-surface-800 pb-2">Threat Intelligence Checks</h4>
                  <div className="p-4 rounded-2xl bg-surface-50/50 dark:bg-surface-950/20 border border-surface-150/50 dark:border-surface-800/50 flex items-start gap-3">
                    {selectedLog.isSuspicious ? (
                      <>
                        <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Suspicious Activity Triggered</p>
                          <p className="text-[10px] text-surface-500 leading-normal mt-1">
                            This connection has triggered security flags. Indicators might include: repetitive failed password attempts, loopback proxy detection, or unrecognized user agent signatures. We recommend auditing the user account.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-450">Connection Clear & Secure</p>
                          <p className="text-[10px] text-surface-500 leading-normal mt-1">
                            No suspicious metrics were recorded for this connection profile. Handshake was fully verified and is validated as standard.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
