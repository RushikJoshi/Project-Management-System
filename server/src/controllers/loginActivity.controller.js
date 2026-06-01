import * as LoginActivityService from '../services/loginActivity.service.js';
import { getTenantModels } from '../config/tenantDb.js';

export async function getActivityLogs(req, res, next) {
  try {
    const { companyId: tenantId, sub: authUserId, role } = req.auth;
    const { status, role: filterRole, loginType, deviceType, isSuspicious, search, startDate, endDate, page, limit } = req.query;

    const isAdminOrManager = ['super_admin', 'admin', 'manager'].includes(role);
    
    // Non-admin/manager can only view their own logs
    const queryUserId = isAdminOrManager ? req.query.userId : authUserId;

    const result = await LoginActivityService.queryLogs({
      tenantId,
      userId: queryUserId,
      filters: { status, role: filterRole, loginType, deviceType, isSuspicious, search, startDate, endDate },
      pagination: { page, limit }
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getActivityLogById(req, res, next) {
  try {
    const { companyId: tenantId, sub: authUserId, role } = req.auth;
    const { id } = req.params;

    const { LoginActivityLog } = await getTenantModels(tenantId);
    const log = await LoginActivityLog.findOne({ _id: id, tenantId });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Activity log not found' },
      });
    }

    const isAdminOrManager = ['super_admin', 'admin', 'manager'].includes(role);
    if (!isAdminOrManager && log.userId?.toString() !== authUserId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    return res.status(200).json({
      success: true,
      data: log,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getUserActivityLogs(req, res, next) {
  try {
    const { companyId: tenantId, sub: authUserId, role } = req.auth;
    const { userId } = req.params;
    const { page, limit } = req.query;

    const isAdminOrManager = ['super_admin', 'admin', 'manager'].includes(role);
    if (!isAdminOrManager && userId !== authUserId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to other user activity logs' },
      });
    }

    const result = await LoginActivityService.queryLogs({
      tenantId,
      userId,
      pagination: { page, limit }
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMyActivityLogs(req, res, next) {
  try {
    const { companyId: tenantId, sub: authUserId } = req.auth;
    const { page, limit } = req.query;

    const result = await LoginActivityService.queryLogs({
      tenantId,
      userId: authUserId,
      pagination: { page, limit }
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getLoginActivityAnalytics(req, res, next) {
  try {
    const { companyId: tenantId } = req.auth;

    const result = await LoginActivityService.getAnalytics({ tenantId });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function forceLogout(req, res, next) {
  try {
    const { companyId: tenantId, sub: authUserId, role } = req.auth;
    const { sessionId } = req.params;

    const { LoginActivityLog } = await getTenantModels(tenantId);
    const log = await LoginActivityLog.findOne({ tenantId, sessionId });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Active session not found' },
      });
    }

    const isAdmin = ['super_admin', 'admin'].includes(role);
    if (!isAdmin && log.userId?.toString() !== authUserId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to revoke this session' },
      });
    }

    await LoginActivityService.forceLogoutSession({ tenantId, sessionId });

    return res.status(200).json({
      success: true,
      data: { revoked: true },
    });
  } catch (err) {
    return next(err);
  }
}
