import * as TimeTrackingService from '../services/timeTracking.service.js';

export async function startTimer(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId } = req.auth;
    const { taskId } = req.body;
    
    const timeLog = await TimeTrackingService.startTimer({ companyId, workspaceId, userId, taskId });
    return res.status(201).json({ success: true, data: timeLog });
  } catch (e) {
    return next(e);
  }
}

export async function stopTimer(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId } = req.auth;
    const { taskId } = req.body;

    const timeLog = await TimeTrackingService.stopTimer({ companyId, workspaceId, userId, taskId });
    return res.status(200).json({ success: true, data: timeLog });
  } catch (e) {
    return next(e);
  }
}

export async function addManualTime(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId } = req.auth;
    const { taskId, durationMinutes, notes } = req.body;

    const timeLog = await TimeTrackingService.addManualTime({ companyId, workspaceId, userId, taskId, durationMinutes, notes });
    return res.status(201).json({ success: true, data: timeLog });
  } catch (e) {
    return next(e);
  }
}

export async function getActiveTimer(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId } = req.auth;
    const timer = await TimeTrackingService.getActiveTimer({ companyId, workspaceId, userId });
    return res.status(200).json({ success: true, data: timer });
  } catch (e) {
    return next(e);
  }
}

export async function getTaskTimeLogs(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { taskId } = req.params;
    const logs = await TimeTrackingService.getTaskTimeLogs({ companyId, workspaceId, taskId });
    return res.status(200).json({ success: true, data: logs });
  } catch (e) {
    return next(e);
  }
}
