import * as MonitoringService from '../services/monitoring.service.js';

export async function getPendingTasks(req, res, next) {
  try {
    const data = await MonitoringService.getPendingTasks({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      managerId: req.auth.sub,
      role: req.auth.role,
      employeeId: req.query.employeeId,
      projectId: req.query.projectId,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function getExtensions(req, res, next) {
  try {
    const data = await MonitoringService.getExtensions({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      managerId: req.auth.sub,
      role: req.auth.role,
      employeeId: req.query.employeeId,
      status: req.query.status,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function getCompletionRemarks(req, res, next) {
  try {
    const data = await MonitoringService.getCompletionRemarks({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      managerId: req.auth.sub,
      role: req.auth.role,
      employeeId: req.query.employeeId,
      projectId: req.query.projectId,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function getDailyLogs(req, res, next) {
  try {
    const data = await MonitoringService.getDailyLogs({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      managerId: req.auth.sub,
      role: req.auth.role,
      employeeId: req.query.employeeId,
      date: req.query.date,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function getProductivity(req, res, next) {
  try {
    const data = await MonitoringService.getProductivity({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      managerId: req.auth.sub,
      role: req.auth.role,
      department: req.query.department,
      date: req.query.date,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}

export async function getTimeline(req, res, next) {
  try {
    const data = await MonitoringService.getTimeline({
      companyId: req.auth.companyId,
      workspaceId: req.auth.workspaceId,
      employeeId: req.params.employeeId,
      date: req.query.date,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}
