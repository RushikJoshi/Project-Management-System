import { getTenantModels } from '../config/tenantDb.js';

export async function startTimer({ companyId, workspaceId, userId, taskId }) {
  const { TimeLog, Task } = await getTenantModels(companyId);

  // Check if there's already an active timer
  const activeTimer = await TimeLog.findOne({
    tenantId: companyId,
    workspaceId,
    userId,
    endTime: { $exists: false }
  });

  if (activeTimer) {
    const err = new Error('You already have an active timer running');
    err.statusCode = 400;
    throw err;
  }

  const task = await Task.findOne({ _id: taskId, tenantId: companyId, workspaceId });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  // Record the log
  const newLog = await TimeLog.create({
    tenantId: companyId,
    workspaceId,
    taskId,
    userId,
    teamId: task.teamId || null,
    startTime: new Date(),
    type: 'timer'
  });

  return newLog;
}

export async function stopTimer({ companyId, workspaceId, userId, taskId }) {
  const { TimeLog, Task } = await getTenantModels(companyId);

  const activeTimer = await TimeLog.findOne({
    tenantId: companyId,
    workspaceId,
    taskId,
    userId,
    endTime: { $exists: false }
  });

  if (!activeTimer) {
    const err = new Error('No active timer found for this task');
    err.statusCode = 400;
    throw err;
  }

  activeTimer.endTime = new Date();
  activeTimer.durationMinutes = Math.round((activeTimer.endTime.getTime() - activeTimer.startTime.getTime()) / 60000);
  
  // Mark overtime if duration exceeds expected hours (basic logic for now)
  const task = await Task.findOne({ _id: taskId });
  if (task && task.estimatedHours) {
    const totalLogged = await TimeLog.aggregate([
      { $match: { taskId: task._id, endTime: { $exists: true } } },
      { $group: { _id: null, total: { $sum: '$durationMinutes' } } }
    ]);
    const totalMinutes = (totalLogged[0]?.total || 0) + activeTimer.durationMinutes;
    if (totalMinutes > task.estimatedHours * 60) {
      activeTimer.isOvertime = true;
    }
  }

  await activeTimer.save();
  return activeTimer;
}

export async function addManualTime({ companyId, workspaceId, userId, taskId, durationMinutes, notes }) {
  const { TimeLog, Task } = await getTenantModels(companyId);

  const task = await Task.findOne({ _id: taskId, tenantId: companyId, workspaceId });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - durationMinutes * 60000);

  const newLog = await TimeLog.create({
    tenantId: companyId,
    workspaceId,
    taskId,
    userId,
    teamId: task.teamId || null,
    startTime,
    endTime,
    durationMinutes,
    type: 'manual',
    notes
  });

  return newLog;
}

export async function getActiveTimer({ companyId, workspaceId, userId }) {
  const { TimeLog } = await getTenantModels(companyId);
  return await TimeLog.findOne({
    tenantId: companyId,
    workspaceId,
    userId,
    endTime: { $exists: false }
  }).populate('taskId', 'title projectId teamId');
}

export async function getTaskTimeLogs({ companyId, workspaceId, taskId }) {
  const { TimeLog, User } = await getTenantModels(companyId);
  
  const logs = await TimeLog.find({
    tenantId: companyId,
    workspaceId,
    taskId
  }).sort({ startTime: -1 }).lean();

  const userIds = Array.from(new Set(logs.map(l => String(l.userId))));
  const users = await User.find({ _id: { $in: userIds } }, 'name email avatar').lean();
  const userMap = users.reduce((acc, u) => ({ ...acc, [u._id]: u }), {});

  return logs.map(log => ({
    ...log,
    user: userMap[log.userId] || null
  }));
}
