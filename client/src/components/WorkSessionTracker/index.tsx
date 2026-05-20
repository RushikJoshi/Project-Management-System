import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock, LogOut, XCircle, Paperclip, Calendar, FileText, X, Image as ImageIcon } from 'lucide-react';
import { Modal } from '../Modal';
import { cn } from '../../utils/helpers';
import { emitErrorToast, emitSuccessToast } from '../../context/toastBus';
import { useAuthStore } from '../../context/authStore';
import { useAppStore } from '../../context/appStore';
import { workSessionsService, tasksService } from '../../services/api';

type PendingTask = { id: string; title: string; status: string; dueDate?: string };
type Summary = {
  session: null | {
    id: string;
    loginTime: string;
    logoutTime?: string;
    totalHours?: number;
    productivityScore?: number;
    status: 'Active' | 'Completed';
  };
  tasksAssigned: number;
  tasksCompleted: number;
  tasksPending: number;
  pendingTasks: PendingTask[];
};

type TaskReason = {
  mode?: 'reason' | 'extension' | 'complete';
  reason: string;
  blockerType?: 'Client' | 'Technical' | 'Dependency' | 'Other';
  expectedCompletion?: string;
  files?: File[];
};

const blockerTypes = ['Client', 'Technical', 'Dependency', 'Other'] as const;

function formatTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function toDatetimeLocal(date = new Date(Date.now() + 24 * 60 * 60 * 1000)) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function reasonErrors(reason: TaskReason) {
  const errors: Record<string, string> = {};
  
  if (reason.mode === 'complete') {
    if (!reason.reason.trim()) errors.reason = 'Completion remark is required.';
  } else if (reason.mode === 'reason') {
    if (!reason.reason.trim()) errors.reason = 'Reason is required.';
    else if (reason.reason.trim().length < 20) errors.reason = 'Use at least 20 characters.';
  } else if (reason.mode === 'extension') {
    if (!reason.reason.trim()) errors.reason = 'Reason is required.';
    if (!reason.expectedCompletion) errors.expectedCompletion = 'Expected completion is required.';
    else if (new Date(reason.expectedCompletion) <= new Date()) errors.expectedCompletion = 'Choose a future date and time.';
  }
  
  return errors;
}

function PendingTaskModal({
  open,
  tasks,
  sessionId,
  onClose,
  onLoggedOut,
}: {
  open: boolean;
  tasks: PendingTask[];
  sessionId: string;
  onClose: () => void;
  onLoggedOut: () => void;
}) {
  const navigate = useNavigate();
  const [reasons, setReasons] = useState<Record<string, TaskReason>>({});
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      const defaults = Object.fromEntries(tasks.map((task) => [task.id, {
        reason: '',
        blockerType: 'Other',
        expectedCompletion: toDatetimeLocal(),
      }]));
      setReasons(defaults as Record<string, TaskReason>);
      setTouched(false);
    }
  }, [open, tasks]);

  const selectedForEveryTask = tasks.every((task) => reasons[task.id]?.mode);
  const allValid = selectedForEveryTask && tasks.every((task) => {
    const item = reasons[task.id];
    return item?.mode && Object.keys(reasonErrors(item)).length === 0;
  });

  const update = (taskId: string, updates: Partial<TaskReason>) => {
    setReasons((current) => ({ ...current, [taskId]: { ...current[taskId], ...updates } }));
  };

  const submit = async (mode: 'submit_reason' | 'request_extension') => {
    setTouched(true);
    if (!allValid || submitting) return;
    try {
      setSubmitting(true);
      
      // Process 'complete' tasks first
      for (const task of tasks) {
        const item = reasons[task.id];
        if (item.mode === 'complete') {
          // 1. Move status to in_review
          await tasksService.move(task.id, 'in_review');
          
          // 2. Add comment/remark
          await tasksService.addComment(task.id, { content: `Completion Remark: ${item.reason.trim()}` });
          
          // 3. Upload files if any
          if (item.files && item.files.length > 0) {
            await tasksService.uploadAttachments(task.id, item.files);
          }
          
          emitSuccessToast(`Task "${task.title}" submitted for review.`);
        }
      }
      
      // Filter out 'complete' tasks for the logout API
      const payloadTasks = tasks
        .filter((task) => reasons[task.id].mode !== 'complete')
        .map((task) => {
          const item = reasons[task.id];
          return {
            taskId: task.id,
            reason: item.reason.trim(),
            blockerType: item.blockerType || 'Other',
            expectedCompletion: item.expectedCompletion ? new Date(item.expectedCompletion).toISOString() : new Date().toISOString(),
          };
        });
        
      const response = await workSessionsService.logout({
        sessionId,
        option: payloadTasks.length === 0 ? 'direct' : mode,
        data: { tasks: payloadTasks },
      });
      
      if (response.data?.data?.blocked) {
        emitSuccessToast('Extension request sent for manager approval.');
        onClose();
      } else {
        emitSuccessToast('Work session completed.');
        onLoggedOut();
      }
    } catch (error: any) {
      emitErrorToast(error?.response?.data?.error?.message || 'Unable to complete logout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pending Tasks Before Logout" size="xl" showClose={true}>
      <div className="p-5 space-y-5">
        <div className="overflow-x-auto rounded-xl border border-surface-100 dark:border-surface-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 dark:bg-surface-800 text-surface-500 uppercase tracking-widest">
              <tr>
                <th className="px-3 py-2">Task Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-3 py-2 font-semibold text-surface-900 dark:text-white">{task.title}</td>
                  <td className="px-3 py-2 text-surface-500">{task.status.replace('_', ' ')}</td>
                  <td className="px-3 py-2 text-surface-500">{task.dueDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          {tasks.map((task) => {
            const item = reasons[task.id] || { reason: '', blockerType: 'Other', expectedCompletion: toDatetimeLocal() };
            const errors = reasonErrors(item);
            return (
              <div key={task.id} className="rounded-xl border border-surface-100 p-4 dark:border-surface-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-surface-900 dark:text-white">{task.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={cn('btn-secondary btn-sm', item.mode === 'complete' && 'border-brand-500 text-brand-600')} onClick={() => update(task.id, { mode: 'complete' })}>
                      Complete Now
                    </button>
                    <button type="button" className={cn('btn-secondary btn-sm', item.mode === 'reason' && 'border-brand-500 text-brand-600')} onClick={() => update(task.id, { mode: 'reason' })}>
                      Add Reason
                    </button>
                    <button type="button" className={cn('btn-secondary btn-sm', item.mode === 'extension' && 'border-brand-500 text-brand-600')} onClick={() => update(task.id, { mode: 'extension' })}>
                      Request Extension
                    </button>
                  </div>
                </div>

                {item.mode === 'complete' && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Completion Remark</label>
                      <textarea
                        className="input mt-1 min-h-[88px] w-full resize-none"
                        value={item.reason}
                        onChange={(e) => update(task.id, { reason: e.target.value })}
                        placeholder={`Describe what you did for "${task.title}"...`}
                      />
                      {touched && errors.reason && <p className="mt-1 text-xs text-rose-500">{errors.reason}</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-surface-400 block mb-1">Deliverables / Proof (Optional)</label>
                      <input
                        type="file"
                        multiple
                        id={`file-${task.id}`}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            update(task.id, { files: [...(item.files || []), ...Array.from(e.target.files)] });
                          }
                        }}
                      />
                      {item.files && item.files.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                          {item.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-xl border border-surface-100 bg-surface-50 dark:border-surface-800 dark:bg-surface-950/50 group/file">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-surface-900 flex items-center justify-center text-surface-400 shadow-sm border border-surface-100 dark:border-surface-800">
                                {file.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-surface-700 dark:text-surface-200 truncate">{file.name}</p>
                                <p className="text-[10px] text-surface-400">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => update(task.id, { files: item.files?.filter((_, i) => i !== idx) })}
                                className="p-1 px-2 text-surface-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          onClick={() => document.getElementById(`file-${task.id}`)?.click()}
                          className="border-2 border-dashed border-surface-100 dark:border-surface-800 rounded-xl py-4 flex flex-col items-center justify-center cursor-pointer hover:border-brand-200 dark:hover:border-brand-900/40 hover:bg-brand-50/10 transition-all group"
                        >
                          <Paperclip size={16} className="text-surface-300 group-hover:text-brand-400 transition-colors mb-1" />
                          <p className="text-xs text-surface-400">Upload any files or screenshots as proof</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {item.mode === 'reason' && (
                  <div className="mt-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Reason</label>
                    <textarea
                      className="input mt-1 min-h-[88px] w-full resize-none"
                      value={item.reason}
                      onChange={(e) => update(task.id, { reason: e.target.value })}
                      placeholder="Explain why this task is pending..."
                    />
                    {touched && errors.reason && <p className="mt-1 text-xs text-rose-500">{errors.reason}</p>}
                  </div>
                )}

                {item.mode === 'extension' && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Reason for Extension</label>
                      <textarea
                        className="input mt-1 min-h-[88px] w-full resize-none"
                        value={item.reason}
                        onChange={(e) => update(task.id, { reason: e.target.value })}
                        placeholder="Explain why you need more time..."
                      />
                      {touched && errors.reason && <p className="mt-1 text-xs text-rose-500">{errors.reason}</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-surface-400">New Requested Due Date</label>
                      <input type="date" min={new Date().toISOString().split('T')[0]} className="input mt-1 w-full" value={item.expectedCompletion ? item.expectedCompletion.split('T')[0] : ''} onChange={(e) => update(task.id, { expectedCompletion: e.target.value })} />
                      {touched && errors.expectedCompletion && <p className="mt-1 text-xs text-rose-500">{errors.expectedCompletion}</p>}
                    </div>
                  </div>
                )}

                {touched && !item.mode && <p className="mt-2 text-xs text-rose-500">Select one option for this task.</p>}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-surface-100 pt-4 sm:flex-row sm:justify-end dark:border-surface-800">
          <button type="button" className="btn-secondary btn-md" disabled={submitting} onClick={() => submit('request_extension')}>
            {submitting ? 'Submitting...' : 'Submit Extension Request'}
          </button>
          <button type="button" className="btn-primary btn-md" disabled={submitting} onClick={() => submit('submit_reason')}>
            {submitting ? 'Logging out...' : 'Submit Reasons & Logout'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function TodayWorkSummaryCard() {
  const { logout } = useAuthStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [tick, setTick] = useState(0);

  const load = () => workSessionsService.getMySummary()
    .then((res) => setSummary(res.data?.data))
    .catch(() => setSummary(null));

  useEffect(() => {
    void load();
    const interval = setInterval(() => setTick((v) => v + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const activeHours = useMemo(() => {
    void tick;
    if (!summary?.session?.loginTime) return '0h 00m';
    const end = summary.session.logoutTime ? new Date(summary.session.logoutTime) : new Date();
    const ms = Math.max(0, end.getTime() - new Date(summary.session.loginTime).getTime());
    const hours = Math.floor(ms / 36e5);
    const minutes = Math.floor((ms % 36e5) / 60000);
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }, [summary?.session?.loginTime, summary?.session?.logoutTime, tick]);

  const handleLogout = async () => {
    if (!summary?.session?.id) {
      logout();
      return;
    }
    try {
      setLoading(true);
      const res = await workSessionsService.checkPendingTasks();
      const pending = res.data?.data?.pendingTasks || [];
      if (!pending.length) {
        await workSessionsService.logout({ sessionId: summary.session.id, option: 'direct' });
        emitSuccessToast('Work session completed.');
        logout();
        return;
      }
      setPendingTasks(pending);
      setModalOpen(true);
    } catch (error: any) {
      emitErrorToast(error?.response?.data?.error?.message || 'Unable to check pending tasks.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="card p-5 bg-white/80 dark:bg-surface-900/80">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-surface-400">Today Work Summary</p>
            <h3 className="mt-1 font-display text-lg font-bold text-surface-900 dark:text-white">{activeHours}</h3>
          </div>
          <button className="btn-danger btn-sm" onClick={handleLogout} disabled={loading}>
            <LogOut size={14} />
            {loading ? 'Checking...' : 'Logout'}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800/60">
            <p className="text-[10px] text-surface-400">Login</p>
            <p className="text-sm font-bold text-surface-900 dark:text-white">{formatTime(summary?.session?.loginTime)}</p>
          </div>
          <div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800/60">
            <p className="text-[10px] text-surface-400">Assigned</p>
            <p className="text-sm font-bold text-surface-900 dark:text-white">{summary?.tasksAssigned ?? 0}</p>
          </div>
          <div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800/60">
            <p className="text-[10px] text-surface-400">Completed</p>
            <p className="text-sm font-bold text-emerald-600">{summary?.tasksCompleted ?? 0}</p>
          </div>
          <div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800/60">
            <p className="text-[10px] text-surface-400">Pending</p>
            <p className="text-sm font-bold text-amber-600">{summary?.tasksPending ?? 0}</p>
          </div>
        </div>
        {summary?.session?.status === 'Completed' && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm dark:bg-brand-950/30">
            <span className="font-semibold text-brand-700 dark:text-brand-300">Productivity Score</span>
            <span className="font-black text-brand-700 dark:text-brand-300">{summary.session.productivityScore ?? 0}%</span>
          </div>
        )}
      </div>
      <PendingTaskModal
        open={modalOpen}
        tasks={pendingTasks}
        sessionId={summary?.session?.id || ''}
        onClose={() => setModalOpen(false)}
        onLoggedOut={() => logout()}
      />
    </>
  );
}

export function WorkLogoutButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { logout } = useAuthStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    workSessionsService.getMySummary()
      .then((res) => setSummary(res.data?.data))
      .catch(() => setSummary(null));
  }, []);

  const handleLogout = async () => {
    if (!summary?.session?.id) {
      logout();
      return;
    }
    try {
      setLoading(true);
      const res = await workSessionsService.checkPendingTasks();
      const pending = res.data?.data?.pendingTasks || [];
      if (!pending.length) {
        await workSessionsService.logout({ sessionId: summary.session.id, option: 'direct' });
        emitSuccessToast('Work session completed.');
        logout();
        return;
      }
      setPendingTasks(pending);
      setModalOpen(true);
    } catch (error: any) {
      emitErrorToast(error?.response?.data?.error?.message || 'Unable to check pending tasks.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" onClick={handleLogout} disabled={loading} className={className}>
        {children}
      </button>
      <PendingTaskModal
        open={modalOpen}
        tasks={pendingTasks}
        sessionId={summary?.session?.id || ''}
        onClose={() => setModalOpen(false)}
        onLoggedOut={() => logout()}
      />
    </>
  );
}

export function ManagerWorkSessionSection() {
  const { users } = useAppStore();
  const [date, setDate] = useState(todayKey());
  const [department, setDepartment] = useState('');
  const [pending, setPending] = useState<any[]>([]);
  const [productivity, setProductivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const filteredProductivity = useMemo(() => {
    return productivity.filter((p) => {
      const u = users.find((user) => user.id === p.employeeId);
      return u?.userType !== 'client';
    });
  }, [productivity, users]);

  const departments = Array.from(new Set(users.map((u) => u.department).filter(Boolean)));
  const pendingCountByEmployee = useMemo(() => pending.reduce<Record<string, number>>((acc, row) => {
    acc[row.employeeId] = (acc[row.employeeId] || 0) + 1;
    return acc;
  }, {}), [pending]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { date, department: department || undefined };
      const [pendingRes, productivityRes] = await Promise.all([
        workSessionsService.getPendingLogoutReports(params),
        workSessionsService.getTeamProductivity(params),
      ]);
      setPending(pendingRes.data?.data || []);
      setProductivity(productivityRes.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [date, department]);

  const review = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !comment.trim()) {
      emitErrorToast('Comment is required when rejecting.');
      return;
    }
    await workSessionsService.reviewExtension(id, { action, comment });
    emitSuccessToast(action === 'approve' ? 'Extension approved.' : 'Extension rejected.');
    setRejectingId(null);
    setComment('');
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display font-semibold text-surface-900 dark:text-white">Logged Out with Pending Tasks Today</h3>
          <div className="flex gap-2">
            <input type="date" className="input h-9" value={date} onChange={(e) => setDate(e.target.value)} />
            <select className="input h-9" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-surface-400">
              <tr><th className="py-2">Employee</th><th># Pending</th><th>Blocker Type</th><th>Expected By</th><th>Reason</th></tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {pending.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 font-semibold">{row.employee}</td>
                  <td>{pendingCountByEmployee[row.employeeId] || 1}</td>
                  <td>{row.blockerType}</td>
                  <td>{row.expectedCompletion ? new Date(row.expectedCompletion).toLocaleString() : '-'}</td>
                  <td className="max-w-sm truncate">{row.reason}</td>
                </tr>
              ))}
              {!pending.length && <tr><td colSpan={5} className="py-8 text-center text-surface-400">{loading ? 'Loading...' : 'No pending logout records.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 font-display font-semibold text-surface-900 dark:text-white">Extension Approval Panel</h3>
        <div className="space-y-3">
          {pending.filter((row) => row.extensionRequested && row.managerApproved === null).map((row) => (
            <div key={row.id} className="rounded-xl border border-surface-100 p-3 dark:border-surface-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold">{row.employee} - {row.taskId?.title || 'Task'}</p>
                  <p className="mt-1 text-xs text-surface-500">{row.reason}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm text-emerald-600" onClick={() => review(row.id, 'approve')}><CheckCircle2 size={14} /> Approve</button>
                  <button className="btn-secondary btn-sm text-rose-600" onClick={() => setRejectingId(row.id)}><XCircle size={14} /> Reject</button>
                </div>
              </div>
              {rejectingId === row.id && (
                <div className="mt-3 flex gap-2">
                  <input className="input flex-1" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Rejection comment" />
                  <button className="btn-danger btn-sm" onClick={() => review(row.id, 'reject')}>Send</button>
                </div>
              )}
            </div>
          ))}
          {!pending.some((row) => row.extensionRequested && row.managerApproved === null) && <p className="text-sm text-surface-400">No extension requests awaiting review.</p>}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-surface-900 dark:text-white"><BarChart3 size={18} /> Team Productivity Overview</h3>
        <div className="mb-5 space-y-2">
          {filteredProductivity.map((row) => (
            <div key={row.employeeId} className="grid grid-cols-[140px_1fr_52px] items-center gap-3 text-xs">
              <span className="truncate font-semibold">{row.employee}</span>
              <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800">
                <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(100, row.score || 0)}%` }} />
              </div>
              <span className="text-right font-bold">{row.score}%</span>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-surface-400">
              <tr><th className="py-2">Employee</th><th>Login</th><th>Logout</th><th>Hours</th><th>Score</th><th>Tasks Done/Total</th></tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredProductivity.map((row) => (
                <tr key={row.employeeId}>
                  <td className="py-3 font-semibold">{row.employee}</td>
                  <td>{formatTime(row.loginTime)}</td>
                  <td>{formatTime(row.logoutTime)}</td>
                  <td>{row.hours}</td>
                  <td>{row.score}%</td>
                  <td>{row.tasksCompleted}/{row.tasksAssigned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
