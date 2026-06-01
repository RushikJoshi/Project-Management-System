import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock, LogOut, XCircle, Paperclip, Calendar, FileText, X, Image as ImageIcon, Users, AlertCircle, TrendingUp, Sparkles, Filter, ShieldCheck, UserCheck, ChevronRight, Search, ChevronLeft, ChevronDown } from 'lucide-react';
import { Modal } from '../Modal';
import { UserAvatar } from '../UserAvatar';
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
    else if (reason.reason.trim().length < 20) errors.reason = 'Use at least 20 characters.';
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
    if (!allValid) {
      emitErrorToast('Please select an option and complete all required fields for each pending task.');
      return;
    }
    if (submitting) return;
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

  const [prodSearch, setProdSearch] = useState('');
  const [prodPage, setProdPage] = useState(1);
  const prodItemsPerPage = 8;

  const [deptOpen, setDeptOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const calendarDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
        setDeptOpen(false);
      }
      if (calendarDropdownRef.current && !calendarDropdownRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update currentMonth if date changes
  useEffect(() => {
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d);
      }
    }
  }, [date]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startWeekDay = firstDay.getDay();
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Fill prev month days
    for (let i = startWeekDay - 1; i >= 0; i--) {
      days.push({
        day: prevTotalDays - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }
    
    // Fill current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
      });
    }
    
    // Fill next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, [currentMonth]);

  const handleDateSelect = (y: number, m: number, d: number) => {
    const paddedM = String(m + 1).padStart(2, '0');
    const paddedD = String(d).padStart(2, '0');
    setDate(`${y}-${paddedM}-${paddedD}`);
    setCalendarOpen(false);
  };

  const isDateSelected = (y: number, m: number, d: number) => {
    const paddedM = String(m + 1).padStart(2, '0');
    const paddedD = String(d).padStart(2, '0');
    return date === `${y}-${paddedM}-${paddedD}`;
  };

  useEffect(() => {
    setProdPage(1);
  }, [date, department, prodSearch]);

  const filteredProductivity = useMemo(() => {
    return productivity.filter((p) => {
      const u = users.find((user) => user.id === p.employeeId);
      return u?.userType !== 'client';
    });
  }, [productivity, users]);

  const searchedProductivity = useMemo(() => {
    if (!prodSearch.trim()) return filteredProductivity;
    return filteredProductivity.filter((p) =>
      p.employee.toLowerCase().includes(prodSearch.toLowerCase())
    );
  }, [filteredProductivity, prodSearch]);

  const paginatedProductivity = useMemo(() => {
    const start = (prodPage - 1) * prodItemsPerPage;
    return searchedProductivity.slice(start, start + prodItemsPerPage);
  }, [searchedProductivity, prodPage]);

  const totalPages = Math.ceil(searchedProductivity.length / prodItemsPerPage) || 1;

  const departments = Array.from(new Set(users.map((u) => u.department).filter(Boolean))) as string[];
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
    <div className="space-y-4">
      {/* SECTION 1: Logged Out with Pending Tasks Today */}
      <div className="card p-4 bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 shadow-sm rounded-xl">
        <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 dark:bg-brand-950/40 rounded-lg text-brand-600 dark:text-brand-400">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-surface-900 dark:text-white leading-tight">
                Logged Out with Pending Tasks Today
              </h3>
              <p className="text-[10px] text-surface-400 dark:text-surface-500">
                Employees who completed their sessions with active tasks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center" ref={calendarDropdownRef}>
              <button 
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="flex items-center gap-2 h-8 px-3 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 rounded-lg text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all shadow-sm hover:border-surface-300 dark:hover:border-surface-700 active:scale-[0.98]"
              >
                <Calendar size={13} className="text-surface-400 dark:text-surface-500" />
                <span>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </button>
              
              {calendarOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-64 p-3 rounded-2xl border border-surface-150 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-xl z-30 animate-in fade-in slide-in-from-top-1 duration-150 origin-top-right sm:origin-top-left">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-surface-900 dark:text-white">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Weekday Labels */}
                  <div className="grid grid-cols-7 gap-y-1 mb-1 text-[10px] font-bold text-center text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div key={d} className="py-0.5">{d}</div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
                    {calendarDays.map((cell, idx) => {
                      const selected = isDateSelected(cell.year, cell.month, cell.day);
                      return (
                        <button
                          key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                          type="button"
                          onClick={() => handleDateSelect(cell.year, cell.month, cell.day)}
                          className={cn(
                            "py-1 h-7 rounded-lg transition-all font-medium flex items-center justify-center",
                            cell.isCurrentMonth 
                              ? selected
                                ? "bg-brand-600 text-white font-bold shadow-sm"
                                : "text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800"
                              : "text-surface-300 dark:text-surface-600 hover:bg-surface-50/50 dark:hover:bg-surface-800/40"
                          )}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Footer Actions */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-surface-100 dark:border-surface-800">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
                        setCalendarOpen(false);
                      }}
                      className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarOpen(false)}
                      className="text-[10px] font-bold text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative flex items-center" ref={deptDropdownRef}>
              <button
                type="button"
                onClick={() => setDeptOpen(!deptOpen)}
                className="flex items-center justify-between gap-2 h-8 px-3 w-40 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 rounded-lg text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all shadow-sm hover:border-surface-300 dark:hover:border-surface-700 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2 truncate">
                  <Filter size={13} className="text-surface-400 dark:text-surface-500 flex-shrink-0" />
                  <span className="truncate">{department || 'All departments'}</span>
                </div>
                <ChevronDown size={12} className={cn("text-surface-400 dark:text-surface-500 transition-transform duration-200 flex-shrink-0", deptOpen && "rotate-180")} />
              </button>
              
              {deptOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-surface-150 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-lg py-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150 origin-top-right">
                  <button
                    type="button"
                    onClick={() => {
                      setDepartment('');
                      setDeptOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2.5 text-xs hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors font-medium flex items-center justify-between",
                      department === '' ? "text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/20" : "text-surface-700 dark:text-surface-300"
                    )}
                  >
                    All departments
                  </button>
                  {departments.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDepartment(d);
                        setDeptOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 text-xs hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors font-medium flex items-center justify-between",
                        department === d ? "text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/20" : "text-surface-700 dark:text-surface-300"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-100 dark:border-surface-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50/75 dark:bg-surface-800/40 text-[10px] uppercase tracking-wider text-surface-500 dark:text-surface-400 border-b border-surface-100 dark:border-surface-800">
              <tr>
                <th className="px-4 py-2 font-semibold">Employee</th>
                <th className="px-4 py-2 font-semibold text-center"># Pending</th>
                <th className="px-4 py-2 font-semibold">Blocker Type</th>
                <th className="px-4 py-2 font-semibold">Expected By</th>
                <th className="px-4 py-2 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {pending.map((row) => {
                const u = users.find((user) => user.id === row.employeeId);
                let badgeClass = 'badge-gray';
                if (row.blockerType === 'Client') badgeClass = 'badge-amber';
                else if (row.blockerType === 'Technical') badgeClass = 'badge-red';
                else if (row.blockerType === 'Dependency') badgeClass = 'badge-purple';
                else if (row.blockerType === 'Other') badgeClass = 'badge-gray';

                return (
                  <tr 
                    key={row.id} 
                    className="hover:bg-surface-50/40 dark:hover:bg-surface-800/20 transition-colors"
                  >
                    <td className="px-4 py-1.5 font-medium text-surface-900 dark:text-surface-100 flex items-center gap-2">
                      <UserAvatar name={row.employee} avatar={u?.avatar} color={u?.color} size="xs" className="flex-shrink-0" />
                      <span>{row.employee}</span>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                        {pendingCountByEmployee[row.employeeId] || 1}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <span className={cn(badgeClass, 'text-[10px] px-2 py-0.5 rounded-full')}>{row.blockerType || 'Other'}</span>
                    </td>
                    <td className="px-4 py-1.5 text-surface-600 dark:text-surface-400 font-medium">
                      {row.expectedCompletion ? (
                        <div className="flex flex-col leading-tight">
                          <span>{new Date(row.expectedCompletion).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          <span className="text-[9px] text-surface-400">{new Date(row.expectedCompletion).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-1.5 max-w-xs truncate text-surface-500 dark:text-surface-400" title={row.reason}>
                      {row.reason}
                    </td>
                  </tr>
                );
              })}
              {!pending.length && (
                <tr>
                  <td colSpan={5} className="py-5 text-center text-surface-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-surface-400 text-xs">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                        <span>Loading records...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-1 text-center">
                        <div className="p-2 bg-surface-50 dark:bg-surface-800/40 rounded-full text-surface-300 dark:text-surface-600 mb-1">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                        <p className="text-xs font-semibold text-surface-700 dark:text-surface-200">All caught up</p>
                        <p className="text-[10px] text-surface-400">No employees logged out with pending tasks today.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Extension Approval Panel */}
      <div className="card p-4 bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 shadow-sm rounded-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm text-surface-900 dark:text-white leading-tight">
              Extension Approval Panel
            </h3>
            <p className="text-[10px] text-surface-400 dark:text-surface-500">
              Review and approve employee requested task due date extensions
            </p>
          </div>
        </div>
        
        <div className="grid gap-2.5 sm:grid-cols-1 md:grid-cols-2">
          {pending.filter((row) => row.extensionRequested && row.managerApproved === null).map((row) => {
            const u = users.find((user) => user.id === row.employeeId);
            return (
              <div 
                key={row.id} 
                className="rounded-xl border border-surface-100 dark:border-surface-800 p-3 bg-surface-50/30 dark:bg-surface-950/20 hover:bg-surface-50/50 dark:hover:bg-surface-950/40 transition-all border-l-4 border-l-amber-500/80"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={row.employee} avatar={u?.avatar} color={u?.color} size="sm" className="flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-surface-900 dark:text-white leading-tight">
                          {row.employee}
                        </p>
                        <p className="text-[10px] text-surface-400 font-medium mt-0.5">
                          Requested for: <span className="bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded text-surface-700 dark:text-surface-300 font-semibold">{row.taskId?.title || 'Task'}</span>
                        </p>
                      </div>
                    </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-all" 
                      onClick={() => review(row.id, 'approve')}
                    >
                      <CheckCircle2 size={11} /> Approve
                    </button>
                    <button 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/30 transition-all" 
                      onClick={() => setRejectingId(row.id)}
                    >
                      <XCircle size={11} /> Reject
                    </button>
                  </div>
                </div>

                <div className="bg-surface-50 dark:bg-surface-900/60 p-2 rounded-lg border border-surface-100 dark:border-surface-800 text-[10px] text-surface-600 dark:text-surface-400 italic">
                  &ldquo;{row.reason}&rdquo;
                </div>

                {rejectingId === row.id && (
                  <div className="mt-1 flex gap-1.5 animate-fadeIn">
                    <input 
                      className="input h-8 text-xs flex-1 border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-900 dark:focus:border-rose-700" 
                      value={comment} 
                      onChange={(e) => setComment(e.target.value)} 
                      placeholder="Enter rejection comment..." 
                      autoFocus
                    />
                    <button 
                      className="btn-danger h-8 px-2.5 rounded-lg text-xs" 
                      onClick={() => review(row.id, 'reject')}
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>
          )})}
          {!pending.some((row) => row.extensionRequested && row.managerApproved === null) && (
            <div className="col-span-full border border-dashed border-surface-200 dark:border-surface-800 rounded-xl p-2.5 bg-surface-50/20 dark:bg-surface-950/10 flex items-center justify-center gap-2">
              <UserCheck size={14} className="text-emerald-500/70" />
              <p className="text-[11px] font-medium text-surface-500 dark:text-surface-400">
                No extension requests awaiting review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Team Productivity Overview */}
      <div className="card p-4 bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 shadow-sm rounded-xl">
        <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 dark:bg-brand-950/40 rounded-lg text-brand-600 dark:text-brand-400">
              <BarChart3 size={16} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-surface-900 dark:text-white leading-tight">
                Team Productivity Overview
              </h3>
              <p className="text-[10px] text-surface-400 dark:text-surface-500">
                Real-time daily productivity metrics and work-hour summaries
              </p>
            </div>
          </div>
          
          {/* Integrated search filter */}
          <div className="relative flex items-center max-w-xs w-full sm:w-64">
            <Search size={13} className="absolute left-2.5 text-surface-400 pointer-events-none" />
            <input 
              type="text" 
              className="input h-8 pl-8 pr-2.5 text-xs w-full bg-surface-50/50 hover:bg-surface-50 dark:bg-surface-800 dark:hover:bg-surface-700" 
              placeholder="Search team member..." 
              value={prodSearch} 
              onChange={(e) => setProdSearch(e.target.value)} 
            />
          </div>
        </div>

        {/* Space optimized Grid Layout instead of raw full-width lines */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {paginatedProductivity.map((row) => {
            const u = users.find((user) => user.id === row.employeeId);
            const score = row.score || 0;
            let barColor = 'bg-brand-600';
            let textColor = 'text-brand-700 dark:text-brand-400';
            let bgLight = 'bg-brand-50 dark:bg-brand-950/30';
            
            if (score >= 80) {
              barColor = 'bg-emerald-500';
              textColor = 'text-emerald-700 dark:text-emerald-400';
              bgLight = 'bg-emerald-50 dark:bg-emerald-950/30';
            } else if (score < 50) {
              barColor = 'bg-amber-500';
              textColor = 'text-amber-700 dark:text-amber-400';
              bgLight = 'bg-amber-50 dark:bg-amber-950/30';
            }

            return (
              <div 
                key={row.employeeId} 
                className="flex items-center justify-between p-2.5 rounded-xl border border-surface-100 dark:border-surface-800 shadow-sm bg-surface-50/20 dark:bg-surface-950/10"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <UserAvatar name={row.employee} avatar={u?.avatar} color={u?.color} size="sm" className="flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-surface-900 dark:text-white truncate">
                      {row.employee}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 flex-1 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-300", barColor)} style={{ width: `${Math.min(100, score)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-black text-center flex-shrink-0", bgLight, textColor)}>
                  {score}%
                </div>
              </div>
            );
          })}
          {!paginatedProductivity.length && (
            <div className="col-span-full py-2 text-center text-[11px] text-surface-400">
              No productivity records found.
            </div>
          )}
        </div>

        {/* Detailed Table Grid */}
        <div className="overflow-x-auto rounded-xl border border-surface-100 dark:border-surface-800 max-h-56 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-surface-50 dark:bg-surface-800/90 backdrop-blur-sm text-[10px] uppercase tracking-wider text-surface-500 dark:text-surface-400 border-b border-surface-100 dark:border-surface-800 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-2 font-semibold">Employee</th>
                <th className="px-4 py-2 font-semibold">Login</th>
                <th className="px-4 py-2 font-semibold">Logout</th>
                <th className="px-4 py-2 font-semibold">Hours</th>
                <th className="px-4 py-2 font-semibold text-center">Score</th>
                <th className="px-4 py-2 font-semibold text-center">Tasks (Done/Total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {paginatedProductivity.map((row) => {
                const u = users.find((user) => user.id === row.employeeId);
                const isActive = row.loginTime && !row.logoutTime;
                return (
                  <tr 
                    key={row.employeeId} 
                    className="hover:bg-surface-50/40 dark:hover:bg-surface-800/20 transition-colors"
                  >
                    <td className="px-4 py-1.5 font-medium text-surface-900 dark:text-surface-100 flex items-center gap-2">
                      <UserAvatar name={row.employee} avatar={u?.avatar} color={u?.color} size="xs" className="flex-shrink-0" />
                      <span>{row.employee}</span>
                    </td>
                    <td className="px-4 py-1.5 text-surface-600 dark:text-surface-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                        )}
                        <span>{formatTime(row.loginTime)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-surface-600 dark:text-surface-400">{formatTime(row.logoutTime)}</td>
                    <td className="px-4 py-1.5 text-surface-600 dark:text-surface-400 font-semibold">{row.hours ?? 0}h</td>
                    <td className="px-4 py-1.5 text-center font-bold">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px]",
                        (row.score || 0) >= 80 ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30" :
                        (row.score || 0) < 50 ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30" :
                        "text-brand-700 bg-brand-50 dark:text-brand-400 dark:bg-brand-950/30"
                      )}>
                        {row.score ?? 0}%
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-center font-medium">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-[10px] text-surface-700 dark:text-surface-300">
                        <CheckCircle2 size={10} className="text-surface-400" />
                        <span>{row.tasksCompleted ?? 0}/{row.tasksAssigned ?? 0}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!paginatedProductivity.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-surface-400">
                    No productivity records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Space optimized Pagination controls */}
        {searchedProductivity.length > prodItemsPerPage && (
          <div className="mt-4 flex items-center justify-between border-t border-surface-100 dark:border-surface-800 pt-3 text-[11px]">
            <div className="text-surface-400">
              Showing <span className="font-semibold text-surface-700 dark:text-surface-300">{(prodPage - 1) * prodItemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-surface-700 dark:text-surface-300">
                {Math.min(searchedProductivity.length, prodPage * prodItemsPerPage)}
              </span>{' '}
              of <span className="font-semibold text-surface-700 dark:text-surface-300">{searchedProductivity.length}</span> members
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                onClick={() => setProdPage((p) => Math.max(1, p - 1))}
                disabled={prodPage === 1}
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-surface-500 dark:text-surface-400 px-1 font-medium">
                Page {prodPage} of {totalPages}
              </span>
              <button
                type="button"
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                onClick={() => setProdPage((p) => Math.min(totalPages, p + 1))}
                disabled={prodPage === totalPages}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
