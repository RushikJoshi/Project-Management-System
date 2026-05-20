import mongoose from 'mongoose';
import { getTenantModels } from '../config/tenantDb.js';

function uniqueIds(values = []) {
  return Array.from(
    new Set(
      values
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => String(value))
    )
  );
}

async function syncTeamProjects({ Team, Project, tenantId, workspaceId, teamId, projectIds }) {
  await Team.updateMany(
    { tenantId, workspaceId, _id: { $ne: teamId } },
    { $pull: { projectIds: { $in: projectIds } } }
  );

  await Project.updateMany(
    { tenantId, workspaceId, teamId, _id: { $nin: projectIds } },
    { $set: { teamId: null } }
  );

  if (projectIds.length) {
    await Project.updateMany(
      { tenantId, workspaceId, _id: { $in: projectIds } },
      { $set: { teamId } }
    );
  }
}

export async function syncTeamStats({ companyId, workspaceId, teamId }) {
  const { Team, Project, Task } = await getTenantModels(companyId);
  const team = await Team.findOne({ _id: teamId, tenantId: companyId, workspaceId });
  if (!team) return null;

  // If it's an auto-created team for a project, we sync based on that project
  if (team.linkedProjectId) {
    const taskFilter = {
      tenantId: companyId,
      workspaceId,
      projectId: team.linkedProjectId,
      $or: [{ parentTaskId: null }, { parentTaskId: { $exists: false } }],
    };

    const tasks = await Task.find(taskFilter).lean();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = tasks.filter(t => t.status !== 'done').length;
    
    // Check for overdue (assuming isDueDateOverdue helper logic or similar)
    const now = new Date();
    const overdue = tasks.filter(t => 
      t.status !== 'done' && 
      t.dueDate && 
      new Date(t.dueDate) < now
    ).length;

    team.totalTasks = total;
    team.completedTasks = completed;
    team.pendingTasks = pending;
    team.overdueTasks = overdue;
    team.completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    await team.save();
  }

  return team;
}

export async function ensureAutoTeamForProject({ companyId, workspaceId, userId, projectId }) {
  const { Team, Project, ActivityLog } = await getTenantModels(companyId);
  const project = await Project.findOne({ _id: projectId, tenantId: companyId, workspaceId });
  if (!project) return null;

  let team = await Team.findOne({ linkedProjectId: projectId, tenantId: companyId, workspaceId });
  
  const teamName = `${project.name.replace(/\s+(Project|System|Management)$/i, '')} Team`;
  const teamCode = `TEAM-${project.name.substring(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const leaderId = project.leadId || project.ownerId || userId;

  if (!team) {
    const teamData = {
      tenantId: new mongoose.Types.ObjectId(companyId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      name: teamName,
      teamCode,
      autoCreated: true,
      linkedProjectId: new mongoose.Types.ObjectId(projectId),
      linkedProjectCode: project.projectCode,
      leaderId: new mongoose.Types.ObjectId(leaderId),
      leaderIds: [new mongoose.Types.ObjectId(leaderId)],
      members: project.members && project.members.length > 0 ? project.members : [new mongoose.Types.ObjectId(leaderId)],
      projectIds: [new mongoose.Types.ObjectId(projectId)],
      color: project.color || '#3366ff',
      departmentId: project.department,
      branchId: project.branchId,
      createdBy: new mongoose.Types.ObjectId(userId),
      status: 'active'
    };
    
    team = await Team.create(teamData);

    // Ensure project has leadId if it's missing (to pass validation)
    if (!project.leadId) {
      project.leadId = project.ownerId || userId;
    }

    project.linkedTeamId = team._id;
    project.teamId = team._id;
    await project.save();

    await ActivityLog.create({
      tenantId: companyId,
      workspaceId,
      userId,
      type: 'team_created',
      description: `Auto-created team "${team.name}" for project "${project.name}"`,
      entityType: 'team',
      entityId: team._id,
      metadata: { projectId: project._id },
    });
  } else {
    // Sync members and lead if needed
    let changed = false;
    
    // Only update leader if project has a valid leadId and it's different
    if (project.leadId && String(team.leaderId) !== String(project.leadId)) {
      team.leaderId = project.leadId;
      team.leaderIds = [project.leadId];
      changed = true;
    }
    
    const pMembers = (project.members || []).map(String);
    const tMembers = (team.members || []).map(String);
    if (pMembers.length !== tMembers.length || !pMembers.every(m => tMembers.includes(m))) {
      team.members = project.members;
      changed = true;
    }

    if (changed) {
      await team.save();
    }
  }

  await syncTeamStats({ companyId, workspaceId, teamId: team._id });
  return team;
}

export async function listTeams({ companyId, workspaceId }) {
  const { Team } = await getTenantModels(companyId);
  return await Team.find({ tenantId: companyId, workspaceId }).sort({ createdAt: -1 });
}

export async function getTeamStatsDashboard({ companyId, workspaceId }) {
  const { Team } = await getTenantModels(companyId);
  const teams = await Team.find({ tenantId: companyId, workspaceId }).lean();
  
  const totalTeams = teams.length;
  const totalMembers = Array.from(new Set(teams.flatMap(t => t.members.map(String)))).length;
  const totalLeads = Array.from(new Set(teams.flatMap(t => t.leaderIds.map(String)))).length;
  const linkedProjects = teams.filter(t => t.linkedProjectId).length;
  const avgCompletion = totalTeams > 0 
    ? Math.round(teams.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / totalTeams) 
    : 0;

  return {
    totalTeams,
    totalLeads,
    totalMembers,
    linkedProjects,
    avgCompletion
  };
}

export async function createTeam({ companyId, workspaceId, userId, data }) {
  const { Team, Project, ActivityLog } = await getTenantModels(companyId);
  const leaderIds = uniqueIds(Array.isArray(data.leaderIds) ? data.leaderIds : [data.leaderId || userId]);
  const projectIds = uniqueIds(Array.isArray(data.projectIds) ? data.projectIds : []);
  const members = Array.from(new Set([
    ...(Array.isArray(data.members) ? data.members : []),
    ...leaderIds,
    String(userId),
  ].filter(Boolean).map(String)));

  const team = await Team.create({
    tenantId: companyId,
    workspaceId,
    name: data.name,
    teamCode: data.teamCode || `TEAM-${data.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`,
    description: data.description,
    leaderId: leaderIds[0] || userId,
    leaderIds,
    members,
    projectIds,
    color: data.color || '#3366ff',
    createdBy: userId,
    status: 'active'
  });

  await syncTeamProjects({ Team, Project, tenantId: companyId, workspaceId, teamId: team._id, projectIds });
  await syncTeamStats({ companyId, workspaceId, teamId: team._id });

  return team;
}

export async function updateTeam({ companyId, workspaceId, userId, teamId, updates }) {
  const { Team, Project, ActivityLog } = await getTenantModels(companyId);
  const team = await Team.findOne({ _id: teamId, tenantId: companyId, workspaceId });
  if (!team) return null;

  if (updates.name !== undefined) team.name = updates.name;
  if (updates.description !== undefined) team.description = updates.description;
  if (updates.color !== undefined) team.color = updates.color;
  if (updates.status !== undefined) team.status = updates.status;

  if (updates.leaderIds !== undefined || updates.leaderId !== undefined) {
    const leaderIds = uniqueIds(Array.isArray(updates.leaderIds) ? updates.leaderIds : [updates.leaderId]);
    team.leaderId = leaderIds[0] || team.leaderId;
    team.leaderIds = leaderIds;
  }

  if (updates.members !== undefined) {
    team.members = uniqueIds(updates.members);
  }

  if (updates.projectIds !== undefined) {
    const projectIds = uniqueIds(updates.projectIds);
    team.projectIds = projectIds;
    await syncTeamProjects({ Team, Project, tenantId: companyId, workspaceId, teamId: team._id, projectIds });
  }

  await team.save();
  await syncTeamStats({ companyId, workspaceId, teamId: team._id });
  return team;
}

export async function deleteTeam({ companyId, workspaceId, userId, teamId }) {
  const { Team, Project } = await getTenantModels(companyId);
  const team = await Team.findOne({ _id: teamId, tenantId: companyId, workspaceId });
  if (!team) return null;

  await Project.updateMany({ tenantId: companyId, workspaceId, teamId: team._id }, { $set: { teamId: null, linkedTeamId: null } });
  await Team.deleteOne({ _id: team._id });
  return team;
}

export async function getTeamWorkload({ companyId, workspaceId, teamId }) {
  const { Team, Task, User, TimeLog } = await getTenantModels(companyId);
  const team = await Team.findOne({ _id: teamId, tenantId: companyId, workspaceId });
  if (!team) throw new Error('Team not found');

  const members = await User.find({ _id: { $in: team.members } }, 'name email avatar role').lean();
  
  // Calculate workload per member
  const workload = [];
  
  for (const member of members) {
    const tasks = await Task.find({
      tenantId: companyId,
      workspaceId,
      assigneeIds: member._id,
      status: { $nin: ['done', 'archived'] }
    }).lean();

    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    
    // Calculate logged hours for active tasks
    const taskIds = tasks.map(t => t._id);
    const logs = await TimeLog.aggregate([
      { $match: { taskId: { $in: taskIds }, userId: member._id, endTime: { $exists: true } } },
      { $group: { _id: null, totalMinutes: { $sum: '$durationMinutes' } } }
    ]);
    const loggedHours = logs.length > 0 ? (logs[0].totalMinutes / 60) : 0;
    
    // Assume 40 hours a week capacity
    const weeklyCapacityHours = 40;
    const capacityPercentage = Math.round((totalEstimated / weeklyCapacityHours) * 100);

    workload.push({
      member,
      assignedTasksCount: tasks.length,
      totalEstimatedHours: totalEstimated,
      loggedHours,
      weeklyCapacityHours,
      capacityPercentage,
      status: capacityPercentage > 100 ? 'overloaded' : (capacityPercentage > 80 ? 'at_capacity' : 'available')
    });
  }

  return workload;
}


