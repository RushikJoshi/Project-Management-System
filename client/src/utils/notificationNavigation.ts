import type { NavigateFunction } from 'react-router-dom';
import type { Notification, QuickTask, Task } from '../app/types';

type NotificationNavigationContext = {
  tasks: Task[];
  quickTasks: QuickTask[];
};

const PROJECT_TASK_NOTIFICATION_TYPES = new Set([
  'task_assigned',
  'comment_added',
  'deadline_approaching',
  'mention',
  'project_update',
  'task_created',
  'task_updated',
  'task_status_changed',
  'task_assignees_changed',
  'task_deleted',
  'task_reassign_requested',
  'task_reassigned',
]);

const QUICK_TASK_NOTIFICATION_TYPES = new Set([
  'quick_task_created',
  'quick_task_updated',
  'quick_task_status_changed',
  'quick_task_priority_changed',
  'quick_task_due_date_changed',
  'quick_task_completion_remark_updated',
  'quick_task_assignees_changed',
  'quick_task_deleted',
  'quick_task_comment_added',
  'quick_task_attachments_added',
  'quick_task_deadline_approaching',
  'quick_task_review_approved',
  'quick_task_review_changes_requested',
]);

function buildTaskTarget(task: Task, tab?: 'details' | 'activity') {
  if (!task.projectId) {
    const params = new URLSearchParams({ taskId: task.id });
    if (tab) params.set('tab', tab);
    return `/tasks?${params.toString()}`;
  }

  const params = new URLSearchParams({ taskId: task.id });
  if (tab) params.set('tab', tab);
  return `/projects/${task.projectId}?${params.toString()}`;
}

function buildFallbackTaskTarget(taskId: string, tab?: 'details' | 'activity') {
  const params = new URLSearchParams({ taskId });
  if (tab) params.set('tab', tab);
  return `/tasks?${params.toString()}`;
}

function buildQuickTaskTarget(taskId: string, section?: string) {
  const params = new URLSearchParams();
  if (section) params.set('section', section);
  const query = params.toString();
  return query ? `/quick-tasks/${taskId}?${query}` : `/quick-tasks/${taskId}`;
}

function isQuickTaskNotification(notification: Notification) {
  return notification.type.startsWith('quick_task_') || QUICK_TASK_NOTIFICATION_TYPES.has(notification.type);
}

function isProjectTaskNotification(notification: Notification) {
  return notification.type.startsWith('task_') || PROJECT_TASK_NOTIFICATION_TYPES.has(notification.type);
}

export function getNotificationTarget(
  notification: Notification,
  context: NotificationNavigationContext
) {
  const { relatedId } = notification;
  if (!relatedId) return '/notifications';

  const quickTask = context.quickTasks.find((item) => item.id === relatedId);
  const projectTask = context.tasks.find((item) => item.id === relatedId);
  const wantsActivity = notification.type === 'comment_added' || notification.type === 'mention';

  if (quickTask) {
    return buildQuickTaskTarget(quickTask.id, wantsActivity ? 'comments' : undefined);
  }

  if (projectTask) {
    return buildTaskTarget(projectTask, wantsActivity ? 'activity' : undefined);
  }

  if (notification.type === 'quick_task_deadline_approaching') {
    return buildQuickTaskTarget(relatedId);
  }

  if (notification.type.startsWith('quick_task_')) {
    return buildQuickTaskTarget(relatedId, wantsActivity ? 'comments' : undefined);
  }

  if (isQuickTaskNotification(notification)) {
    return buildQuickTaskTarget(relatedId, wantsActivity ? 'comments' : undefined);
  }

  if (isProjectTaskNotification(notification)) {
    return buildFallbackTaskTarget(relatedId, wantsActivity ? 'activity' : undefined);
  }

  return buildFallbackTaskTarget(relatedId, wantsActivity ? 'activity' : undefined);
}

export function openNotificationTarget(
  notification: Notification,
  context: NotificationNavigationContext,
  navigate: NavigateFunction
) {
  const target = getNotificationTarget(notification, context);
  navigate(target);
}
