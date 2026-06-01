import { getTenantModels } from '../config/tenantDb.js';
import { parseUserAgent, getClientIp, getLocationFromIp } from '../utils/userAgent.js';
import { sha256 } from '../utils/crypto.js';
import mongoose from 'mongoose';

export async function logSuccess({ req, user, tenantId, workspaceId, sessionId, tokenId, loginType = 'Email Password' }) {
  try {
    const { LoginActivityLog } = await getTenantModels(tenantId);

    const userAgentStr = req.headers['user-agent'] || '';
    const ipAddress = getClientIp(req);
    const { browser, operatingSystem, deviceType } = parseUserAgent(userAgentStr);
    const location = getLocationFromIp(ipAddress);

    // Security rule: Mark suspicious if browser is unknown or from suspicious IP demo flags
    let isSuspicious = false;
    if (browser === 'Other' && deviceType === 'Desktop') {
      isSuspicious = true;
    }
    if (ipAddress === '8.8.8.8' || ipAddress === '1.1.1.1') {
      isSuspicious = true;
    }

    await LoginActivityLog.create({
      tenantId,
      userId: user.id || user._id,
      userName: user.name,
      email: user.email,
      role: user.role,
      loginType,
      status: 'Success',
      ipAddress,
      deviceType,
      browser,
      operatingSystem,
      userAgent: userAgentStr.slice(0, 500),
      location,
      sessionId,
      tokenId,
      loginTime: new Date(),
      isSuspicious,
    });
  } catch (err) {
    console.error('[LoginActivityService] Failed to log login success:', err);
  }
}

export async function logFailure({ req, email, companyCode, employeeCode, failureReason, tenantId, loginType = 'Email Password' }) {
  try {
    const resolvedTenantId = tenantId || '65f000000000000000000001'; // Default system tenant fallback
    const { LoginActivityLog } = await getTenantModels(resolvedTenantId);

    const userAgentStr = req.headers['user-agent'] || '';
    const ipAddress = getClientIp(req);
    const { browser, operatingSystem, deviceType } = parseUserAgent(userAgentStr);
    const location = getLocationFromIp(ipAddress);

    const emailStr = email || `${employeeCode}@${companyCode}`;

    // Multiple failed attempt detector: suspicious if > 2 failed attempts in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentFailures = await LoginActivityLog.countDocuments({
      tenantId: resolvedTenantId,
      email: emailStr.toLowerCase(),
      status: 'Failed',
      createdAt: { $gte: fifteenMinutesAgo },
    });

    const isSuspicious = recentFailures >= 2;

    await LoginActivityLog.create({
      tenantId: resolvedTenantId,
      email: emailStr,
      userName: 'Unknown Attempt',
      loginType,
      status: 'Failed',
      ipAddress,
      deviceType,
      browser,
      operatingSystem,
      userAgent: userAgentStr.slice(0, 500),
      location,
      loginTime: new Date(),
      failureReason,
      isSuspicious,
    });
  } catch (err) {
    console.error('[LoginActivityService] Failed to log login failure:', err);
  }
}

export async function logLogout({ refreshToken }) {
  try {
    if (!refreshToken) return;
    const tokenHash = sha256(refreshToken);
    const decoded = jwtDecodeSilently(refreshToken);
    const tenantId = decoded?.companyId || decoded?.tenantId || '65f000000000000000000001';

    const { LoginActivityLog } = await getTenantModels(tenantId);
    
    // Find active success record by sessionId or tokenId
    const log = await LoginActivityLog.findOne({
      tenantId,
      status: 'Success',
      $or: [{ sessionId: tokenHash }, { tokenId: tokenHash }, { sessionId: refreshToken }]
    }).sort({ createdAt: -1 });

    if (log) {
      const now = new Date();
      const duration = Math.round((now.getTime() - log.loginTime.getTime()) / 1000);
      log.logoutTime = now;
      log.sessionDuration = duration;
      log.status = 'Logged Out';
      await log.save();
    }
  } catch (err) {
    console.error('[LoginActivityService] Failed to log logout:', err);
  }
}

export async function logSessionExpiration({ tenantId, tokenId }) {
  try {
    const { LoginActivityLog } = await getTenantModels(tenantId);
    const log = await LoginActivityLog.findOne({
      tenantId,
      status: 'Success',
      $or: [{ sessionId: tokenId }, { tokenId }]
    }).sort({ createdAt: -1 });

    if (log) {
      const now = new Date();
      const duration = Math.round((now.getTime() - log.loginTime.getTime()) / 1000);
      log.logoutTime = now;
      log.sessionDuration = duration;
      log.status = 'Session Expired';
      await log.save();
    }
  } catch (err) {
    console.error('[LoginActivityService] Failed to log session expiration:', err);
  }
}

export async function forceLogoutSession({ tenantId, sessionId }) {
  const { LoginActivityLog, RefreshToken } = await getTenantModels(tenantId);

  const log = await LoginActivityLog.findOne({ tenantId, sessionId });
  if (log) {
    const now = new Date();
    log.status = 'Session Expired';
    log.logoutTime = now;
    log.sessionDuration = Math.round((now.getTime() - log.loginTime.getTime()) / 1000);
    await log.save();

    // Revoke corresponding RefreshToken in the DB to block requests instantly
    await RefreshToken.updateOne(
      { tokenHash: sessionId },
      { $set: { revokedAt: now } }
    );
    return true;
  }
  return false;
}

export async function queryLogs({ tenantId, userId = null, filters = {}, pagination = {} }) {
  const { LoginActivityLog } = await getTenantModels(tenantId);

  const query = { tenantId };

  if (userId) {
    query.userId = new mongoose.Types.ObjectId(userId);
  }

  // Filters
  if (filters.status) query.status = filters.status;
  if (filters.role) query.role = filters.role;
  if (filters.loginType) query.loginType = filters.loginType;
  if (filters.deviceType) query.deviceType = filters.deviceType;
  if (filters.isSuspicious !== undefined) {
    query.isSuspicious = filters.isSuspicious === 'true' || filters.isSuspicious === true;
  }

  // Search input
  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { userName: searchRegex },
      { email: searchRegex },
      { ipAddress: searchRegex },
      { browser: searchRegex },
      { operatingSystem: searchRegex },
      { location: searchRegex },
    ];
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    query.loginTime = {};
    if (filters.startDate) query.loginTime.$gte = new Date(filters.startDate);
    if (filters.endDate) query.loginTime.$lte = new Date(filters.endDate);
  }

  // Pagination & Sorting
  const page = parseInt(pagination.page, 10) || 1;
  const limit = parseInt(pagination.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const total = await LoginActivityLog.countDocuments(query);
  const logs = await LoginActivityLog.find(query)
    .sort({ loginTime: -1 })
    .skip(skip)
    .limit(limit);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAnalytics({ tenantId }) {
  const { LoginActivityLog } = await getTenantModels(tenantId);

  const totalLogins = await LoginActivityLog.countDocuments({ tenantId });
  const failedLogins = await LoginActivityLog.countDocuments({ tenantId, status: 'Failed' });
  const activeSessions = await LoginActivityLog.countDocuments({ tenantId, status: 'Success' });
  const suspiciousActivities = await LoginActivityLog.countDocuments({ tenantId, isSuspicious: true });

  // Most used devices aggregation
  const deviceDistribution = await LoginActivityLog.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
    { $group: { _id: '$deviceType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Login trends (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const trends = await LoginActivityLog.aggregate([
    { 
      $match: { 
        tenantId: new mongoose.Types.ObjectId(tenantId),
        loginTime: { $gte: sevenDaysAgo }
      } 
    },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: '$loginTime' },
          month: { $month: '$loginTime' },
          year: { $year: '$loginTime' },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  return {
    metrics: {
      totalLogins,
      failedLogins,
      activeSessions,
      suspiciousActivities,
    },
    devices: deviceDistribution.map(d => ({ device: d._id || 'Desktop', count: d.count })),
    trends: trends.map(t => ({
      date: `${t._id.year}-${String(t._id.month).padStart(2, '0')}-${String(t._id.day).padStart(2, '0')}`,
      status: t._id.status,
      count: t.count
    }))
  };
}

function jwtDecodeSilently(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch {
    return null;
  }
}
