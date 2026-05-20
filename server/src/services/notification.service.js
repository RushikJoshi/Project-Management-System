import { getTenantModels } from '../config/tenantDb.js';
import NotificationBroadcast from '../models/NotificationBroadcast.js';
import AuthLookup from '../models/AuthLookup.js';
import Company from '../models/Company.js';

export async function listNotifications({ companyId, workspaceId, userId, page = 1, limit = 50 }) {
  const tenantId = companyId;
  const { Notification } = await getTenantModels(companyId);
  const filter = { tenantId, workspaceId, userId };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function markRead({ companyId, workspaceId, userId, id }) {
  const tenantId = companyId;
  const { Notification } = await getTenantModels(companyId);
  const n = await Notification.findOneAndUpdate(
    { _id: id, tenantId, workspaceId, userId },
    { $set: { isRead: true } },
    { new: true }
  );
  return n;
}

export async function markAllRead({ companyId, workspaceId, userId }) {
  const tenantId = companyId;
  const { Notification } = await getTenantModels(companyId);
  await Notification.updateMany({ tenantId, workspaceId, userId, isRead: false }, { $set: { isRead: true } });
}

export async function listBroadcastHistory({ page = 1, limit = 50 }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    NotificationBroadcast.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    NotificationBroadcast.countDocuments(),
  ]);
  return { items, total, page, limit };
}

export async function createBroadcast({ actorRole, actorUserId, input }) {
  if (!['super_admin', 'admin'].includes(actorRole)) {
    const err = new Error('You do not have permission to broadcast notifications');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  let recipientGroups = [];
  let audienceLabel = 'All Users';

  if (input.targetType === 'all') {
    const companies = await Company.find().select('_id');
    recipientGroups = await Promise.all(
      companies.map(async (company) => {
        const { User, Membership } = await getTenantModels(company._id);
        const memberships = await Membership.find({ status: 'active' }).sort({ createdAt: 1 });
        const userIds = memberships.map((membership) => membership.userId);
        const users = await User.find({ _id: { $in: userIds }, isActive: true }).select('_id');
        return {
          companyId: company._id,
          memberships,
          activeUserIds: new Set(users.map((user) => String(user._id))),
        };
      })
    );
  } else if (input.targetType === 'company') {
    const { User, Membership } = await getTenantModels(input.companyId);
    const memberships = await Membership.find({ status: 'active', tenantId: input.companyId }).sort({ createdAt: 1 });
    const userIds = memberships.map((membership) => membership.userId);
    const users = await User.find({ _id: { $in: userIds }, isActive: true }).select('_id');
    recipientGroups = [{
      companyId: input.companyId,
      memberships,
      activeUserIds: new Set(users.map((user) => String(user._id))),
    }];
    audienceLabel = input.companyName || 'Selected Company';
  } else {
    const email = input.userEmail.trim().toLowerCase();
    const lookup = await AuthLookup.findOne({ email });
    if (!lookup) {
      const err = new Error('Target user was not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    const { User, Membership } = await getTenantModels(lookup.tenantId);
    const user = await User.findOne({ email, tenantId: lookup.tenantId, isActive: true });
    if (!user) {
      const err = new Error('Target user was not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    const memberships = await Membership.find({ status: 'active', userId: user._id, tenantId: lookup.tenantId }).sort({ createdAt: 1 });
    recipientGroups = [{
      companyId: lookup.tenantId,
      memberships,
      activeUserIds: new Set([String(user._id)]),
    }];
    audienceLabel = user.email;
  }

  const notificationsByCompany = new Map();

  for (const group of recipientGroups) {
    const uniqueMemberships = [];
    const seenUsers = new Set();
    for (const membership of group.memberships) {
      const userKey = String(membership.userId);
      if (seenUsers.has(userKey)) continue;
      if (!group.activeUserIds.has(userKey)) continue;
      seenUsers.add(userKey);
      uniqueMemberships.push(membership);
    }
    notificationsByCompany.set(String(group.companyId), uniqueMemberships);
  }

  const recipients = Array.from(notificationsByCompany.values()).flat();

  const broadcast = await NotificationBroadcast.create({
    createdBy: actorUserId,
    targetType: input.targetType,
    targetLabel: audienceLabel,
    messageType: input.messageType,
    title: input.title.trim(),
    message: input.message.trim(),
    reachCount: recipients.length,
  });

  if (recipients.length) {
    await Promise.all(
      Array.from(notificationsByCompany.entries()).map(async ([companyId, memberships]) => {
        if (!memberships.length) return;
        const { Notification } = await getTenantModels(companyId);
        await Notification.insertMany(
          memberships.map((membership) => ({
            tenantId: membership.tenantId,
            workspaceId: membership.workspaceId,
            userId: membership.userId,
            type: 'broadcast',
            title: input.title.trim(),
            message: input.message.trim(),
            isRead: false,
            relatedId: null,
            audienceType: input.targetType,
            audienceLabel,
            broadcastId: broadcast._id,
          }))
        );
      })
    );
  }

  return broadcast;
}

