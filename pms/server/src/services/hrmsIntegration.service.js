import AuthLookup from '../models/AuthLookup.js';
import Company from '../models/Company.js';
import { getTenantModels } from '../config/tenantDb.js';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function toPlain(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

function dateValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function mapProject(project, workspaceRole, taskCount) {
  const data = toPlain(project);
  return {
    id: String(data.id || data._id),
    name: data.name,
    status: data.status,
    color: data.color,
    department: data.department || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    progress: typeof data.progress === 'number' ? data.progress : 0,
    tasksCount: typeof taskCount === 'number' ? taskCount : 0,
    workspaceRole,
  };
}

function mapTask(task, projectMap) {
  const data = toPlain(task);
  const projectId = String(data.projectId || '');
  const project = projectMap.get(projectId) || null;
  return {
    id: String(data.id || data._id),
    title: data.title,
    status: data.status,
    priority: data.priority,
    type: data.type || data.timelineType || 'task',
    startDate: data.startDate || null,
    dueDate: data.dueDate || null,
    durationMinutes: typeof data.duration === 'number' ? data.duration : null,
    estimatedHours: typeof data.estimatedHours === 'number' ? data.estimatedHours : null,
    project: project
      ? {
          id: project.id,
          name: project.name,
          status: project.status,
        }
      : null,
  };
}

function mapQuickTask(task) {
  const data = toPlain(task);
  return {
    id: String(data.id || data._id),
    title: data.title,
    status: data.status,
    priority: data.priority,
    dueDate: data.dueDate || null,
    isPrivate: Boolean(data.isPrivate),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export async function getHrmsDashboardByEmail({ email, includeCompleted = false, limit = 50 }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const err = new Error('Email is required.');
    err.statusCode = 400;
    err.code = 'EMAIL_REQUIRED';
    throw err;
  }

  const authLookup = await AuthLookup.findOne({ email: normalizedEmail }).select('tenantId').lean();
  if (!authLookup?.tenantId) {
    const err = new Error('No user mapping found for this email.');
    err.statusCode = 404;
    err.code = 'HRMS_USER_NOT_FOUND';
    throw err;
  }

  const companyId = authLookup.tenantId;
  const company = await Company.findById(companyId).select('name email organizationId status color').lean();
  const { User, Membership, Workspace, Task, QuickTask, Project } = await getTenantModels(companyId);

  const user = await User.findOne({ tenantId: companyId, email: normalizedEmail, isActive: true });
  if (!user) {
    const err = new Error('User is not active or does not exist in tenant data.');
    err.statusCode = 404;
    err.code = 'HRMS_ACTIVE_USER_NOT_FOUND';
    throw err;
  }

  const memberships = await Membership.find({
    tenantId: companyId,
    userId: user._id,
    status: 'active',
  }).sort({ createdAt: 1 });

  const workspaceIds = memberships.map((membership) => membership.workspaceId);
  const workspaces = await Workspace.find({
    tenantId: companyId,
    _id: { $in: workspaceIds },
  });

  const workspaceMap = new Map(workspaces.map((workspace) => [String(workspace._id), toPlain(workspace)]));
  const membershipRoleByWorkspaceId = new Map(
    memberships.map((membership) => [String(membership.workspaceId), membership.role])
  );

  const taskFilter = {
    tenantId: companyId,
    workspaceId: { $in: workspaceIds },
    assigneeIds: user._id,
    $or: [{ parentTaskId: null }, { parentTaskId: { $exists: false } }],
  };
  const pendingTaskFilter = { ...taskFilter, status: { $ne: 'done' } };
  const visibleTaskFilter = includeCompleted ? taskFilter : pendingTaskFilter;

  const quickTaskFilter = {
    tenantId: companyId,
    workspaceId: { $in: workspaceIds },
    assigneeIds: user._id,
  };
  const pendingQuickTaskFilter = { ...quickTaskFilter, status: { $ne: 'done' } };
  const visibleQuickTaskFilter = includeCompleted ? quickTaskFilter : pendingQuickTaskFilter;

  const projectFilter = {
    tenantId: companyId,
    workspaceId: { $in: workspaceIds },
    $or: [
      { ownerId: user._id },
      { members: user._id },
      { reportingPersonIds: user._id },
    ],
  };
  if (!includeCompleted) {
    projectFilter.status = { $nin: ['completed', 'archived'] };
  }

  const [
    tasks,
    quickTasks,
    baseProjects,
    totalTasksCount,
    totalQuickTasksCount,
    pendingProjectTasksCount,
    pendingQuickTasksCount,
  ] = await Promise.all([
    Task.find(visibleTaskFilter).sort({ dueDate: 1, updatedAt: -1 }).limit(limit),
    QuickTask.find(visibleQuickTaskFilter).sort({ dueDate: 1, updatedAt: -1 }).limit(limit),
    Project.find(projectFilter).sort({ updatedAt: -1 }),
    Task.countDocuments(taskFilter),
    QuickTask.countDocuments(quickTaskFilter),
    Task.countDocuments(pendingTaskFilter),
    QuickTask.countDocuments(pendingQuickTaskFilter),
  ]);

  const taskProjectIds = Array.from(
    new Set(tasks.map((task) => String(task.projectId || '')).filter(Boolean))
  );
  const memberProjectIds = Array.from(
    new Set(baseProjects.map((project) => String(project._id)))
  );
  const allProjectIds = Array.from(new Set([...taskProjectIds, ...memberProjectIds]));

  const projects = allProjectIds.length
    ? await Project.find({
        tenantId: companyId,
        _id: { $in: allProjectIds },
      }).sort({ updatedAt: -1 })
    : [];

  const projectMap = new Map(projects.map((project) => [String(project._id), toPlain(project)]));
  const taskCountByProjectId = new Map();
  for (const task of tasks) {
    const projectId = String(task.projectId || '');
    if (!projectId) continue;
    taskCountByProjectId.set(projectId, (taskCountByProjectId.get(projectId) || 0) + 1);
  }

  const workspacePayload = memberships.map((membership) => {
    const workspaceId = String(membership.workspaceId);
    const workspace = workspaceMap.get(workspaceId);
    const workspaceTasks = tasks
      .filter((task) => String(task.workspaceId) === workspaceId)
      .sort((a, b) => dateValue(a.dueDate) - dateValue(b.dueDate))
      .map((task) => mapTask(task, projectMap));
    const workspaceQuickTasks = quickTasks
      .filter((task) => String(task.workspaceId) === workspaceId)
      .sort((a, b) => dateValue(a.dueDate) - dateValue(b.dueDate))
      .map(mapQuickTask);
    const workspaceProjects = projects
      .filter((project) => String(project.workspaceId) === workspaceId)
      .map((project) => mapProject(project, membershipRoleByWorkspaceId.get(workspaceId) || membership.role, taskCountByProjectId.get(String(project._id)) || 0));

    return {
      id: workspaceId,
      name: workspace?.name || 'Workspace',
      slug: workspace?.slug || null,
      role: membership.role,
      tasks: workspaceTasks,
      quickTasks: workspaceQuickTasks,
      projects: workspaceProjects,
      summary: {
        tasksCount: workspaceTasks.length,
        quickTasksCount: workspaceQuickTasks.length,
        projectsCount: workspaceProjects.length,
      },
    };
  });

  return {
    company: company
      ? {
          id: String(company._id),
          name: company.name,
          organizationId: company.organizationId,
          status: company.status,
          color: company.color || null,
        }
      : null,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle || null,
      department: user.department || null,
      avatar: user.avatar || null,
      employeeId: user.employeeId || null,
    },
    summary: {
      workspacesCount: workspacePayload.length,
      totalTasks: totalTasksCount,
      totalQuickTasks: totalQuickTasksCount,
      pendingTasks: pendingProjectTasksCount + pendingQuickTasksCount,
      pendingProjectTasks: pendingProjectTasksCount,
      pendingQuickTasks: pendingQuickTasksCount,
      assignedProjects: projects.length,
      visibleTasks: tasks.length,
      visibleQuickTasks: quickTasks.length,
    },
    workspaces: workspacePayload,
  };
}
