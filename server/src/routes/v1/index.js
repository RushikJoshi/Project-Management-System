import express from 'express';

import authRoutes from './modules/auth.routes.js';
import projectsRoutes from './modules/projects.routes.js';
import tasksRoutes from './modules/tasks.routes.js';
import teamsRoutes from './modules/teams.routes.js';
import quickTasksRoutes from './modules/quickTasks.routes.js';
import notificationsRoutes from './modules/notifications.routes.js';
import activityRoutes from './modules/activity.routes.js';
import usersRoutes from './modules/users.routes.js';
import workspacesRoutes from './modules/workspaces.routes.js';
import companiesRoutes from './modules/companies.routes.js';
import settingsRoutes from './modules/settings.routes.js';
import misRoutes from './modules/mis.routes.js';
import reportsRoutes from './modules/reports.routes.js';
import timelineRoutes from './modules/timeline.routes.js';
import hrmsIntegrationRoutes from './modules/hrmsIntegration.routes.js';
import labelsRoutes from './modules/labels.routes.js';
import personalTasksRoutes from './modules/personalTasks.routes.js';
import extensionRequestRoutes from './modules/extensionRequest.routes.js';
import rbacRoutes from './modules/rbac.routes.js';
import clientsRoutes from './modules/clients.routes.js';
import ticketsRoutes from './modules/tickets.routes.js';
import timeTrackingRoutes from './modules/timeTracking.routes.js';
import performanceRoutes from './modules/performance.routes.js';
import clientDashboardRoutes from './modules/clientDashboard.routes.js';
import clientTeamsRoutes from './modules/clientTeams.routes.js';
import workSessionsRoutes from './modules/workSessions.routes.js';
import monitoringRoutes from './modules/monitoring.routes.js';
import loginActivityRoutes from './modules/loginActivity.routes.js';

import { requireAuth } from '../../middleware/auth.middleware.js';
import * as TimelineController from '../../controllers/timeline.controller.js';


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/workspaces', workspacesRoutes);
router.use('/companies', companiesRoutes);
router.use('/projects', projectsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/labels', labelsRoutes);
router.use('/teams', teamsRoutes);
router.use('/quick-tasks', quickTasksRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/activity', activityRoutes);
router.use('/settings', settingsRoutes);
router.use('/mis', misRoutes);
router.use('/reports', reportsRoutes);
router.use('/timeline', timelineRoutes);
router.use('/integrations/hrms', hrmsIntegrationRoutes);
router.use('/personal-tasks', personalTasksRoutes);
router.use('/extension-requests', extensionRequestRoutes);
router.use('/rbac', rbacRoutes);
router.use('/clients', clientsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/time-tracking', timeTrackingRoutes);
router.use('/performance', performanceRoutes);
router.use('/client-dashboard', clientDashboardRoutes);
router.use('/client-teams', clientTeamsRoutes);
router.use('/work-sessions', workSessionsRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/login-activity', loginActivityRoutes);
router.patch('/task/:id', requireAuth, TimelineController.patchTaskTimeline);
router.post('/dependency', requireAuth, TimelineController.createDependency);


export default router;
