import { getTenantModels } from '../config/tenantDb.js';

export async function getStats({ companyId, clientId }) {
  const { Project, Task, Ticket } = await getTenantModels(companyId);

  const projectsCount = await Project.countDocuments({ tenantId: companyId, clientId, visibleToClient: true });
  
  const clientProjects = await Project.find({ tenantId: companyId, clientId, visibleToClient: true }).select('_id').lean();
  const projectIds = clientProjects.map(p => p._id);

  const tasksCount = await Task.countDocuments({ tenantId: companyId, projectId: { $in: projectIds } });
  const requestsCount = await Ticket.countDocuments({ tenantId: companyId, projectId: { $in: projectIds } });

  return {
    projectsCount,
    tasksCount,
    requestsCount,
    filesCount: 0
  };
}

export async function getProjects({ companyId, clientId }) {
  const { Project } = await getTenantModels(companyId);
  return await Project.find({ tenantId: companyId, clientId, visibleToClient: true }).lean();
}

export async function getActivity({ companyId, clientId }) {
  const { ActivityLog, Project } = await getTenantModels(companyId);
  
  const clientProjects = await Project.find({ tenantId: companyId, clientId, visibleToClient: true }).select('_id').lean();
  const projectIds = clientProjects.map(p => p._id);

  return await ActivityLog.find({
    tenantId: companyId,
    $or: [
      { projectId: { $in: projectIds } },
      { entityType: 'project', entityId: { $in: projectIds } }
    ]
  }).sort({ createdAt: -1 }).limit(10).lean();
}
