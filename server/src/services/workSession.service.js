import mongoose from 'mongoose';
import Company from '../models/Company.js';
import { getTenantModels } from '../config/tenantDb.js';
import { sendMail } from './mail.service.js';

const ACTIVE_TASK_STATUSES = ['todo', 'scheduled', 'in_progress', 'in_review', 'blocked'];
const COMPLETED_TASK_STATUSES = ['done', 'completed', 'closed'];
const IDLE_MINUTES = 15;

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dayRange(dateKey = dayKey()) {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 36e5);
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function sanitizeText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, 10000);
}

function assertObjectId(value, fieldName) {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) {
    const err = new Error(`Invalid ${fieldName}`);
    err.statusCode = 400;
    err.code = `INVALID_${fieldName.toUpperCase()}`;
    throw err;
  }
  return String(value);
}

function isManagerRole(role) {
  return ['super_admin', 'admin', 'manager', 'team_leader'].includes(String(role || ''));
}

function mapTask(task) {
  return {
    id: String(task._id || task.id),
    title: task.title,
    status: task.status,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
    assigneeIds: Array.isArray(task.assigneeIds) ? task.assigneeIds.map((id) => String(id)) : [],
  };
}

async function getManagerIdsForEmployee({ tenantId, workspaceId, employeeId }) {
  const { User, Team, Project } = await getTenantModels(tenantId);
  const ids = new Set();
  const uid = new mongoose.Types.ObjectId(employeeId);

  const [admins, teams, projects] = await Promise.all([
    User.find({ tenantId, role: { $in: ['super_admin', 'admin', 'manager'] }, isActive: true }).select('_id').lean(),
    Team.find({ tenantId, workspaceId, members: uid }).select('leaderId leaderIds').lean(),
    Project.find({ tenantId, workspaceId, members: uid }).select('ownerId leadId reportingPersonIds').lean(),
  ]);

  admins.forEach((u) => ids.add(String(u._id)));
  teams.forEach((team) => {
    if (team.leaderId) ids.add(String(team.leaderId));
    (team.leaderIds || []).forEach((id) => ids.add(String(id)));
  });
  projects.forEach((project) => {
    if (project.ownerId) ids.add(String(project.ownerId));
    if (project.leadId) ids.add(String(project.leadId));
    (project.reportingPersonIds || []).forEach((id) => ids.add(String(id)));
  });

  ids.delete(String(employeeId));
  return Array.from(ids);
}

export async function managerEmployeeFilter({ tenantId, workspaceId, managerId, role }) {
  if (['super_admin', 'admin'].includes(String(role))) return null;
  const { Team, Project } = await getTenantModels(tenantId);
  const uid = String(managerId);
  const oid = new mongoose.Types.ObjectId(uid);
  const [teams, projects] = await Promise.all([
    Team.find({ tenantId, workspaceId, $or: [{ leaderId: oid }, { leaderIds: oid }] }).select('members').lean(),
    Project.find({
      tenantId,
      workspaceId,
      $or: [{ ownerId: oid }, { leadId: oid }, { reportingPersonIds: oid }],
    }).select('members').lean(),
  ]);
  return Array.from(new Set([
    ...teams.flatMap((team) => (team.members || []).map(String)),
    ...projects.flatMap((project) => (project.members || []).map(String)),
  ]));
}

export function calculateProductivityScore({ totalHours, idleHours = 0, tasksAssigned = 0, tasksCompleted = 0 }) {
  if (!totalHours || totalHours <= 0 || !tasksAssigned) return 0;
  const productiveHours = Math.max(0, totalHours - idleHours);
  const taskCompletionRate = Math.min(1, tasksCompleted / tasksAssigned);
  return round2((productiveHours / totalHours) * taskCompletionRate * 100);
}

export async function getPendingTasks({ companyId, workspaceId, employeeId, todayOnly = false }) {
  const { Task } = await getTenantModels(companyId);
  const { start, end } = dayRange();
  const dueFilter = todayOnly ? { $gte: start, $lt: end } : { $lt: end };
  const tasks = await Task.find({
    tenantId: companyId,
    workspaceId,
    assigneeIds: employeeId,
    dueDate: dueFilter,
    status: { $nin: ['done', 'completed', 'closed'] },
  }).sort({ dueDate: 1 }).lean();
  return tasks.map(mapTask);
}

export async function onEmployeeLogin({ companyId, workspaceId, userId }) {
  const { WorkSession } = await getTenantModels(companyId);
  const date = dayKey();
  const now = new Date();
  let session = await WorkSession.findOne({
    tenantId: companyId,
    workspaceId,
    employeeId: userId,
    date,
    status: 'Active',
  });

  if (!session) {
    session = await WorkSession.create({
      tenantId: companyId,
      workspaceId,
      employeeId: userId,
      date,
      loginTime: now,
      lastActivityAt: now,
      status: 'Active',
    });
  }

  const todayTasks = await getPendingTasks({ companyId, workspaceId, employeeId: userId, todayOnly: true });
  return { sessionId: String(session._id), loginTime: session.loginTime, todayTasks };
}

export async function getMySummary({ companyId, workspaceId, userId }) {
  const { WorkSession } = await getTenantModels(companyId);
  const session = await WorkSession.findOne({ tenantId: companyId, workspaceId, employeeId: userId, date: dayKey() });
  const pendingTasks = await getPendingTasks({ companyId, workspaceId, employeeId: userId, todayOnly: false });
  const { Task } = await getTenantModels(companyId);
  const { start, end } = dayRange();
  const [assigned, completed] = await Promise.all([
    Task.countDocuments({ tenantId: companyId, workspaceId, assigneeIds: userId, dueDate: { $gte: start, $lt: end } }),
    Task.countDocuments({ tenantId: companyId, workspaceId, assigneeIds: userId, status: { $in: ['done', 'completed'] }, updatedAt: { $gte: start, $lt: end } }),
  ]);

  return {
    session: session?.toJSON?.() || null,
    tasksAssigned: assigned,
    tasksCompleted: completed,
    tasksPending: pendingTasks.length,
    pendingTasks,
  };
}

export async function logActivity({ companyId, workspaceId, sessionId, employeeId, activityType, taskId, description }) {
  assertObjectId(sessionId, 'sessionId');
  const { WorkSession, WorkActivityLog } = await getTenantModels(companyId);
  const session = await WorkSession.findOne({ _id: sessionId, tenantId: companyId, workspaceId, employeeId });
  if (!session) {
    const err = new Error('Work session not found');
    err.statusCode = 404;
    err.code = 'WORK_SESSION_NOT_FOUND';
    throw err;
  }

  const now = new Date();
  if (activityType !== 'idle_start' && session.lastActivityAt && !session.idleStartedAt) {
    const idleMs = now.getTime() - new Date(session.lastActivityAt).getTime();
    if (idleMs >= IDLE_MINUTES * 60 * 1000) {
      session.idleStartedAt = new Date(new Date(session.lastActivityAt).getTime() + IDLE_MINUTES * 60 * 1000);
      await WorkActivityLog.create({
        tenantId: companyId,
        workspaceId,
        sessionId,
        employeeId,
        activityType: 'idle_start',
        description: 'Auto idle detected after 15 minutes of inactivity',
        timestamp: session.idleStartedAt,
      });
    }
  }

  if (activityType === 'idle_start') {
    session.idleStartedAt = now;
  } else if (activityType === 'idle_end' && session.idleStartedAt) {
    session.idleHours = round2((session.idleHours || 0) + hoursBetween(session.idleStartedAt, now));
    session.idleStartedAt = null;
  }

  session.lastActivityAt = now;
  await session.save();

  const log = await WorkActivityLog.create({
    tenantId: companyId,
    workspaceId,
    sessionId,
    employeeId,
    activityType,
    taskId: taskId && mongoose.Types.ObjectId.isValid(String(taskId)) ? taskId : null,
    description: sanitizeText(description),
    timestamp: now,
  });
  return log;
}

async function completeSession({ companyId, workspaceId, employeeId, sessionId, forcedLogoutTime = null }) {
  const { WorkSession, Task } = await getTenantModels(companyId);
  const session = await WorkSession.findOne({ _id: sessionId, tenantId: companyId, workspaceId, employeeId });
  if (!session) {
    const err = new Error('Work session not found');
    err.statusCode = 404;
    err.code = 'WORK_SESSION_NOT_FOUND';
    throw err;
  }

  const logoutTime = forcedLogoutTime || new Date();
  if (session.idleStartedAt) {
    session.idleHours = round2((session.idleHours || 0) + hoursBetween(session.idleStartedAt, logoutTime));
    session.idleStartedAt = null;
  }

  const { start, end } = dayRange(session.date);
  const [tasksAssigned, tasksCompleted] = await Promise.all([
    Task.countDocuments({ tenantId: companyId, workspaceId, assigneeIds: employeeId, dueDate: { $gte: start, $lt: end } }),
    Task.countDocuments({ tenantId: companyId, workspaceId, assigneeIds: employeeId, status: { $in: ['done', 'completed'] }, updatedAt: { $gte: start, $lt: end } }),
  ]);

  session.logoutTime = logoutTime;
  session.totalHours = round2(hoursBetween(session.loginTime, logoutTime));
  session.status = 'Completed';
  session.productivityScore = calculateProductivityScore({
    totalHours: session.totalHours,
    idleHours: session.idleHours || 0,
    tasksAssigned,
    tasksCompleted,
  });
  await session.save();
  return session;
}

export async function checkPendingTasks({ companyId, workspaceId, employeeId }) {
  const allPending = await getPendingTasks({ companyId, workspaceId, employeeId, todayOnly: false });
  
  // Filter out tasks that are already in review (submitted for completion)
  const pendingTasks = allPending.filter(task => task.status !== 'in_review');
  
  // Find tasks that have pending extension requests
  const { PendingTaskLog } = await getTenantModels(companyId);
  const logs = await PendingTaskLog.find({
    tenantId: companyId,
    workspaceId,
    employeeId,
    extensionRequested: true,
    managerApproved: null,
  }).select('taskId').lean();
  
  const extendedTaskIds = new Set(logs.map(log => String(log.taskId)));
  
  // Filter out those tasks
  const filteredPendingTasks = pendingTasks.filter(task => !extendedTaskIds.has(String(task.id)));
  
  return { hasPending: filteredPendingTasks.length > 0, pendingTasks: filteredPendingTasks };
}

export async function notifyManager({ companyId, workspaceId, employeeId, pendingTasks, logs = [] }) {
  const { Notification, User } = await getTenantModels(companyId);
  const [employee, managerIds] = await Promise.all([
    User.findById(employeeId).select('name email').lean(),
    getManagerIdsForEmployee({ tenantId: companyId, workspaceId, employeeId }),
  ]);
  if (!managerIds.length) return;

  await Notification.insertMany(managerIds.map((managerId) => ({
    tenantId: companyId,
    workspaceId,
    userId: managerId,
    type: 'work_logout_pending_tasks',
    title: 'Pending tasks at logout',
    message: `${employee?.name || 'Employee'} logged out with ${pendingTasks.length} pending task(s).`,
    relatedId: String(employeeId),
  })));

  const managers = await User.find({ _id: { $in: managerIds }, tenantId: companyId }).select('email name').lean();
  const reasonByTask = new Map(logs.map((log) => [String(log.taskId), log]));
  const rows = pendingTasks.map((task) => {
    const reason = reasonByTask.get(String(task.id));
    return `<tr><td>${task.title}</td><td>${task.status}</td><td>${task.dueDate || '-'}</td><td>${reason?.reason || '-'}</td></tr>`;
  }).join('');
  await Promise.allSettled(managers.filter((m) => m.email).map((manager) => sendMail({
    to: manager.email,
    subject: `[Action Required] ${employee?.name || 'Employee'} logged out with ${pendingTasks.length} pending task(s)`,
    html: `<p>${employee?.name || 'Employee'} logged out with pending tasks.</p><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Task Name</th><th>Status</th><th>Due Date</th><th>Reason Given</th></tr></thead><tbody>${rows}</tbody></table>`,
  }).catch((error) => ({ skipped: true, reason: error?.code || 'send_failed' }))));
}

export async function processLogout({ companyId, workspaceId, employeeId, sessionId, option, data = {} }) {
  assertObjectId(sessionId, 'sessionId');
  const { PendingTaskLog, Notification } = await getTenantModels(companyId);
  const pending = await checkPendingTasks({ companyId, workspaceId, employeeId });
  let createdLogs = [];

  if (option === 'direct' && pending.hasPending) {
    const err = new Error('Pending tasks must be completed, explained, or sent for extension before logout');
    err.statusCode = 400;
    err.code = 'PENDING_TASKS_BLOCK_LOGOUT';
    throw err;
  }

  if (option === 'request_extension') {
    const entries = Array.isArray(data.tasks) ? data.tasks : [];
    if (!entries.length) {
      const err = new Error('Extension request requires at least one task');
      err.statusCode = 400;
      throw err;
    }
    createdLogs = await PendingTaskLog.insertMany(entries.map((entry) => ({
      tenantId: companyId,
      workspaceId,
      sessionId,
      employeeId,
      taskId: assertObjectId(entry.taskId, 'taskId'),
      reason: sanitizeText(entry.reason || 'Extension requested by employee'),
      blockerType: entry.blockerType || 'Other',
      expectedCompletion: new Date(entry.expectedCompletion),
      extensionRequested: true,
      managerApproved: null,
    })));
    const managerIds = await getManagerIdsForEmployee({ tenantId: companyId, workspaceId, employeeId });
    if (managerIds.length) {
      await Notification.insertMany(managerIds.map((managerId) => ({
        tenantId: companyId,
        workspaceId,
        userId: managerId,
        type: 'work_extension_request',
        title: 'Logout extension request',
        message: `An employee requested approval for ${createdLogs.length} pending task extension(s).`,
        relatedId: String(employeeId),
      })));
    }
    return { blocked: true, pendingTasks: pending.pendingTasks, logs: createdLogs.map((log) => log.toJSON()) };
  }

  if (option === 'submit_reason') {
    const entries = Array.isArray(data.tasks) ? data.tasks : [];
    const pendingIds = new Set(pending.pendingTasks.map((task) => String(task.id)));
    const submittedIds = new Set(entries.map((entry) => String(entry.taskId)));
    const missing = Array.from(pendingIds).filter((id) => !submittedIds.has(id));
    if (missing.length) {
      const err = new Error('Reason is required for every pending task before logout');
      err.statusCode = 400;
      err.code = 'PENDING_TASK_REASON_REQUIRED';
      throw err;
    }
    createdLogs = await PendingTaskLog.insertMany(entries.map((entry) => {
      const reason = sanitizeText(entry.reason);
      const expected = new Date(entry.expectedCompletion);
      if (reason.length < 20 || Number.isNaN(expected.getTime()) || expected <= new Date()) {
        const err = new Error('Each pending task needs a reason of at least 20 characters and a future expected completion date');
        err.statusCode = 400;
        throw err;
      }
      return {
        tenantId: companyId,
        workspaceId,
        sessionId,
        employeeId,
        taskId: assertObjectId(entry.taskId, 'taskId'),
        reason,
        blockerType: entry.blockerType || 'Other',
        expectedCompletion: expected,
        extensionRequested: false,
      };
    }));
    await notifyManager({ companyId, workspaceId, employeeId, pendingTasks: pending.pendingTasks, logs: createdLogs });
  }

  if (option !== 'direct' && option !== 'submit_reason') {
    const err = new Error('Invalid logout option');
    err.statusCode = 400;
    throw err;
  }

  const session = await completeSession({ companyId, workspaceId, employeeId, sessionId });
  return { blocked: false, session: session.toJSON(), pendingTasks: pending.pendingTasks };
}

export async function listPendingLogoutReports({ companyId, workspaceId, managerId, role, date = dayKey(), department }) {
  const { PendingTaskLog, User } = await getTenantModels(companyId);
  const { start, end } = dayRange(date);
  const allowedIds = await managerEmployeeFilter({ tenantId: companyId, workspaceId, managerId, role });
  const employeeQuery = { tenantId: companyId };
  if (department) employeeQuery.department = department;
  if (allowedIds) employeeQuery._id = { $in: allowedIds };
  const employees = await User.find(employeeQuery).select('name department').lean();
  const employeeIds = employees.map((e) => e._id);
  const employeeMap = new Map(employees.map((e) => [String(e._id), e]));
  const logs = await PendingTaskLog.find({
    tenantId: companyId,
    workspaceId,
    employeeId: { $in: employeeIds },
    submittedAt: { $gte: start, $lt: end },
  }).populate('taskId', 'title status dueDate').sort({ submittedAt: -1 });
  return logs.map((log) => ({
    ...log.toJSON(),
    employee: employeeMap.get(String(log.employeeId))?.name || 'Employee',
    department: employeeMap.get(String(log.employeeId))?.department || '',
  }));
}

export async function reviewExtension({ companyId, workspaceId, managerId, role, logId, action, comment }) {
  const { PendingTaskLog, Notification } = await getTenantModels(companyId);
  const log = await PendingTaskLog.findOne({ _id: logId, tenantId: companyId, workspaceId });
  if (!log) return null;
  const allowedIds = await managerEmployeeFilter({ tenantId: companyId, workspaceId, managerId, role });
  if (allowedIds && !allowedIds.includes(String(log.employeeId))) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  log.managerApproved = action === 'approve';
  log.managerComment = sanitizeText(comment);
  log.reviewedAt = new Date();
  log.reviewedBy = managerId;
  await log.save();
  await Notification.create({
    tenantId: companyId,
    workspaceId,
    userId: log.employeeId,
    type: action === 'approve' ? 'work_extension_approved' : 'work_extension_rejected',
    title: action === 'approve' ? 'Extension approved' : 'Extension rejected',
    message: action === 'approve' ? 'Your pending task extension was approved.' : 'Extension rejected. Please submit a logout reason.',
    relatedId: String(log._id),
  });
  return log.toJSON();
}

export async function getTeamProductivity({ companyId, workspaceId, managerId, role, date = dayKey(), department }) {
  const { DailySummary, WorkSession, User } = await getTenantModels(companyId);
  const allowedIds = await managerEmployeeFilter({ tenantId: companyId, workspaceId, managerId, role });
  const employeeQuery = { tenantId: companyId };
  if (department) employeeQuery.department = department;
  if (allowedIds) employeeQuery._id = { $in: allowedIds };
  const employees = await User.find(employeeQuery).select('name department').lean();
  const ids = employees.map((e) => e._id);
  const [summaries, sessions] = await Promise.all([
    DailySummary.find({ tenantId: companyId, workspaceId, date, employeeId: { $in: ids } }).lean(),
    WorkSession.find({ tenantId: companyId, workspaceId, date, employeeId: { $in: ids } }).lean(),
  ]);
  const summaryMap = new Map(summaries.map((s) => [String(s.employeeId), s]));
  const sessionMap = new Map(sessions.map((s) => [String(s.employeeId), s]));
  return employees.map((employee) => {
    const summary = summaryMap.get(String(employee._id));
    const session = sessionMap.get(String(employee._id));
    return {
      employeeId: String(employee._id),
      employee: employee.name,
      department: employee.department || '',
      loginTime: session?.loginTime,
      logoutTime: session?.logoutTime,
      hours: round2(summary?.totalLoginHours ?? session?.totalHours ?? 0),
      score: round2(summary?.productivityScore ?? session?.productivityScore ?? 0),
      tasksCompleted: summary?.tasksCompleted || 0,
      tasksAssigned: summary?.tasksAssigned || 0,
    };
  });
}

export async function generateDailySummaryForEmployee({ companyId, workspaceId, employeeId, date = dayKey(), forcedLogoutTime = null }) {
  const { WorkSession, DailySummary, Task } = await getTenantModels(companyId);
  const session = await WorkSession.findOne({ tenantId: companyId, workspaceId, employeeId, date });
  if (session?.status === 'Active') {
    await completeSession({ companyId, workspaceId, employeeId, sessionId: session._id, forcedLogoutTime });
  }
  const fresh = await WorkSession.findOne({ tenantId: companyId, workspaceId, employeeId, date });
  const { start, end } = dayRange(date);
  const [assigned, completed, pending] = await Promise.all([
    Task.countDocuments({ tenantId: companyId, workspaceId, assigneeIds: employeeId, dueDate: { $gte: start, $lt: end } }),
    Task.countDocuments({ tenantId: companyId, workspaceId, assigneeIds: employeeId, status: { $in: ['done', 'completed'] }, updatedAt: { $gte: start, $lt: end } }),
    Task.countDocuments({ tenantId: companyId, workspaceId, assigneeIds: employeeId, dueDate: { $lt: end }, status: { $nin: COMPLETED_TASK_STATUSES } }),
  ]);
  const totalLoginHours = round2(fresh?.totalHours || 0);
  const idleHours = round2(fresh?.idleHours || 0);
  const productiveHours = round2(Math.max(0, totalLoginHours - idleHours));
  const productivityScore = fresh?.productivityScore ?? calculateProductivityScore({ totalHours: totalLoginHours, idleHours, tasksAssigned: assigned, tasksCompleted: completed });
  return DailySummary.findOneAndUpdate(
    { tenantId: companyId, workspaceId, employeeId, date },
    { $set: { totalLoginHours, productiveHours, idleHours, tasksAssigned: assigned, tasksCompleted: completed, tasksPending: pending, productivityScore, generatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

export async function runAutoLogoutReminder() {
  const companies = await Company.find({}).select('_id').lean();
  for (const company of companies) {
    const { WorkSession, User, Notification } = await getTenantModels(company._id);
    const sessions = await WorkSession.find({ status: 'Active', date: dayKey() }).lean();
    for (const session of sessions) {
      const pending = await getPendingTasks({ companyId: company._id, workspaceId: session.workspaceId, employeeId: session.employeeId, todayOnly: false });
      if (!pending.length) continue;
      const user = await User.findById(session.employeeId).select('name').lean();
      await Notification.create({
        tenantId: company._id,
        workspaceId: session.workspaceId,
        userId: session.employeeId,
        type: 'work_logout_reminder',
        title: 'Pending tasks before logout',
        message: `${user?.name || 'You'}, you still have ${pending.length} pending task(s). Please update before logout.`,
        relatedId: String(session._id),
      });
    }
  }
}

export async function runNightlyWorkSessionJob() {
  const companies = await Company.find({}).select('_id').lean();
  const date = dayKey();
  const forcedLogoutTime = new Date(`${date}T23:59:00.000Z`);
  for (const company of companies) {
    const { WorkSession, User, Notification } = await getTenantModels(company._id);
    const sessions = await WorkSession.find({ date }).lean();
    for (const session of sessions) {
      await generateDailySummaryForEmployee({
        companyId: company._id,
        workspaceId: session.workspaceId,
        employeeId: session.employeeId,
        date,
        forcedLogoutTime,
      });
    }
    if (sessions.length) {
      const managerIds = await User.find({ tenantId: company._id, role: { $in: ['super_admin', 'admin', 'manager'] } }).select('_id').lean();
      await Promise.allSettled(managerIds.map((manager) => Notification.create({
        tenantId: company._id,
        workspaceId: sessions[0].workspaceId,
        userId: manager._id,
        type: 'daily_work_digest',
        title: 'Daily work digest generated',
        message: `Daily work summaries for ${date} are ready.`,
        relatedId: date,
      }).catch(() => null)));
    }
  }
}

function shouldRunAt(now, hour, minute) {
  return now.getHours() === hour && now.getMinutes() === minute;
}

export function startWorkSessionScheduler() {
  if (process.env.DISABLE_WORK_SESSION_CRON === 'true') return;
  setInterval(() => {
    const now = new Date();
    if (shouldRunAt(now, 18, 30)) runAutoLogoutReminder().catch((error) => console.error('[work-session reminder]', error));
    if (shouldRunAt(now, 23, 59)) runNightlyWorkSessionJob().catch((error) => console.error('[work-session nightly]', error));
  }, 60 * 1000);
}
