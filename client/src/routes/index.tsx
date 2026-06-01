import React from 'react';
import NotFound404 from '../pages/errors/NotFound404';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import { useAuthStore } from '../context/authStore';
import type { Role } from '../app/types';

// Auth pages
import LoginPage from '../pages/auth/Login';
import { ForgotPasswordPage, ResetPasswordPage } from '../pages/auth/ForgotPassword';

// App pages
import DashboardPage from '../pages/dashboard/Dashboard';
import ProjectsPage from '../pages/projects/Projects';
import ProjectDetailPage from '../pages/projects/ProjectDetail';
import ProjectTodoPage from '../pages/projects/ProjectTodoPage';
import CalendarPage from '../pages/calendar/Calendar';
import TeamsPage from '../pages/teams/Teams';
import ReportsPage from '../pages/reports/Reports';
// import ReportManagementPage from '../pages/reports/ReportManagement';
import QuickTasksPage from '../pages/quicktasks/QuickTasks';
import QuickTaskDetailPage from '../pages/quicktasks/QuickTaskDetail';
import MyTasksPage from '../pages/tasks/MyTasks';
import TasksManagement from '../pages/tasks/TasksManagement';
import TaskRequestsPage from '../pages/tasks/TaskRequests';
import MISEntry from '../pages/mis/MISEntry';
import MISManager from '../pages/mis/MISManager';
import MISReports from '../pages/mis/MISReports';
import NotificationsPage from '../pages/notifications/Notifications';
import UserSettingsPage from '../pages/settings/Settings';
import PlannerPage from '../pages/planner/Planner';
import RequestPortal from '../pages/requests/RequestPortal';
import { TeamPerformance } from '../pages/teams/TeamPerformance';
import ClientTeamsPage from '../pages/teams/ClientTeams';
import MonitoringDashboard from '../pages/monitoring/MonitoringDashboard';
import { LoginActivity } from '../pages/login-activity/LoginActivity';


// Admin pages
import {
  AdminWorkspacesPage,
  AdminUsersPage,
  AdminPermissionsPage,
  AdminBillingPage,
} from '../pages/admin/Admin';
import AdminUserProfilePage from '../pages/admin/AdminUserProfile';
import ClientsPage from '../pages/admin/Clients';
import ClientInvitePage from '../pages/auth/ClientInvite';

// Super Admin pages
import {
  Companies as SACompanies,
  Users as SAUsers,
  RolesPermissions as SARoles,
  Notifications as SABroadcast,
  Settings as SASettings,
  Support as SASupport,
} from '../pages/super-admin';

// Guard component
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RequireGuest: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const RequireRole: React.FC<{ roles: Role[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role as Role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const RequireInternal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (user?.userType === 'client') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const SettingsRoute: React.FC = () => {
  const { user } = useAuthStore();
  if (user?.role === 'super_admin' || user?.role === 'admin') {
    return <SASettings />;
  }
  return <UserSettingsPage />;
};

const TeamsRoute: React.FC = () => {
  const { user } = useAuthStore();
  if (user?.userType === 'client') {
    return <ClientTeamsPage />;
  }
  return <TeamsPage />;
};

export const router = createBrowserRouter([
  // Auth routes
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: 'login',
        element: <RequireGuest><LoginPage /></RequireGuest>,
      },
      {
        path: 'register',
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'loginWithId',
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: 'client-invite/:tenantId/:token',
        element: <ClientInvitePage />,
      },
    ],
  },
  // App routes
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },

      // Standard App (Maintained as requested)
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'projects/:projectId/todo', element: <ProjectTodoPage /> },
      { path: 'projects/:id/requests', element: <TaskRequestsPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'teams', element: <TeamsRoute /> },
      { path: 'teams/performance', element: <RequireRole roles={['super_admin', 'admin', 'manager', 'team_leader']}><TeamPerformance /></RequireRole> },
      { path: 'reports', element: <ReportsPage /> },
      // { path: 'reports-management', element: <ReportManagementPage /> },
      { path: 'mis-entry', element: <MISEntry /> },
      { path: 'mis-manager', element: <RequireRole roles={['super_admin', 'admin', 'manager', 'team_leader']}><MISManager /></RequireRole> },
      { path: 'mis-reports', element: <MISReports /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'quick-tasks', element: <QuickTasksPage /> },
      { path: 'quick-tasks/:id', element: <QuickTaskDetailPage /> },
      { path: 'my-tasks', element: <MyTasksPage /> },
      { path: 'tasks', element: <TasksManagement /> },
      { path: 'task-requests', element: <RequireInternal><TaskRequestsPage /></RequireInternal> },
      { path: 'requests', element: <RequestPortal /> },
      { path: 'login-activity', element: <LoginActivity /> },
      { path: 'monitoring/pending', element: <RequireRole roles={['super_admin', 'admin', 'manager', 'team_leader']}><MonitoringDashboard tab="pending" /></RequireRole> },
      { path: 'monitoring/extensions', element: <RequireRole roles={['super_admin', 'admin', 'manager', 'team_leader']}><MonitoringDashboard tab="extensions" /></RequireRole> },
      { path: 'monitoring/completion-remarks', element: <RequireRole roles={['super_admin', 'admin', 'manager', 'team_leader']}><MonitoringDashboard tab="completion" /></RequireRole> },
      { path: 'monitoring/daily-logs', element: <RequireRole roles={['super_admin', 'admin', 'manager', 'team_leader']}><MonitoringDashboard tab="logs" /></RequireRole> },
      { path: 'monitoring/productivity', element: <RequireRole roles={['super_admin', 'admin', 'manager', 'team_leader']}><MonitoringDashboard tab="productivity" /></RequireRole> },

      // Super Admin Modules (Separate routes)
      { path: 'companies', element: <SACompanies /> },
      { path: 'companies/:id', element: <SACompanies /> },
      { path: 'users', element: <SAUsers /> },
      { path: 'roles-permissions', element: <SARoles /> },
      { path: 'settings', element: <SettingsRoute /> },
      { path: 'support', element: <SASupport /> },
      { path: 'broadcast-notifications', element: <SABroadcast /> },
      { path: 'profile', element: <UserSettingsPage /> },

      // Admin
      { path: 'admin/workspaces', element: <AdminWorkspacesPage /> },
      { path: 'admin/users', element: <AdminUsersPage /> },
      { path: 'admin/users/:id', element: <AdminUserProfilePage /> },
      { path: 'admin/permissions', element: <AdminPermissionsPage /> },
      { path: 'admin/billing', element: <AdminBillingPage /> },
      { path: 'admin/clients', element: <RequireRole roles={['super_admin', 'admin', 'manager']}><ClientsPage /></RequireRole> },
      { path: 'planner', element: <PlannerPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFound404 />,
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});

export default router;
