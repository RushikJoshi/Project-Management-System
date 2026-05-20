import mongoose from 'mongoose';
import { getTenantModels } from '../config/tenantDb.js';
import { listTasks, buildTaskVisibilityFilter, getAccessibleProjectIds, buildVisibilityQuery } from '../services/task.service.js';

export async function getOverview(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId, role } = req.auth;
    const { Task, QuickTask, Team, Project } = await getTenantModels(companyId);

    if (!companyId || !workspaceId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const visibilityQuery = await buildVisibilityQuery({ tenantId: companyId, workspaceId, userId, role, userType: req.auth.userType, clientId: req.auth.clientId });

    // Fetch tasks that are in progress across all projects
    const tasks = await Task.find({
      tenantId: companyId,
      workspaceId,
      status: 'in_progress',
      $or: [{ parentTaskId: null }, { parentTaskId: { $exists: false } }],
      ...visibilityQuery
    })
    .sort({ createdAt: -1 })
    .populate('assigneeIds', 'name avatar')
    .populate('projectId', 'name')
    .limit(10)
    .lean();

    const merged = tasks.map((t) => ({
      id: t._id,
      title: t.title,
      assignedTo: t.assigneeIds?.[0]?.name || 'Unassigned',
      assigneeAvatar: t.assigneeIds?.[0]?.avatar || '',
      projectId: t.projectId?._id || t.projectId || null,
      projectName: t.projectId?.name || '-',
      type: 'project',
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
    }));

    return res.status(200).json({ success: true, data: merged.slice(0, 7) });
  } catch (err) {
    next(err);
  }
}

export async function getAllTasks(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId, role } = req.auth;
    const { Task, QuickTask, PersonalTask, Team, Project } = await getTenantModels(companyId);

    if (!companyId || !workspaceId) {
      return res.status(200).json({ success: true, data: { projectTasks: [], quickTasks: [], personalTasks: [] } });
    }

    const uid = new mongoose.Types.ObjectId(userId);
    const tid = new mongoose.Types.ObjectId(companyId);
    const wid = new mongoose.Types.ObjectId(workspaceId);

    const visibilityQuery = await buildVisibilityQuery({ tenantId: tid, workspaceId: wid, userId: uid, role, userType: req.auth.userType, clientId: req.auth.clientId });
    const taskFilter = {
      tenantId: tid,
      workspaceId: wid,
      ...visibilityQuery
    };

    console.log(`[AllTasksController] Fetching tasks with visibility filter:`, JSON.stringify(taskFilter, null, 2));

    const tasks = await Task.find(taskFilter)
      .select('title status priority dueDate estimatedHours projectId assigneeIds reporterId createdAt parentTaskId')
      .populate('assigneeIds', 'name avatar')
      .populate('reporterId', 'name avatar')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const qtFilter = {
      tenantId: tid,
      workspaceId: wid,
      ...visibilityQuery
    };

    const quickTasks = await QuickTask.find(qtFilter)
      .select('title status priority dueDate estimatedHours assigneeIds reporterId createdAt')
      .populate('assigneeIds', 'name avatar')
      .populate('reporterId', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[AllTasksController] Found ${quickTasks.length} quick tasks.`);

    const personalTasks = await PersonalTask.find({ userId: uid })
      .select('title status priority dueDate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const mappedTasks = tasks.map(t => ({
      id: String(t._id),
      title: t.title,
      assignedTo: t.assigneeIds?.[0]?.name || 'Unassigned',
      assigneeAvatar: t.assigneeIds?.[0]?.avatar,
      assigneeIds: (t.assigneeIds || []).map((assignee) => String(assignee?._id || assignee)).filter(Boolean),
      reporterId: t.reporterId ? String(t.reporterId._id || t.reporterId) : undefined,
      reporterName: t.reporterId?.name,
      reporterAvatar: t.reporterId?.avatar,
      projectId: t.projectId?._id ? String(t.projectId._id) : null,
      projectName: t.projectId?.name || '-',
      type: 'project',
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours ?? undefined,
    }));

    const mappedQuickTasks = quickTasks.map(qt => ({
      id: String(qt._id),
      title: qt.title,
      assignedTo: qt.assigneeIds?.[0]?.name || 'Unassigned',
      assigneeAvatar: qt.assigneeIds?.[0]?.avatar,
      assigneeIds: (qt.assigneeIds || []).map((assignee) => String(assignee?._id || assignee)).filter(Boolean),
      reporterId: qt.reporterId ? String(qt.reporterId._id || qt.reporterId) : undefined,
      reporterName: qt.reporterId?.name,
      reporterAvatar: qt.reporterId?.avatar,
      projectId: null,
      projectName: '-',
      type: 'quick',
      status: qt.status,
      priority: qt.priority,
      dueDate: qt.dueDate,
      estimatedHours: qt.estimatedHours ?? undefined,
    }));

    const mappedPersonalTasks = personalTasks.map(pt => ({
      id: pt._id,
      title: pt.title,
      assignedTo: 'Me',
      assigneeAvatar: '',
      projectId: null,
      projectName: 'Personal',
      type: 'personal',
      status: pt.status,
      priority: pt.priority,
      dueDate: pt.dueDate
    }));

    return res.status(200).json({
      success: true,
      data: { projectTasks: mappedTasks, quickTasks: mappedQuickTasks, personalTasks: mappedPersonalTasks }
    });
  } catch (err) {
    next(err);
  }
}
