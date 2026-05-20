import { getTenantModels } from '../config/tenantDb.js';
import mongoose from 'mongoose';

/**
 * Calculate performance metrics for a specific user
 */
export async function getUserPerformanceMetrics({ companyId, workspaceId, userId, days = 30 }) {
  const { Task, TimeLog, User } = await getTenantModels(companyId);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [tasks, logs] = await Promise.all([
    Task.find({
      tenantId: companyId,
      workspaceId,
      assigneeIds: userId,
      updatedAt: { $gte: startDate }
    }).lean(),
    TimeLog.find({
      tenantId: companyId,
      workspaceId,
      userId,
      startTime: { $gte: startDate }
    }).lean()
  ]);

  const completedTasks = tasks.filter(t => t.status === 'done');
  const delayedTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date());
  
  // 1. Efficiency Calculation (Actual vs Estimated)
  let totalEstimated = 0;
  let totalLogged = 0;
  completedTasks.forEach(t => {
    if (t.estimatedHours) {
      totalEstimated += t.estimatedHours;
      // Find logs for this specific task
      const taskLogs = logs.filter(l => String(l.taskId) === String(t._id));
      const taskTotalMinutes = taskLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
      totalLogged += (taskTotalMinutes / 60);
    }
  });

  const efficiency = totalLogged > 0 ? Math.min(100, Math.round((totalEstimated / totalLogged) * 100)) : 0;

  // 2. Reliability (On-time rate)
  const onTimeTasks = completedTasks.filter(t => {
    if (!t.dueDate || !t.endDate) return true;
    return new Date(t.endDate) <= new Date(t.dueDate);
  });
  const reliability = tasks.length > 0 ? Math.round((onTimeTasks.length / tasks.length) * 100) : 0;

  // 3. Productivity Score (Weighted Average)
  // 40% Volume, 30% Efficiency, 30% Reliability
  const volumeScore = Math.min(100, (completedTasks.length / (days / 2)) * 100); // Expecting 1 task every 2 days for 100 score
  const productivityScore = Math.round((volumeScore * 0.4) + (efficiency * 0.3) + (reliability * 0.3));

  return {
    summary: {
      productivityScore,
      efficiency,
      reliability,
      tasksCompleted: completedTasks.length,
      tasksActive: tasks.length - completedTasks.length,
      tasksDelayed: delayedTasks.length
    },
    trends: {
      completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) : 0,
      totalHoursLogged: logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0) / 60
    }
  };
}

/**
 * Calculate team-wide performance metrics
 */
export async function getTeamPerformanceMetrics({ companyId, workspaceId, teamId, days = 30 }) {
  const { Team, User, Task } = await getTenantModels(companyId);
  
  const team = await Team.findOne({ _id: teamId, tenantId: companyId, workspaceId });
  if (!team) throw new Error('Team not found');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [memberMetrics, uniqueTasks] = await Promise.all([
    Promise.all(
      team.members.map(memberId => 
        getUserPerformanceMetrics({ companyId, workspaceId, userId: memberId, days })
          .catch(() => null)
      )
    ),
    Task.find({
      tenantId: companyId,
      workspaceId,
      assigneeIds: { $in: team.members },
      updatedAt: { $gte: startDate }
    }).lean()
  ]);

  const validMetrics = memberMetrics.filter(m => m !== null);
  
  // Aggregate
  const teamProductivity = validMetrics.length > 0 
    ? Math.round(validMetrics.reduce((sum, m) => sum + m.summary.productivityScore, 0) / validMetrics.length)
    : 0;

  const teamEfficiency = validMetrics.length > 0
    ? Math.round(validMetrics.reduce((sum, m) => sum + m.summary.efficiency, 0) / validMetrics.length)
    : 0;

  const completedUniqueTasks = uniqueTasks.filter(t => t.status === 'done' || t.status === 'completed');
  const delayedUniqueTasks = uniqueTasks.filter(t => t.status !== 'done' && t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date());
  const activeUniqueTasks = uniqueTasks.filter(t => t.status !== 'done' && t.status !== 'completed' && (!t.dueDate || new Date(t.dueDate) >= new Date()));

  return {
    teamId,
    teamName: team.name,
    memberCount: team.members.length,
    metrics: {
      productivityScore: teamProductivity,
      efficiency: teamEfficiency,
      avgReliability: validMetrics.length > 0 
        ? Math.round(validMetrics.reduce((sum, m) => sum + m.summary.reliability, 0) / validMetrics.length)
        : 0,
      totalTasks: uniqueTasks.length,
      completedTasks: completedUniqueTasks.length,
      activeTasks: activeUniqueTasks.length,
      delayedTasks: delayedUniqueTasks.length
    },
    memberBreakdown: team.members.map((id, idx) => ({
      userId: id,
      metrics: validMetrics[idx]?.summary || null
    }))
  };
}


/**
 * Calculate performance metrics for the entire workspace (all teams)
 */
export async function getWorkspacePerformanceMetrics({ companyId, workspaceId, days = 30 }) {
  const { Team } = await getTenantModels(companyId);
  const teams = await Team.find({ tenantId: companyId, workspaceId }).lean();

  const teamMetrics = await Promise.all(
    teams.map(team => 
      getTeamPerformanceMetrics({ companyId, workspaceId, teamId: team._id, days })
        .catch(() => null)
    )
  );

  const validMetrics = teamMetrics.filter(m => m !== null);

  return {
    workspaceId,
    teamCount: teams.length,
    overallProductivity: validMetrics.length > 0
      ? Math.round(validMetrics.reduce((sum, m) => sum + m.metrics.productivityScore, 0) / validMetrics.length)
      : 0,
    teams: validMetrics.map(m => ({
      teamId: m.teamId,
      teamName: m.teamName,
      productivityScore: m.metrics.productivityScore,
      efficiency: m.metrics.efficiency,
      reliability: m.metrics.avgReliability
    }))
  };
}

/**
 * Get projects and teams for selection flow
 */
export async function getDiscoveryData({ companyId, workspaceId }) {
  const { Project, Team } = await getTenantModels(companyId);
  
  const [projects, teams] = await Promise.all([
    Project.find({ tenantId: companyId, workspaceId }).select('name color members').lean(),
    Team.find({ tenantId: companyId, workspaceId }).select('name color members linkedProjectId projectIds leaderId').lean()
  ]);

  return {
    projects: projects.map(p => ({
      id: String(p._id),
      name: p.name,
      color: p.color,
      memberCount: p.members?.length || 0
    })),
    teams: teams.map(t => ({
      id: String(t._id),
      name: t.name,
      color: t.color,
      linkedProjectId: t.linkedProjectId ? String(t.linkedProjectId) : null,
      projectIds: (t.projectIds || []).map(pid => String(pid)),
      memberCount: t.members?.length || 0
    }))
  };
}


