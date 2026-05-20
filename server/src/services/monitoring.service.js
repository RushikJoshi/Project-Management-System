import { getTenantModels } from '../config/tenantDb.js';
import { managerEmployeeFilter } from './workSession.service.js';
import * as WorkSessionService from './workSession.service.js';
import mongoose from 'mongoose';

export async function getPendingTasks({ companyId, workspaceId, managerId, role, employeeId, projectId }) {
  const { PendingTaskLog } = await getTenantModels(companyId);
  const allowedIds = await managerEmployeeFilter({ tenantId: companyId, workspaceId, managerId, role });
  
  const query = { tenantId: companyId, workspaceId, extensionRequested: false };
  
  if (allowedIds) query.employeeId = { $in: allowedIds };
  if (employeeId) query.employeeId = employeeId;
  
  const logs = await PendingTaskLog.find(query)
    .populate({
      path: 'taskId',
      select: 'title status dueDate projectId',
      populate: { path: 'projectId', select: 'name' }
    })
    .populate('employeeId', 'name department')
    .sort({ createdAt: -1 })
    .lean();
    
  let filtered = logs;
  if (projectId) {
    filtered = logs.filter(log => log.taskId?.projectId?._id?.toString() === projectId);
  }
    
  return filtered.map(log => ({
    id: log._id,
    employee: log.employeeId?.name || 'Unknown',
    task: log.taskId?.title || 'Unknown',
    project: log.taskId?.projectId?.name || 'Unknown',
    dueDate: log.taskId?.dueDate,
    pendingSince: log.createdAt,
    reason: log.reason,
    expectedCompletion: log.expectedCompletion,
    status: log.taskId?.status,
  }));
}

export async function getExtensions({ companyId, workspaceId, managerId, role, employeeId, status }) {
  const { PendingTaskLog } = await getTenantModels(companyId);
  const allowedIds = await managerEmployeeFilter({ tenantId: companyId, workspaceId, managerId, role });
  
  const query = { tenantId: companyId, workspaceId, extensionRequested: true };
  
  if (allowedIds) query.employeeId = { $in: allowedIds };
  if (employeeId) query.employeeId = employeeId;
  if (status !== undefined) {
    query.managerApproved = status === 'approved' ? true : status === 'rejected' ? false : null;
  }
  
  const logs = await PendingTaskLog.find(query)
    .populate('taskId', 'title dueDate')
    .populate('employeeId', 'name department')
    .sort({ createdAt: -1 })
    .lean();
    
  return logs.map(log => ({
    id: log._id,
    employee: log.employeeId?.name || 'Unknown',
    task: log.taskId?.title || 'Unknown',
    currentDue: log.taskId?.dueDate,
    requestedDue: log.expectedCompletion,
    reason: log.reason,
    requestedAt: log.createdAt,
    status: log.managerApproved === true ? 'approved' : log.managerApproved === false ? 'rejected' : 'pending',
  }));
}

export async function getCompletionRemarks({ companyId, workspaceId, managerId, role, employeeId, projectId }) {
  // We will fetch tasks that have completionReview data!
  const { Task } = await getTenantModels(companyId);
  const allowedIds = await managerEmployeeFilter({ tenantId: companyId, workspaceId, managerId, role });
  
  const query = { tenantId: companyId, workspaceId, 'completionReview.completionRemark': { $exists: true, $ne: '' } };
  
  if (allowedIds) query.assigneeIds = { $in: allowedIds };
  if (employeeId) query.assigneeIds = employeeId;
  if (projectId) query.projectId = projectId;
  
  const tasks = await Task.find(query)
    .populate('projectId', 'name')
    .populate('assigneeIds', 'name')
    .sort({ 'completionReview.submittedAt': -1 })
    .lean();
    
  return tasks.map(task => ({
    id: task._id,
    employee: task.assigneeIds?.[0]?.name || 'Unknown', // Simplification!
    task: task.title,
    project: task.projectId?.name || 'Unknown',
    completionRemark: task.completionReview?.completionRemark,
    testingStatus: task.completionReview?.testingStatus || 'N/A',
    submittedAt: task.completionReview?.submittedAt,
  }));
}

export async function getDailyLogs({ companyId, workspaceId, managerId, role, employeeId, date }) {
  const { WorkSession } = await getTenantModels(companyId);
  const allowedIds = await managerEmployeeFilter({ tenantId: companyId, workspaceId, managerId, role });
  
  const query = { tenantId: companyId, workspaceId };
  
  if (allowedIds) query.employeeId = { $in: allowedIds };
  if (employeeId) query.employeeId = employeeId;
  if (date) query.date = date;
  
  const sessions = await WorkSession.find(query)
    .populate('employeeId', 'name department')
    .sort({ date: -1, loginTime: -1 })
    .lean();
    
  return sessions.map(session => ({
    id: session._id,
    employee: session.employeeId?.name || 'Unknown',
    loginTime: session.loginTime,
    logoutTime: session.logoutTime,
    activeHours: session.totalHours,
    idleTime: session.idleHours,
    tasksCompleted: session.tasksCompleted || 0,
    tasksPending: session.tasksPending || 0,
    productivity: session.productivityScore,
  }));
}

export async function getProductivity({ companyId, workspaceId, managerId, role, department, date }) {
  // We can reuse getTeamProductivity from workSession.service!
  return WorkSessionService.getTeamProductivity({ companyId, workspaceId, managerId, role, date, department });
}

export async function getTimeline({ companyId, workspaceId, employeeId, date }) {
  const { WorkActivityLog } = await getTenantModels(companyId);
  
  const query = { tenantId: companyId, workspaceId, employeeId };
  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    query.timestamp = { $gte: start, $lte: end };
  }
  
  const logs = await WorkActivityLog.find(query)
    .populate('taskId', 'title')
    .sort({ timestamp: 1 })
    .lean();
    
  return logs.map(log => ({
    id: log._id,
    time: log.timestamp,
    activity: log.activityType,
    description: log.description,
    task: log.taskId?.title,
  }));
}
