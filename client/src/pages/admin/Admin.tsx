import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Crown, BarChart3, Plus, Search,
  MoreHorizontal, Check, X, Trash2, Edit3, Globe, Shield,
  CreditCard, TrendingUp, Zap, Star, CheckCircle
} from 'lucide-react';
import { cn, formatDate } from '../../utils/helpers';
import { ROLE_CONFIG } from '../../app/constants';
import { useAppStore } from '../../context/appStore';
import { usersService, workspacesService, rbacService } from '../../services/api';
import { UserAvatar } from '../../components/UserAvatar';
import { Modal } from '../../components/Modal';
import { DeactivationModal } from '../../components/DeactivationModal';
import { Table, ProgressBar, EmptyState } from '../../components/ui';
import { emitSuccessToast } from '../../context/toastBus';
import type { User, Role, UserImportResult, UserImportRow, UserPerformance } from '../../app/types';

const USER_IMPORT_TEMPLATE_HEADERS = ['name', 'email', 'password', 'role', 'jobTitle', 'department'];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, '').trim());
}

function parseUsersCsv(content: string) {
  const sanitized = content.replace(/^\uFEFF/, '');
  const lines = sanitized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [] as UserImportRow[], parseErrors: ['The file must contain a header row and at least one user row.'] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const requiredHeaders = ['name', 'email', 'password'];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    return { rows: [] as UserImportRow[], parseErrors: [`Missing required columns: ${missingHeaders.join(', ')}`] };
  }

  const rows: UserImportRow[] = [];
  const parseErrors: string[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex]);
    const record = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});

    if (!record.name && !record.email && !record.password) continue;

    const roleValue = (record.role || 'team_member').trim() as Role;
    const allowedRoles: Role[] = ['admin', 'manager', 'team_leader', 'team_member'];
    if (!allowedRoles.includes(roleValue)) {
      parseErrors.push(`Row ${lineIndex + 1}: role must be one of ${allowedRoles.join(', ')}.`);
      continue;
    }

    if (!record.name?.trim() || !record.email?.trim() || !record.password?.trim()) {
      parseErrors.push(`Row ${lineIndex + 1}: name, email, and password are required.`);
      continue;
    }

    rows.push({
      rowNumber: lineIndex + 1,
      name: record.name.trim(),
      email: record.email.trim().toLowerCase(),
      password: record.password.trim(),
      role: roleValue,
      jobTitle: record.jobTitle?.trim() || '',
      department: record.department?.trim() || '',
    });
  }

  return { rows, parseErrors };
}

// ─── Workspaces Admin ─────────────────────────────────────────────────────────
export const AdminWorkspacesPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { workspaces, users } = useAppStore();
  const filtered = workspaces.filter(w => w.name.toLowerCase().includes(search.toLowerCase()));

  const PLAN_BADGE: Record<string, string> = {
    free: 'badge-gray',
    pro: 'badge-blue',
    enterprise: 'badge-purple',
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Workspaces</h1>
          <p className="page-subtitle text-xs sm:text-sm">Manage all workspaces across the platform</p>
        </div>
        <button className="btn-primary btn-md w-full sm:w-auto"><Plus size={16} /> New Workspace</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Workspaces', value: workspaces.length, color: '#3366ff', icon: <Building2 size={18} /> },
          { label: 'Active Users', value: users.filter(u => u.isActive).length, color: '#10b981', icon: <Users size={18} /> },
          { label: 'Pro/Enterprise', value: workspaces.filter(w => w.plan !== 'free').length, color: '#7c3aed', icon: <Crown size={18} /> },
          { label: 'MRR', value: '—', color: '#f59e0b', icon: <TrendingUp size={18} /> },
        ].map((stat, i) => {
          const destinations: Record<string, string> = {
            'Total Workspaces': '/admin/workspaces',
            'Active Users': '/admin/users',
            'Pro/Enterprise': '/admin/workspaces',
            'MRR': '/admin/billing',
          };
          return (
            <motion.button
              type="button"
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(destinations[stat.label] || '/admin/workspaces')}
              className="card p-4 text-left cursor-pointer hover:shadow-card-hover transition-all"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${stat.color}15` }}>
                <div style={{ color: stat.color }}>{stat.icon}</div>
              </div>
              <p className="font-display font-bold text-2xl text-surface-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-surface-400">{stat.label}</p>
            </motion.button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-full sm:max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workspaces..." className="input pl-9 w-full" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <Table
          columns={[
            {
              key: 'name', header: 'Workspace',
              render: (w) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">{w.name[0]}</div>
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200 text-sm">{w.name}</p>
                    <p className="text-xs text-surface-400">{w.slug}.flowboard.io</p>
                  </div>
                </div>
              )
            },
            {
              key: 'plan', header: 'Plan',
              render: (w) => <span className={cn('badge capitalize', PLAN_BADGE[w.plan])}>{w.plan}</span>
            },
            { key: 'membersCount', header: 'Members', render: (w) => <span className="text-sm">{w.membersCount}</span> },
            { key: 'createdAt', header: 'Created', render: (w) => <span className="text-sm text-surface-500">{formatDate(w.createdAt)}</span> },
            {
              key: 'actions', header: '', align: 'right',
              render: () => (
                <div className="flex items-center gap-1 justify-end">
                  <button className="btn-ghost btn-lg w-17 h-17"><Edit3 size={17} /></button>
                  <button className="btn-ghost btn-lg w-17 h-17 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={17} /></button>
                </div>
              )
            },
          ]}
          data={filtered}
          keyExtractor={w => w.id}
        />
      </div>
    </div>
  );
};

// ─── Users Admin ──────────────────────────────────────────────────────────────
export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | 'all'>('all');
  const [dynamicRoles, setDynamicRoles] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    roleId: '',
    email: '',
    jobTitle: '',
    department: '',
    isActive: true,
    canUsePrivateQuickTasks: false,
  });
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
    jobTitle: '',
    department: '',
    canUsePrivateQuickTasks: false,
    sendCredentialsEmail: true,
  });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [userOverview, setUserOverview] = useState<UserPerformance | null>(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', showPassword: false });
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState<UserImportRow[]>([]);
  const [importParseErrors, setImportParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<UserImportResult | null>(null);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [targetDeactivateUser, setTargetDeactivateUser] = useState<User | null>(null);
  const { users, addUser, bootstrap } = useAppStore();

  useEffect(() => {
    rbacService.getRoles().then(res => {
      const fetchedRoles = res.data?.data || [];
      setDynamicRoles(fetchedRoles);
      if (fetchedRoles.length > 0) {
        setCreateForm(prev => ({ ...prev, roleId: fetchedRoles.find((r: any) => r.slug === 'team_member')?._id || fetchedRoles[0]._id }));
      }
    }).catch(console.error);
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    
    // Check role match using roleIds or fallback to role string
    let matchRole = roleFilter === 'all';
    if (roleFilter !== 'all') {
      const hasDynamicRole = u.roleIds && u.roleIds.includes(roleFilter);
      const hasLegacyRole = u.role === roleFilter || (dynamicRoles.find(r => r._id === roleFilter)?.slug === u.role);
      matchRole = Boolean(hasDynamicRole || hasLegacyRole);
    }
    
    return matchSearch && matchRole;
  });

  const filterOptions = [
    { value: 'all', label: 'All' },
    ...dynamicRoles.map(r => ({ value: r._id, label: r.name }))
  ];

  const handleCreateChange = (
    field: Exclude<keyof typeof createForm, 'sendCredentialsEmail'>,
    value: string
  ) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      email: '',
      password: '',
      roleId: dynamicRoles.find(r => r.slug === 'team_member')?._id || (dynamicRoles[0]?._id || ''),
      jobTitle: '',
      department: '',
      canUsePrivateQuickTasks: false,
      sendCredentialsEmail: true,
    });
    setCreateError('');
    setIsCreating(false);
  };

  const resetImportState = () => {
    setImportFileName('');
    setImportRows([]);
    setImportParseErrors([]);
    setImportResult(null);
    setIsImporting(false);
  };

  useEffect(() => {
    if (!selectedUser) return;
    setEditForm({
      roleId: selectedUser.roleIds?.[0] || dynamicRoles.find(r => r.slug === selectedUser.role)?._id || '',
      email: selectedUser.email || '',
      jobTitle: selectedUser.jobTitle || '',
      department: selectedUser.department || '',
      isActive: selectedUser.isActive,
      canUsePrivateQuickTasks: Boolean(selectedUser.canUsePrivateQuickTasks),
    });
    setPasswordForm({ newPassword: '', showPassword: false });
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      setUserOverview(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setIsLoadingOverview(true);
        const res = await usersService.getPerformance(selectedUser.id);
        if (!cancelled) setUserOverview(res.data?.data ?? res.data);
      } catch {
        if (!cancelled) setUserOverview(null);
      } finally {
        if (!cancelled) setIsLoadingOverview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);
    try {
      const res = await usersService.create(createForm);
      addUser(res.data.data ?? res.data);
      setCreateOpen(false);
      resetCreateForm();
    } catch (error: any) {
      setCreateError(error?.response?.data?.error?.message || error?.response?.data?.message || 'Failed to create user');
      setIsCreating(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setIsSavingUser(true);
    try {
      const payload = {
        ...editForm,
        roleIds: [editForm.roleId]
      };
      await usersService.update(selectedUser.id, payload);
      await bootstrap();
      setSelectedUser(null);
    } catch {
      // shared interceptor shows the error
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleEnable = async (u: User) => {
    try {
      await usersService.update(u.id, { isActive: true });
      emitSuccessToast(`${u.name} has been enabled successfully.`);
      await bootstrap();
    } catch {
      // shared interceptor shows error
    }
  };

  const handleSetPassword = async () => {
    if (!selectedUser || passwordForm.newPassword.trim().length < 8) return;
    setIsSettingPassword(true);
    try {
      await usersService.setPassword(selectedUser.id, { newPassword: passwordForm.newPassword.trim() });
      emitSuccessToast('Password updated successfully.', 'Password Updated');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const downloadImportTemplate = () => {
    const csv = `${USER_IMPORT_TEMPLATE_HEADERS.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'user-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportResult(null);
    setImportFileName(file.name);

    const text = await file.text();
    const parsed = parseUsersCsv(text);
    setImportRows(parsed.rows);
    setImportParseErrors(parsed.parseErrors);
  };

  const handleBulkImport = async () => {
    if (importRows.length === 0) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await usersService.importBulk(importRows);
      const result = (res.data?.data ?? res.data) as UserImportResult;
      setImportResult(result);
      await bootstrap();
      emitSuccessToast(
        `${result.createdCount} user${result.createdCount === 1 ? '' : 's'} imported successfully.`,
        'Import Completed'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Users</h1>
          <p className="page-subtitle text-xs sm:text-sm">{users.length} users across all workspaces</p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3">
          <button onClick={downloadImportTemplate} className="btn-secondary btn-md w-full sm:w-auto">
            Download Template
          </button>
          <button
            onClick={() => {
              resetImportState();
              setImportOpen(true);
            }}
            className="btn-secondary btn-md w-full sm:w-auto"
          >
            Import Users
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary btn-md w-full sm:w-auto"><Plus size={16} /> Create New User</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input pl-9 w-full" />
        </div>
        <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-1 flex-wrap">
          {filterOptions.map(r => (
            <button key={r.value} onClick={() => setRoleFilter(r.value)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                roleFilter === r.value ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm' : 'text-surface-500')}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <Table
          columns={[
            {
              key: 'name', header: 'User',
              render: (u) => (
                <div className="flex items-center gap-3">
                  <UserAvatar name={u.name} color={u.color} size="sm" isOnline={u.isActive} />
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200 text-sm">{u.name}</p>
                    <p className="text-xs text-surface-400">{u.email}</p>
                  </div>
                </div>
              )
            },
            {
              key: 'role', header: 'Role',
              render: (u) => {
                const r = dynamicRoles.find(dr => u.roleIds?.includes(dr._id)) || dynamicRoles.find(dr => dr.slug === u.role);
                return (
                  <span className={cn('badge text-xs', 'bg-brand-50 text-brand-600 border border-brand-100')}>
                    {r ? r.name : (u.role || 'Member')}
                  </span>
                );
              }
            },
            { key: 'jobTitle', header: 'Title', render: (u) => <span className="text-sm text-surface-500">{u.jobTitle || '—'}</span> },
            {
              key: 'isActive', header: 'Status',
              render: (u) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (u.isActive) {
                      setTargetDeactivateUser(u);
                      setDeactivateModalOpen(true);
                    } else {
                      void handleToggleEnable(u);
                    }
                  }}
                  className={cn(
                    "badge text-[10px] font-bold uppercase tracking-wider transition-all min-w-[72px] text-center cursor-pointer",
                    u.isActive
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                      : "bg-surface-100 text-surface-500 border border-surface-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100"
                  )}
                >
                  {u.isActive ? 'Active' : 'Disabled'}
                </button>
              )
            },
            { key: 'employeeId', header: 'Employee ID', render: (u) => <span className="text-xs text-surface-500">{u.employeeId || '—'}</span> },
            {
              key: 'actions', header: '', align: 'right',
              render: (u) => (
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }} className="btn-ghost btn w-8 h-8 rounded-lg"><Edit3 size={14} /></button>
                </div>
              )
            },
          ]}
          data={filtered}
          keyExtractor={u => u.id}
          onRowClick={(u) => setSelectedUser(u)}
        />
      </div>

      {/* User Edit Modal */}
      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="Edit User" size="md">
        {selectedUser && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
              <UserAvatar name={selectedUser.name} color={selectedUser.color} size="md" />
              <div>
                <p className="font-medium text-surface-800 dark:text-surface-200">{selectedUser.name}</p>
                <p className="text-xs text-surface-400">{selectedUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                <p className="text-[11px] uppercase tracking-wide text-surface-400">Employee ID</p>
                <p className="mt-1 text-sm font-medium text-surface-800 dark:text-surface-200">{selectedUser.employeeId || 'Not assigned'}</p>
              </div>
              <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                <p className="text-[11px] uppercase tracking-wide text-surface-400">Joined</p>
                <p className="mt-1 text-sm font-medium text-surface-800 dark:text-surface-200">{formatDate(selectedUser.createdAt)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-surface-100 dark:border-surface-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Profile Overview</p>
                  <p className="text-xs text-surface-400">Admin summary of this user’s current workload and delivery metrics.</p>
                </div>
                {isLoadingOverview && <p className="text-xs text-surface-400">Loading...</p>}
              </div>
              {userOverview ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-950/20 dark:text-brand-200">
                    {userOverview.insight?.headline || 'Overview loaded successfully.'}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">Assigned</p>
                      <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">{userOverview.summary.assignedTasks}</p>
                    </div>
                    <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">Completed</p>
                      <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">{userOverview.summary.completedTasks}</p>
                    </div>
                    <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">Overdue Open</p>
                      <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">{userOverview.summary.overdueOpenTasks}</p>
                    </div>
                    <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">Performance</p>
                      <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">{userOverview.summary.performanceScore}%</p>
                    </div>
                    <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">Due Today</p>
                      <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">{userOverview.summary.dueTodayTasks}</p>
                    </div>
                    <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">Completed Today</p>
                      <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">{userOverview.summary.todayCompletedTasks}</p>
                    </div>
                  </div>
                  {userOverview.currentWorkload?.length ? (
                    <div className="rounded-xl border border-surface-100 dark:border-surface-800 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">Current Focus</p>
                      <div className="mt-3 space-y-2">
                        {userOverview.currentWorkload.slice(0, 4).map((item) => (
                          <div key={item.id} className="rounded-xl bg-surface-50 dark:bg-surface-800 px-3 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{item.title}</p>
                                <p className="text-xs text-surface-400">
                                  {item.type === 'project_task' ? (item.projectName || 'Project task') : 'Quick task'}
                                  {item.dueDate ? ` • Due ${formatDate(item.dueDate)}` : ''}
                                </p>
                              </div>
                              <span className="text-[11px] uppercase tracking-wide text-surface-500">{item.status.replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {userOverview.insight?.focusAreas?.length ? (
                    <div className="rounded-xl border border-surface-100 dark:border-surface-800 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">Focus Areas</p>
                      <div className="mt-2 space-y-2">
                        {userOverview.insight.focusAreas.map((item) => (
                          <p key={item} className="text-sm text-surface-600 dark:text-surface-300">{item}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                !isLoadingOverview ? <p className="mt-3 text-sm text-surface-400">Overview is not available for this user yet.</p> : null
              )}
            </div>
            <div>
              <label className="label">Role</label>
              <select value={editForm.roleId} onChange={e => setEditForm(prev => ({ ...prev, roleId: e.target.value }))} className="input">
                <option value="" disabled>Select Role</option>
                {dynamicRoles.map(r => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Email</label>
              <input value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} className="input" type="email" />
            </div>
            <div>
              <label className="label">Job Title</label>
              <input value={editForm.jobTitle} onChange={e => setEditForm(prev => ({ ...prev, jobTitle: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Department</label>
              <input value={editForm.department} onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))} className="input" />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
              <div>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Account Status</p>
                <p className="text-xs text-surface-400">{editForm.isActive ? 'Currently active' : 'Account disabled'}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                className={cn('relative w-10 h-6 rounded-full transition-colors', editForm.isActive ? 'bg-brand-600' : 'bg-surface-200')}
              >
                <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform', editForm.isActive ? 'left-5' : 'left-1')} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
              <div>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Private Quick Tasks</p>
                <p className="text-xs text-surface-400">
                  Allow this user to assign and manage private quick tasks from their own account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditForm(prev => ({ ...prev, canUsePrivateQuickTasks: !prev.canUsePrivateQuickTasks }))}
                className={cn('relative w-10 h-6 rounded-full transition-colors', editForm.canUsePrivateQuickTasks ? 'bg-brand-600' : 'bg-surface-200')}
              >
                <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform', editForm.canUsePrivateQuickTasks ? 'left-5' : 'left-1')} />
              </button>
            </div>
            <div className="rounded-xl border border-surface-100 dark:border-surface-800 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Password</p>
                <p className="text-xs text-surface-400">Admins can set a new password here. Existing passwords cannot be viewed.</p>
              </div>
              <div className="flex gap-2">
                <input
                  type={passwordForm.showPassword ? 'text' : 'password'}
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={() => setPasswordForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
                  className="btn-secondary btn-md"
                >
                  {passwordForm.showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { void handleSetPassword(); }}
                disabled={isSettingPassword || passwordForm.newPassword.trim().length < 8}
                className="btn-secondary btn-md w-full"
              >
                {isSettingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelectedUser(null)} className="btn-secondary btn-md flex-1">Cancel</button>
              <button onClick={() => { void handleSaveUser(); }} disabled={isSavingUser} className="btn-primary btn-md flex-1">{isSavingUser ? 'Saving...' : 'Save changes'}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          resetImportState();
        }}
        title="Import Users"
        description="Upload an Excel-friendly CSV file to create multiple users at once."
        size="lg"
      >
        <div className="p-4 sm:p-6 space-y-5">
          <div className="rounded-2xl border border-dashed border-surface-200 bg-surface-50/80 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">Upload filled template</p>
                <p className="text-xs text-surface-500">Required columns: `name`, `email`, `password`. Optional: `role`, `jobTitle`, `department`.</p>
              </div>
              <label className="btn-primary btn-md cursor-pointer w-full sm:w-auto text-center">
                Choose CSV File
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { void handleImportFile(e); }} />
              </label>
            </div>
            {importFileName && (
              <p className="mt-3 text-xs text-surface-400">Selected file: {importFileName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">Parsed Rows</p>
              <p className="mt-1 text-2xl font-display font-bold text-surface-900 dark:text-surface-100">{importRows.length}</p>
            </div>
            <div className="rounded-xl bg-surface-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">Parse Errors</p>
              <p className="mt-1 text-2xl font-display font-bold text-rose-500">{importParseErrors.length}</p>
            </div>
            <div className="rounded-xl bg-surface-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">Allowed Roles</p>
              <p className="mt-1 text-sm font-medium text-surface-700 dark:text-surface-300">admin, manager, team_leader, team_member</p>
            </div>
          </div>

          {importParseErrors.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-700 mb-2">Fix these rows before import</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {importParseErrors.map((error, index) => (
                  <p key={`${error}-${index}`} className="text-xs text-rose-600">{error}</p>
                ))}
              </div>
            </div>
          )}

          {importRows.length > 0 && (
            <div className="rounded-2xl border border-surface-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-surface-50">
                <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">Preview</p>
                <p className="text-xs text-surface-400">Showing first {Math.min(importRows.length, 5)} rows</p>
              </div>
              <div className="divide-y divide-surface-100">
                {importRows.slice(0, 5).map((row) => (
                  <div key={`${row.rowNumber}-${row.email}`} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_0.9fr] gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-surface-900 dark:text-surface-100 truncate">{row.name}</p>
                      <p className="text-xs text-surface-400">Row {row.rowNumber}</p>
                    </div>
                    <p className="text-surface-600 dark:text-surface-300 truncate">{row.email}</p>
                    <p className="text-surface-500 capitalize">{ROLE_CONFIG[row.role || 'team_member'].label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importResult && (
            <div className="rounded-2xl border border-surface-200 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Created</p>
                  <p className="mt-1 text-2xl font-display font-bold text-emerald-700">{importResult.createdCount}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Failed</p>
                  <p className="mt-1 text-2xl font-display font-bold text-rose-700">{importResult.failedCount}</p>
                </div>
                <div className="rounded-xl bg-surface-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">Total</p>
                  <p className="mt-1 text-2xl font-display font-bold text-surface-900 dark:text-surface-100">{importResult.totalRows}</p>
                </div>
              </div>
              {importResult.failures.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.failures.map((failure) => (
                    <p key={`${failure.rowNumber}-${failure.email || failure.name || failure.message}`} className="text-xs text-rose-600">
                      Row {failure.rowNumber} ({failure.email || failure.name || 'Unknown'}): {failure.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setImportOpen(false);
                resetImportState();
              }}
              className="btn-secondary btn-md flex-1"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => { void handleBulkImport(); }}
              disabled={isImporting || importRows.length === 0 || importParseErrors.length > 0}
              className="btn-primary btn-md flex-1"
            >
              {isImporting ? 'Importing...' : `Import ${importRows.length || ''} Users`}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
        title="Create User"
        description="Add a new user to the current company workspace."
        size="md"
      >
        <form onSubmit={handleCreateUser} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Full Name</label>
              <input value={createForm.name} onChange={e => handleCreateChange('name', e.target.value)} className="input" placeholder="Enter full name" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input type="email" value={createForm.email} onChange={e => handleCreateChange('email', e.target.value)} className="input" placeholder="name@company.com" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Temporary Password</label>
              <input type="password" minLength={8} value={createForm.password} onChange={e => handleCreateChange('password', e.target.value)} className="input" placeholder="Minimum 8 characters" required />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={createForm.roleId} onChange={e => handleCreateChange('roleId', e.target.value)} className="input" required>
                <option value="" disabled>Select Role</option>
                {dynamicRoles.map(role => (
                  <option key={role._id} value={role._id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Job Title</label>
              <input value={createForm.jobTitle} onChange={e => handleCreateChange('jobTitle', e.target.value)} className="input" placeholder="e.g. Product Manager" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Department</label>
              <input value={createForm.department} onChange={e => handleCreateChange('department', e.target.value)} className="input" placeholder="e.g. Operations" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-start gap-3 rounded-2xl border border-surface-100 px-4 py-3 text-sm text-surface-600 dark:border-surface-800 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={createForm.canUsePrivateQuickTasks}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, canUsePrivateQuickTasks: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  Enable private quick tasks for this user so they can assign private quick tasks from their own account.
                </span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-start gap-3 rounded-2xl border border-surface-100 px-4 py-3 text-sm text-surface-600 dark:border-surface-800 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={createForm.sendCredentialsEmail}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, sendCredentialsEmail: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  Send username and temporary password by email to this user after creation.
                </span>
              </label>
            </div>
          </div>

          {createError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {createError}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
              className="btn-secondary btn-md flex-1"
            >
              Cancel
            </button>
            <button type="submit" disabled={isCreating} className="btn-primary btn-md flex-1">
              {isCreating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
      <DeactivationModal
        open={deactivateModalOpen}
        onClose={() => {
          setDeactivateModalOpen(false);
          setTargetDeactivateUser(null);
        }}
        user={targetDeactivateUser}
        onSuccess={bootstrap}
      />
    </div>
  );
};

// ─── Permissions Admin ────────────────────────────────────────────────────────
export const AdminPermissionsPage: React.FC = () => {
  const [registry, setRegistry] = useState<{ module: string; permissions: { key: string; label?: string; description: string }[] }[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [originalRoles, setOriginalRoles] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '' });
  
  const [createPermOpen, setCreatePermOpen] = useState(false);
  const [newPermForm, setNewPermForm] = useState({ module: 'Custom', key: '', label: '', description: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [regRes, rolesRes] = await Promise.all([
        rbacService.getRegistry(),
        rbacService.getRoles()
      ]);
      setRegistry(regRes.data?.data || []);
      const rls = rolesRes.data?.data || [];
      setRoles(JSON.parse(JSON.stringify(rls)));
      setOriginalRoles(JSON.parse(JSON.stringify(rls)));
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasChanges = useMemo(() => JSON.stringify(roles) !== JSON.stringify(originalRoles), [roles, originalRoles]);

  const togglePermission = (roleId: string, permissionKey: string) => {
    setRoles(prev => prev.map(r => {
      if (r._id !== roleId) return r;
      const perms = r.permissions || [];
      const newPerms = perms.includes(permissionKey)
        ? perms.filter((p: string) => p !== permissionKey)
        : [...perms, permissionKey];
      return { ...r, permissions: newPerms };
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    setMessage('');
    try {
      const dirtyRoles = roles.filter((r, i) => JSON.stringify(r) !== JSON.stringify(originalRoles[i]));
      await Promise.all(dirtyRoles.map(r => rbacService.updateRole(r._id, { permissions: r.permissions })));
      setOriginalRoles(JSON.parse(JSON.stringify(roles)));
      setMessage('Permissions updated successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Failed to update permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rbacService.createRole({ name: newRoleForm.name, description: newRoleForm.description });
      setCreateRoleOpen(false);
      setNewRoleForm({ name: '', description: '' });
      loadData();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to create role.');
    }
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rbacService.createCustomPermission(newPermForm);
      setCreatePermOpen(false);
      setNewPermForm({ module: 'Custom', key: '', label: '', description: '' });
      loadData();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to create custom permission.');
    }
  };

  if (loading) return <div className="p-10 text-center text-surface-500">Loading permission registry...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="page-header flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Shield size={24} /> Roles & Permissions</h1>
          <p className="page-subtitle">Configure advanced enterprise role-based access control</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setRoles(JSON.parse(JSON.stringify(originalRoles))); }} disabled={!hasChanges} className="btn-secondary btn-md">Discard Changes</button>
          <button onClick={() => setCreatePermOpen(true)} className="btn-secondary btn-md"><Plus size={16} /> New Permission</button>
          <button onClick={() => setCreateRoleOpen(true)} className="btn-secondary btn-md"><Plus size={16} /> New Role</button>
          <button onClick={savePermissions} disabled={saving || !hasChanges} className="btn-primary btn-md">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600 border border-brand-200">
          {message}
        </div>
      )}

      <div className="card overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider w-72">Permission</th>
                {roles.map(role => (
                  <th key={role._id} className="px-4 py-3 text-center text-xs font-semibold text-surface-700 dark:text-surface-300 tracking-wider">
                    <div className="font-bold">{role.name}</div>
                    {role.isSystemRole && <span className="text-[9px] uppercase tracking-wider text-surface-400">System</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50 dark:divide-surface-800/50">
              {registry.map((mod) => (
                <React.Fragment key={mod.module}>
                  <tr className="bg-surface-50/50 dark:bg-surface-800/30">
                    <td colSpan={roles.length + 1} className="px-5 py-2 text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      {mod.module}
                    </td>
                  </tr>
                  {mod.permissions.map((perm, pi) => (
                    <motion.tr
                      key={perm.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: pi * 0.01 }}
                      className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
                    >
                      <td className="px-5 py-3.5 align-top">
                        <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{perm.label || perm.key}</p>
                        <p className="text-xs text-surface-400 mt-0.5">{perm.description}</p>
                        <p className="text-[10px] font-mono text-surface-300 dark:text-surface-600 mt-1">{perm.key}</p>
                      </td>
                      {roles.map((role) => {
                        // Super Admin gets everything implicitly, we can visually disable it
                        const isSuperAdmin = role.slug === 'super_admin';
                        const allowed = isSuperAdmin ? true : (role.permissions || []).includes(perm.key);
                        return (
                          <td key={role._id} className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              disabled={isSuperAdmin}
                              onClick={() => togglePermission(role._id, perm.key)}
                              className={cn(
                                'mx-auto flex h-9 w-9 items-center justify-center rounded-full border transition-all',
                                isSuperAdmin ? 'opacity-50 cursor-not-allowed' : '',
                                allowed
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/30'
                                  : 'border-surface-200 bg-surface-50 text-surface-400 dark:border-surface-700 dark:bg-surface-800'
                              )}
                              aria-label={`${allowed ? 'Disable' : 'Enable'} ${perm.key} for ${role.name}`}
                            >
                              {allowed ? <Check size={15} /> : <X size={15} />}
                            </button>
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={createRoleOpen} onClose={() => setCreateRoleOpen(false)} title="Create Custom Role">
        <form onSubmit={handleCreateRole} className="p-5 space-y-4">
          <div>
            <label className="label">Role Name</label>
            <input required value={newRoleForm.name} onChange={e => setNewRoleForm(prev => ({ ...prev, name: e.target.value }))} className="input" placeholder="e.g. HR Manager" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={newRoleForm.description} onChange={e => setNewRoleForm(prev => ({ ...prev, description: e.target.value }))} className="input" placeholder="Role description..." />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setCreateRoleOpen(false)} className="btn-secondary btn-md">Cancel</button>
            <button type="submit" className="btn-primary btn-md">Create Role</button>
          </div>
        </form>
      </Modal>

      <Modal open={createPermOpen} onClose={() => setCreatePermOpen(false)} title="Create Custom Permission">
        <form onSubmit={handleCreatePermission} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Module Category</label>
              <input required value={newPermForm.module} onChange={e => setNewPermForm(prev => ({ ...prev, module: e.target.value }))} className="input" placeholder="e.g. Custom, HRMS" />
            </div>
            <div>
              <label className="label">Unique Key</label>
              <input required pattern="^[a-z0-9_]+\.[a-z0-9_.]+$" value={newPermForm.key} onChange={e => setNewPermForm(prev => ({ ...prev, key: e.target.value }))} className="input font-mono text-xs" placeholder="e.g. hrms.approve_leave" />
              <p className="text-[10px] text-surface-400 mt-1">Must be lowercase with dots (module.action)</p>
            </div>
          </div>
          <div>
            <label className="label">Display Label</label>
            <input required value={newPermForm.label} onChange={e => setNewPermForm(prev => ({ ...prev, label: e.target.value }))} className="input" placeholder="e.g. Approve Leaves" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={newPermForm.description} onChange={e => setNewPermForm(prev => ({ ...prev, description: e.target.value }))} className="input" placeholder="What does this permission allow?" />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setCreatePermOpen(false)} className="btn-secondary btn-md">Cancel</button>
            <button type="submit" className="btn-primary btn-md">Create Permission</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ─── Billing Admin ────────────────────────────────────────────────────────────
export const AdminBillingPage: React.FC = () => {
  const PLANS = [
    {
      name: 'Free', price: '$0', period: 'forever', color: '#8896b8',
      features: ['Up to 3 projects', '5 members', '1GB storage', 'Basic analytics'],
      current: false,
    },
    {
      name: 'Pro', price: '$12', period: 'per seat/month', color: '#3366ff',
      features: ['Unlimited projects', '50 members', '50GB storage', 'Advanced analytics', 'Priority support'],
      current: true,
    },
    {
      name: 'Enterprise', price: 'Custom', period: 'contact sales', color: '#7c3aed',
      features: ['Unlimited everything', 'SSO/SAML', 'Custom roles', 'SLA guarantee', 'Dedicated support'],
      current: false,
    },
  ];

  const INVOICES = [
    { id: 'INV-001', date: '2025-01-01', amount: '$288.00', status: 'paid' },
    { id: 'INV-002', date: '2024-12-01', amount: '$288.00', status: 'paid' },
    { id: 'INV-003', date: '2024-11-01', amount: '$264.00', status: 'paid' },
    { id: 'INV-004', date: '2024-10-01', amount: '$264.00', status: 'paid' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><CreditCard size={24} /> Billing</h1>
        <p className="page-subtitle">Manage your subscription and payment methods</p>
      </div>

      {/* Current plan banner */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-brand-600 to-brand-800 border-0 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* <div>
            <p className="text-brand-200 text-sm mb-1">Current plan</p>
            <h2 className="font-display font-bold text-2xl">Pro Plan</h2>
            <p className="text-brand-200 text-sm mt-1">24 seats · Renews Feb 1, 2025</p>
          </div> */}
          <div className="text-right">
            <p className="font-display font-bold text-3xl">$288</p>
            <p className="text-brand-200 text-sm">/month</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className="bg-white text-brand-700 btn btn-sm px-4 font-semibold rounded-xl hover:bg-brand-50">Upgrade to Enterprise</button>
          <button className="btn-ghost text-white hover:bg-white/10 btn-sm">Manage seats</button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map(plan => (
          <motion.div key={plan.name} whileHover={{ y: -2 }} className={cn('card p-5 relative', plan.current && 'ring-2 ring-brand-500')}>
            {plan.current && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 badge-blue text-[10px] font-bold uppercase tracking-wider">
                Current Plan
              </span>
            )}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${plan.color}18` }}>
              <Zap size={18} style={{ color: plan.color }} />
            </div>
            <h3 className="font-display font-bold text-surface-900 dark:text-white">{plan.name}</h3>
            <div className="my-2">
              <span className="font-display font-bold text-2xl text-surface-900 dark:text-white">{plan.price}</span>
              <span className="text-xs text-surface-400 ml-1">{plan.period}</span>
            </div>
            <div className="space-y-2 mb-4">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                  <CheckCircle size={13} style={{ color: plan.color }} className="flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <button
              className={cn('w-full btn btn-sm rounded-xl', plan.current ? 'btn-secondary opacity-60 cursor-default' : 'btn-primary')}
              style={!plan.current ? { backgroundColor: plan.color } : {}}
              disabled={plan.current}
            >
              {plan.current ? 'Current' : 'Switch'}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Invoices */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-4">
          <h3 className="font-display font-semibold text-surface-900 dark:text-white">Invoice History</h3>
          <button className="btn-secondary btn-sm text-xs">Download all</button>
        </div>
        <Table
          columns={[
            { key: 'id', header: 'Invoice #', render: inv => <span className="font-mono text-xs text-surface-600 dark:text-surface-400">{inv.id}</span> },
            { key: 'date', header: 'Date', render: inv => <span className="text-sm text-surface-600 dark:text-surface-400">{formatDate(inv.date)}</span> },
            { key: 'amount', header: 'Amount', render: inv => <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">{inv.amount}</span> },
            {
              key: 'status', header: 'Status',
              render: inv => <span className={cn('badge text-xs', inv.status === 'paid' ? 'badge-green' : 'badge-amber')}>{inv.status}</span>
            },
            {
              key: 'download', header: '', align: 'right',
              render: () => <button className="btn-ghost btn-sm text-xs text-brand-600">Download PDF</button>
            },
          ]}
          data={INVOICES}
          keyExtractor={inv => inv.id}
        />
      </div>
    </div>
  );
};
