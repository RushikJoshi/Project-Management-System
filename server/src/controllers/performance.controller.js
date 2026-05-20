import * as PerformanceService from '../services/performance.service.js';

export async function getMyMetrics(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId } = req.auth;
    const { days } = req.query;
    const metrics = await PerformanceService.getUserPerformanceMetrics({
      companyId,
      workspaceId,
      userId,
      days: days ? parseInt(days) : 30
    });
    return res.status(200).json({ success: true, data: metrics });
  } catch (e) {
    return next(e);
  }
}

export async function getUserMetrics(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { userId } = req.params;
    const { days } = req.query;
    const metrics = await PerformanceService.getUserPerformanceMetrics({
      companyId,
      workspaceId,
      userId,
      days: days ? parseInt(days) : 30
    });
    return res.status(200).json({ success: true, data: metrics });
  } catch (e) {
    return next(e);
  }
}

export async function getTeamMetrics(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { teamId } = req.params;
    const { days } = req.query;
    const metrics = await PerformanceService.getTeamPerformanceMetrics({
      companyId,
      workspaceId,
      teamId,
      days: days ? parseInt(days) : 30
    });
    return res.status(200).json({ success: true, data: metrics });
  } catch (e) {
    return next(e);
  }
}

export async function getWorkspaceMetrics(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const { days } = req.query;
    const metrics = await PerformanceService.getWorkspacePerformanceMetrics({
      companyId,
      workspaceId,
      days: days ? parseInt(days) : 30
    });
    return res.status(200).json({ success: true, data: metrics });
  } catch (e) {
    return next(e);
  }
}

export async function getDiscovery(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const data = await PerformanceService.getDiscoveryData({ companyId, workspaceId });
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return next(e);
  }
}


