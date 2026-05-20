import { getTenantModels } from '../config/tenantDb.js';

export async function getTeamsList({ companyId, clientId }) {
  const { Project, Team, Task } = await getTenantModels(companyId);

  // 1. Get client projects
  const clientProjects = await Project.find({
    tenantId: companyId,
    clientId,
    visibleToClient: true
  }).select('_id').lean();

  const projectIds = clientProjects.map(p => p._id);

  if (projectIds.length === 0) return [];

  // 2. Find teams linked to these projects
  const teams = await Team.find({
    tenantId: companyId,
    $or: [
      { projectIds: { $in: projectIds } },
      { linkedProjectId: { $in: projectIds } }
    ],
    status: 'active'
  }).populate('leaderId', 'name avatar color')
    .populate('leaderIds', 'name avatar color')
    .lean();

  if (teams.length === 0) return [];

  // 3. For each team, fetch task stats from the Task collection
  const teamListWithStats = await Promise.all(teams.map(async (team) => {
    const memberIds = team.members || [];
    
    // Fetch tasks assigned to these members on these projects
    const tasks = await Task.find({
      tenantId: companyId,
      projectId: { $in: projectIds },
      assigneeIds: { $in: memberIds }
    }).select('status dueDate').lean();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const pendingTasks = totalTasks - completedTasks;
    
    // Calculate progress
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate health (At Risk if any pending task is overdue)
    const now = new Date();
    const hasOverdue = tasks.some(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now);
    const health = hasOverdue ? 'At Risk' : 'On Track';

    return {
      id: team._id,
      name: team.name,
      teamCode: team.teamCode,
      leader: team.leaderId, // Populated
      memberCount: memberIds.length,
      activeTasks: pendingTasks,
      completedTasks: completedTasks,
      progress,
      health,
      status: team.status,
      currentSprint: team.activeSprint || 'N/A'
    };
  }));

  return teamListWithStats;
}

export async function getTeamsSummary({ companyId, clientId }) {
  const teamsList = await getTeamsList({ companyId, clientId });

  const totalTeams = teamsList.length;
  const completedTasks = teamsList.reduce((acc, t) => acc + t.completedTasks, 0);
  const pendingTasks = teamsList.reduce((acc, t) => acc + t.activeTasks, 0);
  const activeMembers = teamsList.reduce((acc, t) => acc + t.memberCount, 0);

  const totalTasks = completedTasks + pendingTasks;
  const overallEfficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTeams,
    activeMembers,
    completedTasks,
    pendingTasks,
    overallEfficiency
  };
}

export async function getTeamDetails({ companyId, clientId, teamId }) {
  const { Team, Task, Project } = await getTenantModels(companyId);

  // 1. Fetch team
  const team = await Team.findById(teamId)
    .populate('leaderId', 'name avatar color role')
    .populate('members', 'name avatar color role email userType')
    .lean();

  if (!team) return null;

  // 2. Fetch projects for this team that belong to the client
  const clientProjects = await Project.find({
    tenantId: companyId,
    clientId,
    visibleToClient: true
  }).select('_id name color').lean();

  const clientProjectIds = clientProjects.map(p => p._id);

  const teamProjectIds = team.projectIds || [];
  const sharedProjectIds = teamProjectIds.filter(id => clientProjectIds.some(cpId => cpId.toString() === id.toString()));

  const projects = await Project.find({
    _id: { $in: sharedProjectIds }
  }).select('name color progress status').lean();

  // 3. Fetch tasks for this team on these projects
  const tasks = await Task.find({
    tenantId: companyId,
    projectId: { $in: clientProjectIds },
    assigneeIds: { $in: team.members }
  }).select('status priority dueDate title assigneeIds').lean();

  return {
    team: {
      id: team._id,
      name: team.name,
      teamCode: team.teamCode,
      leader: team.leaderId,
      status: team.status,
      activeSprint: team.activeSprint
    },
    members: team.members.filter(m => m.userType !== 'client').map(m => {
      const memberTasks = tasks.filter(t => t.assigneeIds.some(id => id.toString() === m._id.toString()));
      const total = memberTasks.length;
      const completed = memberTasks.filter(t => t.status === 'done').length;
      return {
        id: m._id,
        name: m.name,
        role: m.role,
        avatar: m.avatar,
        color: m.color,
        email: m.email,
        currentTaskCount: total - completed,
        completedTasks: completed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        status: 'Active'
      };
    }),
    projects,
    stats: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      pendingTasks: tasks.filter(t => t.status !== 'done').length
    }
  };
}
