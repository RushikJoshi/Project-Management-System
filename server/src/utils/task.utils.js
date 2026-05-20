export const TERMINAL_STATUSES = ['done', 'completed', 'cancelled', 'in_review'];
export const ACTIVE_STATUSES = ['todo', 'scheduled', 'in_progress', 'testing', 'review', 'in_review'];

export function isTaskOverdue(task, currentDate = new Date()) {
  if (!task.dueDate) return false;

  const today = new Date(currentDate);
  today.setUTCHours(0, 0, 0, 0);
  
  const due = new Date(task.dueDate);
  due.setUTCHours(0, 0, 0, 0);

  const status = (task.status || '').toLowerCase();
  
  return (
    due.getTime() < today.getTime() && 
    !TERMINAL_STATUSES.includes(status)
  );
}

export function getOverdueQueryFilter(currentDate = new Date()) {
  const today = new Date(currentDate);
  today.setUTCHours(0, 0, 0, 0);

  return {
    dueDate: { $lt: today, $ne: null },
    status: { $nin: TERMINAL_STATUSES },
  };
}

export function getActiveQueryFilter() {
  return {
    status: { $in: ACTIVE_STATUSES }
  };
}
