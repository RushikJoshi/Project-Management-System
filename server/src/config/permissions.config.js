export const PERMISSION_MODULES = {
  DASHBOARD: 'Dashboard',
  PROJECTS: 'Projects',
  TASKS: 'Tasks',
  CALENDAR: 'Calendar',
  TEAMS: 'Teams',
  REPORTS: 'Reports',
  MIS: 'MIS',
  HRMS: 'HRMS',
  CHAT: 'Chat',
  NOTIFICATIONS: 'Notifications',
  CLIENTS: 'Clients',
  SETTINGS: 'Settings',
  USERS: 'Users',
  PERMISSIONS: 'Permissions',
  FINANCE: 'Finance',
  PAYROLL: 'Payroll',
  ATTENDANCE: 'Attendance',
  RECRUITMENT: 'Recruitment',
  ASSETS: 'Assets',
  QUICK_TASKS: 'Quick Tasks',
};

export const PERMISSIONS = {
  // Tasks
  TASK_VIEW_OWN: 'task.view.own',
  TASK_VIEW_TEAM: 'task.view.team',
  TASK_VIEW_PROJECT: 'task.view.project',
  TASK_VIEW_GLOBAL: 'task.view.global',
  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_DELETE: 'task.delete',
  TASK_ASSIGN: 'task.assign',

  // Projects
  PROJECT_VIEW_OWN: 'project.view.own',
  PROJECT_VIEW_TEAM: 'project.view.team',
  PROJECT_VIEW_GLOBAL: 'project.view.global',
  PROJECT_CREATE: 'project.create',
  PROJECT_EDIT: 'project.edit',
  PROJECT_DELETE: 'project.delete',

  // Quick Tasks
  QUICK_TASK_VIEW_OWN: 'quicktask.view.own',
  QUICK_TASK_VIEW_TEAM: 'quicktask.view.team',
  QUICK_TASK_VIEW_GLOBAL: 'quicktask.view.global',
  QUICK_TASK_CREATE: 'quicktask.create',
  QUICK_TASK_UPDATE: 'quicktask.update',
  QUICK_TASK_DELETE: 'quicktask.delete',

  // Users
  USER_VIEW: 'user.view',
  USER_MANAGE: 'user.manage',

  // Reports & MIS
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',
  MIS_VIEW_OWN: 'mis.view.own',
  MIS_VIEW_TEAM: 'mis.view.team',
  MIS_VIEW_GLOBAL: 'mis.view.global',
  MIS_APPROVE: 'mis.approve',

  // Settings & Permissions
  SETTINGS_MANAGE: 'settings.manage',
  PERMISSION_MANAGE: 'permission.manage',
};

export const PERMISSION_REGISTRY = [
  {
    module: PERMISSION_MODULES.TASKS,
    permissions: [
      { key: PERMISSIONS.TASK_VIEW_OWN, label: 'View Own Tasks', description: 'View own assigned tasks' },
      { key: PERMISSIONS.TASK_VIEW_TEAM, label: 'View Team Tasks', description: 'View own and team tasks' },
      { key: PERMISSIONS.TASK_VIEW_PROJECT, label: 'View Project Tasks', description: 'View tasks under assigned projects' },
      { key: PERMISSIONS.TASK_VIEW_GLOBAL, label: 'View All Tasks (Global)', description: 'View all workspace tasks' },
      { key: PERMISSIONS.TASK_CREATE, label: 'Create Tasks', description: 'Create new tasks' },
      { key: PERMISSIONS.TASK_UPDATE, label: 'Update Tasks', description: 'Update existing tasks' },
      { key: PERMISSIONS.TASK_DELETE, label: 'Delete Tasks', description: 'Delete tasks' },
      { key: PERMISSIONS.TASK_ASSIGN, label: 'Assign Tasks', description: 'Assign tasks to others' },
    ],
  },
  {
    module: PERMISSION_MODULES.PROJECTS,
    permissions: [
      { key: PERMISSIONS.PROJECT_VIEW_OWN, label: 'View Own Projects', description: 'View assigned projects' },
      { key: PERMISSIONS.PROJECT_VIEW_TEAM, label: 'View Team Projects', description: 'View managed/team projects' },
      { key: PERMISSIONS.PROJECT_VIEW_GLOBAL, label: 'View All Projects (Global)', description: 'View all workspace projects' },
      { key: PERMISSIONS.PROJECT_CREATE, label: 'Create Projects', description: 'Create new projects' },
      { key: PERMISSIONS.PROJECT_EDIT, label: 'Edit Projects', description: 'Edit existing projects' },
      { key: PERMISSIONS.PROJECT_DELETE, label: 'Delete Projects', description: 'Delete projects' },
    ],
  },
  {
    module: PERMISSION_MODULES.QUICK_TASKS,
    permissions: [
      { key: PERMISSIONS.QUICK_TASK_VIEW_OWN, label: 'View Own Quick Tasks', description: 'View own quick tasks' },
      { key: PERMISSIONS.QUICK_TASK_VIEW_TEAM, label: 'View Team Quick Tasks', description: 'View quick tasks assigned to team members' },
      { key: PERMISSIONS.QUICK_TASK_VIEW_GLOBAL, label: 'View All Quick Tasks', description: 'View all quick tasks across the workspace' },
      { key: PERMISSIONS.QUICK_TASK_CREATE, label: 'Create Quick Tasks', description: 'Create new quick tasks' },
      { key: PERMISSIONS.QUICK_TASK_UPDATE, label: 'Update Quick Tasks', description: 'Update existing quick tasks' },
      { key: PERMISSIONS.QUICK_TASK_DELETE, label: 'Delete Quick Tasks', description: 'Delete quick tasks' },
    ],
  },
  {
    module: PERMISSION_MODULES.USERS,
    permissions: [
      { key: PERMISSIONS.USER_VIEW, label: 'View Users', description: 'View user directory' },
      { key: PERMISSIONS.USER_MANAGE, label: 'Manage Users', description: 'Invite, edit, or remove users' },
    ],
  },
  {
    module: PERMISSION_MODULES.REPORTS,
    permissions: [
      { key: PERMISSIONS.REPORT_VIEW, label: 'View Reports', description: 'View workspace reports' },
      { key: PERMISSIONS.REPORT_EXPORT, label: 'Export Reports', description: 'Export reports data' },
    ],
  },
  {
    module: PERMISSION_MODULES.MIS,
    permissions: [
      { key: PERMISSIONS.MIS_VIEW_OWN, label: 'View Own MIS', description: 'View own MIS' },
      { key: PERMISSIONS.MIS_VIEW_TEAM, label: 'View Team MIS', description: 'View team MIS' },
      { key: PERMISSIONS.MIS_VIEW_GLOBAL, label: 'View All MIS (Global)', description: 'View all MIS' },
      { key: PERMISSIONS.MIS_APPROVE, label: 'Approve MIS', description: 'Approve/Reject MIS' },
    ],
  },
  {
    module: PERMISSION_MODULES.PERMISSIONS,
    permissions: [
      { key: PERMISSIONS.PERMISSION_MANAGE, label: 'Manage Permissions', description: 'Manage Roles and Permissions' },
    ],
  },
  {
    module: PERMISSION_MODULES.SETTINGS,
    permissions: [
      { key: PERMISSIONS.SETTINGS_MANAGE, label: 'Manage Settings', description: 'Manage workspace settings' },
    ],
  },
];
