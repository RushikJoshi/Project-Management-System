import * as WorkSessionService from '../services/workSession.service.js';

export async function mySummary(req, res, next) {
  try {
    const data = await WorkSessionService.getMySummary({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      userId: req.auth.sub,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function activity(req, res, next) {
  try {
    const log = await WorkSessionService.logActivity({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      employeeId: req.auth.sub,
      sessionId: req.body.sessionId,
      activityType: req.body.activityType,
      taskId: req.body.taskId,
      description: req.body.description,
    });
    return res.status(201).json({ success: true, data: log });
  } catch (e) {
    return next(e);
  }
}

export async function checkPending(req, res, next) {
  try {
    const data = await WorkSessionService.checkPendingTasks({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      employeeId: req.auth.sub,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function logout(req, res, next) {
  try {
    const data = await WorkSessionService.processLogout({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      employeeId: req.auth.sub,
      sessionId: req.body.sessionId,
      option: req.body.option,
      data: req.body.data,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function pendingReports(req, res, next) {
  try {
    const data = await WorkSessionService.listPendingLogoutReports({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      managerId: req.auth.sub,
      role: req.auth.role,
      date: req.query.date,
      department: req.query.department,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function reviewExtension(req, res, next) {
  try {
    const data = await WorkSessionService.reviewExtension({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      managerId: req.auth.sub,
      role: req.auth.role,
      logId: req.params.id,
      action: req.body.action,
      comment: req.body.comment,
    });
    if (!data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Extension request not found' } });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function productivity(req, res, next) {
  try {
    const data = await WorkSessionService.getTeamProductivity({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      managerId: req.auth.sub,
      role: req.auth.role,
      date: req.query.date,
      department: req.query.department,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}
